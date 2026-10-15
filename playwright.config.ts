import { defineConfig, devices } from "@playwright/test"
import {
  STORAGE_STATE,
  TEST_ADMIN_PASSWORD,
  TEST_SESSION_SECRET,
} from "./e2e/test-credentials"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // The door is only proved by a browser that was never let in.
    {
      name: "auth-gate",
      testMatch: /auth-gate\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testIgnore: /(auth-gate\.spec|auth\.setup)\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // Login fails closed without these, so the run supplies its own.
    env: {
      ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
      SESSION_SECRET: TEST_SESSION_SECRET,
    },
  },
})
