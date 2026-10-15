/**
 * Signed session cookie for the admin dashboard.
 *
 * The cookie carries only an expiry and its signature - there is nothing in it
 * worth stealing, and it cannot be extended without the server secret. Web
 * Crypto is used rather than node:crypto so the same code runs in proxy.ts.
 */

import { DEMO_SESSION_SECRET, isDemoMode } from "./demo"

export const SESSION_COOKIE = "admin_session"
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60

const encoder = new TextEncoder()

function secretKeyMaterial(): string | null {
  const secret = process.env.SESSION_SECRET
  if (secret && secret.length >= 16) return secret
  // Demo mode only (LICENSE_API_URL unset): documented fallback so the app runs
  // with no .env. Real mode stays fail-closed.
  return isDemoMode() ? DEMO_SESSION_SECRET : null
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

/** Constant-time compare so a wrong signature cannot be walked byte by byte. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createSessionValue(now: number = Date.now()): Promise<string | null> {
  const secret = secretKeyMaterial()
  if (!secret) return null
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000
  const payload = String(expiresAt)
  return `${payload}.${await sign(payload, secret)}`
}

export async function isValidSession(
  value: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  const secret = secretKeyMaterial()
  if (!secret || !value) return false

  const separator = value.lastIndexOf(".")
  if (separator <= 0) return false

  const payload = value.slice(0, separator)
  const signature = value.slice(separator + 1)

  const expiresAt = Number(payload)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false

  return safeEqual(signature, await sign(payload, secret))
}
