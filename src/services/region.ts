export type Region = 'IN' | 'US';

/**
 * Single source of truth for the buyer's region.
 *
 * Previously the builder guessed the currency from the device timezone while
 * checkout guessed the gateway from an IP lookup. When those disagreed, the
 * client paid through one currency and then told the server the other, so
 * verification rejected a payment that had already been captured.
 *
 * Both callers now read this cached value: a timezone guess is available
 * synchronously for first paint, and the IP lookup refines it once (with a
 * timeout so a blocked/failed request never stalls checkout).
 */

let cached: Region | null = null;
let pending: Promise<Region> | null = null;

const timezoneRegion = (): Region => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    return zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta' ? 'IN' : 'US';
  } catch {
    return 'US';
  }
};

/** Synchronous best guess — safe to use for initial render. */
export const getCachedRegion = (): Region => cached ?? timezoneRegion();

/** Resolves the region once and caches it for the rest of the session. */
export const detectRegion = (): Promise<Region> => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;

  // Free, key-less IP geolocation services. They are tried in order and each
  // call is time-boxed, so a slow or blocked provider never stalls the UI.
  const lookups: { url: string; pick: (data: any) => string | undefined }[] = [
    { url: 'https://ipapi.co/json/', pick: (data) => data?.country_code },
    { url: 'https://ipwho.is/', pick: (data) => data?.country_code },
    { url: 'https://ipinfo.io/json', pick: (data) => data?.country },
  ];

  pending = (async () => {
    let region = timezoneRegion();

    for (const lookup of lookups) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const response = await fetch(lookup.url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) continue;
        const code = lookup.pick(await response.json());
        if (code) {
          region = String(code).toUpperCase() === 'IN' ? 'IN' : 'US';
          break;
        }
      } catch {
        /* try the next provider */
      }
    }

    cached = region;
    return region;
  })();

  return pending;
};

export const currencyForRegion = (region: Region): 'INR' | 'USD' =>
  region === 'IN' ? 'INR' : 'USD';
