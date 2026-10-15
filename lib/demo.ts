/**
 * Demo vs real mode.
 *
 * DEMO (default): LICENSE_API_URL is unset. The admin routes talk to an
 * in-memory mock store and the login falls back to documented demo values so
 * `npm run dev` works with no .env file.
 *
 * REAL: LICENSE_API_URL is set. The routes proxy to that backend with
 * ADMIN_SECRET, and the login fails closed unless ADMIN_PASSWORD and
 * SESSION_SECRET are set - no demo fallback is ever used.
 *
 * No path-alias or Node-only imports here: proxy.ts (edge runtime) uses it.
 */

/** Public on purpose: shown on the login page and in the README. */
export const DEMO_PASSWORD = "demo1234"
export const DEMO_SESSION_SECRET = "demo-session-secret-not-for-production"

export function licenseApiUrl(): string | null {
  const url = process.env.LICENSE_API_URL?.trim()
  return url ? url.replace(/\/+$/, "") : null
}

export function isDemoMode(): boolean {
  return licenseApiUrl() === null
}
