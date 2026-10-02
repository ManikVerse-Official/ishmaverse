// Geo + device helpers for the audience tracker.

export interface GeoInfo {
  country: string | null;
  region: string | null;
  city: string | null;
}

const PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1$|fc|fd)/i;

/**
 * Resolves the visitor's country/region/city.
 *
 * Prefers the CDN headers (Cloudflare / Vercel set these on the edge) so most
 * requests resolve with zero extra cost. Only when no country header is present
 * do we fall back to a short, best-effort IP lookup.
 */
export const resolveGeo = async (req: Request, ip: string): Promise<GeoInfo> => {
  const headerCountry =
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("x-country");
  const headerRegion =
    req.headers.get("cf-region") ??
    req.headers.get("x-vercel-ip-country-region");
  const headerCity =
    req.headers.get("cf-ipcity") ??
    req.headers.get("x-vercel-ip-city");

  // 'XX' is Cloudflare's "unknown" sentinel.
  const country = headerCountry && headerCountry !== "XX" ? headerCountry : null;
  if (country) {
    return {
      country,
      region: headerRegion || null,
      city: headerCity ? decodeURIComponent(headerCity) : null,
    };
  }

  if (!ip || PRIVATE_IP.test(ip)) {
    return { country: null, region: null, city: null };
  }

  // Best-effort fallback. Never blocks the visit for long (1.5s timeout).
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal,
      headers: { "User-Agent": "ishmaverse-visits/1.0" },
    });
    clearTimeout(timer);
    if (!response.ok) return { country: null, region: null, city: null };
    const data = await response.json();
    return {
      country: data?.country_name ?? data?.country ?? null,
      region: data?.region ?? null,
      city: data?.city ?? null,
    };
  } catch {
    return { country: null, region: null, city: null };
  }
};

export type DeviceKind = "mobile" | "tablet" | "desktop";

export const parseDevice = (userAgent: string): DeviceKind => {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return "mobile";
  return "desktop";
};

export const parseBrowser = (userAgent: string): string => {
  const ua = userAgent;
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
};

/** Salted SHA-256 of an IP — a stable, non-reversible unique-visitor key. */
export const hashVisitor = async (ip: string): Promise<string> => {
  const salt = Deno.env.get("VISIT_HASH_SALT") ?? "ishmaverse-visits";
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
