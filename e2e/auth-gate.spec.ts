import { test, expect, type Page } from "@playwright/test"
import { createHmac } from "node:crypto"
import { TEST_ADMIN_PASSWORD, TEST_SESSION_SECRET } from "./test-credentials"

/**
 * The login door, checked the way it was checked by hand after every deploy.
 *
 * These tests run with no stored session on purpose: a signed-in browser would
 * pass every one of them without the door existing at all.
 */

const SESSION_COOKIE = "admin_session"

const ADMIN_PAGES = ["/", "/dashboard", "/keys", "/create"]
const ADMIN_APIS = [
  "/api/admin/list",
  "/api/admin/create",
  "/api/admin/revoke",
  "/api/admin/extend",
  "/api/admin/reset-hwid",
]

/** A cookie the proxy should reject, signed the same way the server signs. */
function signedSession(expiresAt: number): string {
  const payload = String(expiresAt)
  const signature = createHmac("sha256", TEST_SESSION_SECRET).update(payload).digest("hex")
  return `${payload}.${signature}`
}

async function setSessionCookie(page: Page, value: string) {
  await page.context().addCookies([
    { name: SESSION_COOKIE, value, url: "http://localhost:3000" },
  ])
}

test.describe("locked out without a session", () => {
  for (const path of ADMIN_PAGES) {
    test(`${path} redirects to the login page`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login(\?|$)/)
      // The real login form, not just a URL that happens to say /login.
      await expect(page.locator("#admin-password")).toBeVisible()
    })
  }

  test("the redirect remembers where the admin was heading", async ({ page }) => {
    await page.goto("/keys")
    expect(new URL(page.url()).searchParams.get("next")).toBe("/keys")
  })

  for (const path of ADMIN_APIS) {
    test(`${path} answers 401 rather than a login page`, async ({ request }) => {
      const response = await request.post(path, { data: {} })
      expect(response.status()).toBe(401)
      expect(response.headers()["content-type"]).toContain("application/json")
    })
  }

  test("GET /api/admin/list is 401 too", async ({ request }) => {
    expect((await request.get("/api/admin/list")).status()).toBe(401)
  })
})

test.describe("open to everyone", () => {
  test("/login loads", async ({ page }) => {
    const response = await page.goto("/login")
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/login$/)
  })

  test("/reset loads without a session", async ({ page }) => {
    const response = await page.goto("/reset")
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/reset$/)
  })

  test("the customer reset endpoint is not behind the door", async ({ request }) => {
    // A rejected key proves the route ran; a 401 would mean the door caught it.
    const response = await request.post("/api/public/reset-hwid", {
      data: { key: "not-a-key", system_type: "SORTER" },
    })
    expect(response.status()).toBe(400)
  })
})

test.describe("logging in", () => {
  test("a wrong password gets no cookie", async ({ page, context }) => {
    await page.goto("/login")
    const response = await page.request.post("/api/auth/login", {
      data: { password: "wrong-password" },
    })
    expect(response.status()).toBe(401)

    const cookies = await context.cookies()
    expect(cookies.find((c) => c.name === SESSION_COOKIE)).toBeUndefined()

    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("the right password opens the dashboard, and logout closes it again", async ({
    page,
    context,
  }) => {
    await page.goto("/login")
    expect(
      (await page.request.post("/api/auth/login", { data: { password: TEST_ADMIN_PASSWORD } }))
        .status(),
    ).toBe(200)

    const session = (await context.cookies()).find((c) => c.name === SESSION_COOKIE)
    expect(session?.httpOnly).toBe(true)
    expect(session?.sameSite).toBe("Lax")

    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard$/)

    // Already signed in, /login sends the admin on instead of asking again.
    await page.goto("/login")
    await expect(page).toHaveURL(/\/dashboard$/)

    expect((await page.request.post("/api/auth/logout")).status()).toBe(200)
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })
})

test.describe("cookies the proxy must not believe", () => {
  test("a made-up signature is refused", async ({ page }) => {
    await setSessionCookie(page, `${Date.now() + 3_600_000}.deadbeef`)
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("a correctly signed but expired cookie is refused", async ({ page }) => {
    await setSessionCookie(page, signedSession(Date.now() - 1000))
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("an expiry moved forward without re-signing is refused", async ({ page }) => {
    const valid = signedSession(Date.now() + 60_000)
    const tampered = `${Date.now() + 30 * 24 * 3_600_000}.${valid.split(".")[1]}`
    await setSessionCookie(page, tampered)
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })
})
