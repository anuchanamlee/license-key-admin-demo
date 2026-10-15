import { NextResponse } from "next/server"
import { isDemoMode, licenseApiUrl } from "@/lib/demo"
import { getMockStore } from "@/app/lib/mock-store"

const ADMIN_SECRET = process.env.ADMIN_SECRET

export async function GET() {
  if (isDemoMode()) {
    const r = getMockStore().list()
    return NextResponse.json(r.body, { status: r.status })
  }
  const API_URL = licenseApiUrl() as string
  if (!ADMIN_SECRET) {
    return NextResponse.json({ message: "Server misconfigured: ADMIN_SECRET not set" }, { status: 500 })
  }
  const res = await fetch(`${API_URL}/license/list`, {
    headers: { "x-admin-secret": ADMIN_SECRET },
    cache: "no-store",
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
