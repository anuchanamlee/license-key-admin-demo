/**
 * Credentials the e2e run starts its own dev server with.
 *
 * The login door fails closed when ADMIN_PASSWORD / SESSION_SECRET are absent,
 * so the tests have to supply them; they are test-only values for a server
 * bound to localhost, and nothing here is a secret from anywhere else.
 */
export const TEST_ADMIN_PASSWORD = "e2e-admin-password"
export const TEST_SESSION_SECRET = "e2e-session-secret-0123456789"

/** Where the signed-in browser state produced by auth.setup.ts is kept. */
export const STORAGE_STATE = "e2e/.auth/admin.json"
