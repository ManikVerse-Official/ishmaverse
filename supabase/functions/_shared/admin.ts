/**
 * Admin recognition for the free-use limits.
 *
 * An owner/staff account gets unlimited use. Two independent signals are
 * accepted, both of them server-side and neither of them trusted from the
 * request body:
 *   • the email address  — `ADMIN_EMAILS` (comma separated). Defaults to
 *     admin@ishmaverse.com so the tool works out of the box;
 *   • the client IP      — `ADMIN_IPS` (comma separated). Useful when the owner
 *     signs in from a fixed office/home connection, or uses an email that is
 *     not the main admin one.
 *
 * Set them with:
 *   supabase secrets set ADMIN_EMAILS="you@school.com,admin@ishmaverse.com" \
 *                        ADMIN_IPS="203.0.113.7" \
 *                        ADMIN_NOTIFY_EMAIL="you@school.com"
 */

const parseList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const ADMIN_EMAILS: string[] = (() => {
  const configured = parseList(Deno.env.get("ADMIN_EMAILS")).map((e) => e.toLowerCase());
  return configured.length > 0 ? configured : ["admin@ishmaverse.com"];
})();

const ADMIN_IPS: string[] = parseList(Deno.env.get("ADMIN_IPS"));

/** Where copies of customer receipts and any subscription warnings are sent. */
export const adminNotifyEmails = (): string[] => {
  const notify = parseList(Deno.env.get("ADMIN_NOTIFY_EMAIL")).map((e) => e.toLowerCase());
  return notify.length > 0 ? notify : ADMIN_EMAILS;
};

export const adminEmails = (): string[] => [...ADMIN_EMAILS];

export const isAdminEmail = (email: string): boolean =>
  Boolean(email) && ADMIN_EMAILS.includes(email.trim().toLowerCase());

export const isAdminIp = (ip: string): boolean => Boolean(ip) && ADMIN_IPS.includes(ip.trim());

/** True when this request belongs to the owner/staff and bypasses free limits. */
export const isAdminRequest = (email: string, ip: string): boolean =>
  isAdminEmail(email) || isAdminIp(ip);
