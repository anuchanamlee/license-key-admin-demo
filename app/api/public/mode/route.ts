import { NextResponse } from "next/server"
import { isDemoMode } from "@/lib/demo"

/** Lets the UI show the "Demo data" badge. Reveals nothing but a boolean. */
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({ demo: isDemoMode() })
}
