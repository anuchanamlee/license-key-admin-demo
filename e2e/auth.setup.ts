import { test as setup, expect } from "@playwright/test"
import { STORAGE_STATE, TEST_ADMIN_PASSWORD } from "./test-credentials"

/** Logs in once; the admin specs reuse the cookie instead of each logging in. */
setup("log in as admin", async ({ page }) => {
  await page.goto("/login")

  const response = await page.request.post("/api/auth/login", {
    data: { password: TEST_ADMIN_PASSWORD },
  })
  expect(response.status()).toBe(200)

  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.context().storageState({ path: STORAGE_STATE })
})
