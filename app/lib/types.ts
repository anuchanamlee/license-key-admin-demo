export type SystemType = "SORTER" | "CAPTCHA"

export interface LicenseKey {
  key: string
  note: string
  days: number
  created_at: string
  expires_at: string | null
  hwid: string | null
  revoked: boolean
  system_type: SystemType
}

export interface CreateResult {
  key: string
  expires_at: string
  note: string
  system_type: SystemType
}

export interface ExtendResult {
  key: string
  expires_at: string | null
  days_left: number | null
  days_added: number
  outcome: "not_started" | "extended" | "restarted"
}

export interface ResetResult {
  reset: boolean
  message: string
  resets_left_today: number
  next_reset_available_at: string
  resets_last_30d: number
}

/** Shared fetch for both audiences. Neither side ever holds a secret: the
 *  admin routes attach it server-side, the customer route has none to attach. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> ?? {}),
    },
    cache: "no-store",
  })

  if (res.status === 401) throw new Error("หมดเวลาเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่")
  if (res.status === 403) throw new Error("ไม่มีสิทธิ์เข้าถึง (403)")

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const d = await res.json() as { message?: string }; msg = d.message ?? msg } catch {}
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}
