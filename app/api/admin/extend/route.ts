import { NextRequest, NextResponse } from "next/server"
import { isDemoMode, licenseApiUrl } from "@/lib/demo"
import { getMockStore } from "@/app/lib/mock-store"

const ADMIN_SECRET = process.env.ADMIN_SECRET

/** Renewal: adds days to a key the customer already has. */
export async function PATCH(req: NextRequest) {
  if (isDemoMode()) {
    const r = getMockStore().extend(await req.json().catch(() => ({})))
    return NextResponse.json(r.body, { status: r.status })
  }
  const API_URL = licenseApiUrl() as string
  if (!ADMIN_SECRET) {
    return NextResponse.json({ message: "Server misconfigured: ADMIN_SECRET not set" }, { status: 500 })
  }

  const body = (await req.json()) as { key?: unknown; days?: unknown }
  const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : ""
  const days = Number(body.days)

  if (!key) return NextResponse.json({ message: "ต้องระบุ key" }, { status: 400 })
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return NextResponse.json({ message: "จำนวนวันต้องอยู่ระหว่าง 1-3650" }, { status: 400 })
  }

  const res = await fetch(`${API_URL}/license/extend`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-secret": ADMIN_SECRET },
    body: JSON.stringify({ key, days }),
  })

  const data: unknown = await res.json()
  return NextResponse.json(data, { status: res.status })
}
