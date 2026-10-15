import { NextRequest, NextResponse } from "next/server"
import { isDemoMode, licenseApiUrl } from "@/lib/demo"
import { getMockStore } from "@/app/lib/mock-store"

const ADMIN_SECRET = process.env.ADMIN_SECRET

export async function POST(req: NextRequest) {
  if (isDemoMode()) {
    const r = getMockStore().create(await req.json().catch(() => ({})))
    return NextResponse.json(r.body, { status: r.status })
  }
  const API_URL = licenseApiUrl() as string
  if (!ADMIN_SECRET) {
    return NextResponse.json({ message: "Server misconfigured: ADMIN_SECRET not set" }, { status: 500 })
  }
  const body = await req.json()
  const res = await fetch(`${API_URL}/license/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
