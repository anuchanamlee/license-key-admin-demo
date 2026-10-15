import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE, isValidSession } from "./lib/session"

/**
 * The two audiences are separated by path, and the paths mirror the folders:
 *
 *   app/(public)/*  + /api/public/*  -> anyone, no secret involved
 *   app/(admin)/*   + /api/admin/*   -> session required
 *
 * Anything that matches neither list is treated as admin. A new page is
 * private until someone deliberately puts it in the public list, rather than
 * public until someone remembers to protect it.
 */
const PUBLIC_PAGES = new Set(["/login", "/reset"])
const PUBLIC_API_PREFIX = "/api/public/"
const AUTH_ROUTES = new Set(["/api/auth/login", "/api/auth/logout"])

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PAGES.has(pathname) ||
    AUTH_ROUTES.has(pathname) ||
    pathname.startsWith(PUBLIC_API_PREFIX)
  )
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const authenticated = await isValidSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  )

  if (isPublic(pathname)) {
    // A signed-in admin landing on /login goes straight to the dashboard.
    if (pathname === "/login" && authenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (authenticated) return NextResponse.next()

  // API calls get a status they can act on; a redirect would arrive at the
  // fetch as an HTML login page and read like a broken endpoint.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 })
  }

  const login = new URL("/login", request.url)
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    // Everything but Next's own assets and the favicon.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
