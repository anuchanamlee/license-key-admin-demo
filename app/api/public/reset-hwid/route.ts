import { NextRequest, NextResponse } from "next/server"
import { isDemoMode, licenseApiUrl } from "@/lib/demo"
import { getMockStore } from "@/app/lib/mock-store"

const SYSTEM_TYPES = new Set(["SORTER", "CAPTCHA"])

/**
 * Customer-facing reset. No login and no admin secret: the licence API only
 * clears the binding for a key the caller already knows, and enforces one
 * reset per Bangkok day plus a 30-day quota in the database.
 *
 * The customer's IP is forwarded so the API's per-IP throttle and its audit
 * row see the person, not this deployment.
 */
export async function POST(req: NextRequest) {
  if (isDemoMode()) {
    const r = getMockStore().publicResetHwid(await req.json().catch(() => ({})))
    return NextResponse.json(r.body, { status: r.status })
  }
  const API_URL = licenseApiUrl() as string
  const body = (await req.json()) as { key?: unknown; system_type?: unknown }
  const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : ""
  const systemType = typeof body.system_type === "string" ? body.system_type : ""

  if (!/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(key)) {
    return NextResponse.json(
      { message: "รูปแบบ Key ไม่ถูกต้อง (ตัวอย่าง ABCD-1234-EF56-7890)" },
      { status: 400 },
    )
  }

  if (!SYSTEM_TYPES.has(systemType)) {
    return NextResponse.json({ message: "เลือกระบบที่ใช้งานก่อน" }, { status: 400 })
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()

  const res = await fetch(`${API_URL}/license/reset-hwid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
    },
    body: JSON.stringify({ key, system_type: systemType }),
  })

  const data: unknown = await res.json()
  return NextResponse.json(data, { status: res.status })
}
