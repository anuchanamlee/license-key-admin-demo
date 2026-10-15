import { NextResponse } from "next/server"
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionValue,
  safeEqual,
} from "@/lib/session"
import { DEMO_PASSWORD, isDemoMode } from "@/lib/demo"

/** Slows down guessing without keeping any per-IP state. */
const WRONG_PASSWORD_DELAY_MS = 700

export async function POST(request: Request) {
  // Demo mode falls back to the documented demo password; real mode never does.
  const password = process.env.ADMIN_PASSWORD || (isDemoMode() ? DEMO_PASSWORD : undefined)
  const sessionValue = await createSessionValue()

  if (!password || password.length < 8 || !sessionValue) {
    return NextResponse.json(
      {
        message:
          "ยังตั้งค่าเข้าสู่ระบบไม่ครบ ต้องมี ADMIN_PASSWORD (อย่างน้อย 8 ตัว) และ SESSION_SECRET (อย่างน้อย 16 ตัว)",
      },
      { status: 500 },
    )
  }

  let submitted = ""
  try {
    const body = (await request.json()) as { password?: unknown }
    submitted = typeof body.password === "string" ? body.password : ""
  } catch {
    submitted = ""
  }

  if (!safeEqual(submitted, password)) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS))
    return NextResponse.json({ message: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: SESSION_COOKIE,
    value: sessionValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return response
}
