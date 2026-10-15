import { NextRequest, NextResponse } from "next/server"
import { isDemoMode, licenseApiUrl } from "@/lib/demo"
import { getMockStore } from "@/app/lib/mock-store"

const ADMIN_SECRET = process.env.ADMIN_SECRET

/** Admin override - skips the customer's daily limit and 30-day quota. */
export async function PATCH(req: NextRequest) {
  if (isDemoMode()) {
    const r = getMockStore().adminResetHwid(await req.json().catch(() => ({})))
    return NextResponse.json(r.body, { status: r.status })
  }
  const API_URL = licenseApiUrl() as string
  if (!ADMIN_SECRET) {
    return NextResponse.json({ message: "Server misconfigured: ADMIN_SECRET not set" }, { status: 500 })
  }

  const body = (await req.json()) as { key?: unknown; reason?: unknown }
  const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : ""
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""

  if (!key) {
    return NextResponse.json({ message: "ต้องระบุ key" }, { status: 400 })
  }

  const res = await fetch(`${API_URL}/license/admin/reset-hwid`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify(reason ? { key, reason } : { key }),
  })

  const data: unknown = await res.json()
  return NextResponse.json(data, { status: res.status })
}
