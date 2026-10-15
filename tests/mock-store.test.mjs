import { test } from "node:test"
import assert from "node:assert/strict"
import { createMockStore, MAX_RESETS_30D } from "../app/lib/mock-store.ts"

const T0 = Date.parse("2026-10-15T05:00:00Z") // 12:00 in Bangkok
const DAY = 86_400_000
const day = (ms) => new Date(ms).toISOString().slice(0, 10)

function fresh() {
  const clock = { t: T0 }
  const store = createMockStore({ now: () => clock.t })
  return { store, clock }
}
const byKey = (store, key) => store.list().body.find((r) => r.key === key)

test("seeds a realistic set: active, expired, revoked, pending", () => {
  const { store } = fresh()
  const rows = store.list().body
  assert.ok(rows.length >= 8)
  assert.ok(rows.some((r) => r.revoked))
  assert.ok(rows.some((r) => r.expires_at && r.expires_at < day(T0)))
  assert.ok(rows.some((r) => !r.revoked && r.expires_at && r.expires_at >= day(T0)))
  assert.ok(rows.some((r) => r.expires_at === null))
  assert.equal(new Set(rows.map((r) => r.key)).size, rows.length)
})

test("create -> appears in list with the returned key and expiry", () => {
  const { store } = fresh()
  const before = store.list().body.length
  const res = store.create({ days: 30, note: "  new customer ", system_type: "CAPTCHA" })
  assert.equal(res.status, 200)
  assert.match(res.body.key, /^[A-F0-9]{4}(-[A-F0-9]{4}){3}$/)
  assert.equal(res.body.expires_at, day(T0 + 30 * DAY))
  assert.equal(res.body.note, "new customer")
  const rows = store.list().body
  assert.equal(rows.length, before + 1)
  const row = byKey(store, res.body.key)
  assert.equal(row.revoked, false)
  assert.equal(row.hwid, null)
  assert.equal(row.system_type, "CAPTCHA")
})

test("create rejects bad days and unknown system", () => {
  const { store } = fresh()
  assert.equal(store.create({ days: 0, system_type: "CAPTCHA" }).status, 400)
  assert.equal(store.create({ days: 3651, system_type: "CAPTCHA" }).status, 400)
  assert.equal(store.create({ days: 1.5, system_type: "CAPTCHA" }).status, 400)
  assert.equal(store.create({ days: 5, system_type: "NOPE" }).status, 400)
})

test("revoke -> status revoked; unknown key 404", () => {
  const { store } = fresh()
  const { key } = store.create({ days: 5, system_type: "SORTER" }).body
  assert.deepEqual(store.revoke({ key }).body, { revoked: true, key })
  assert.equal(byKey(store, key).revoked, true)
  assert.equal(store.revoke({ key: "FFFF-FFFF-FFFF-FFFF" }).status, 404)
  assert.equal(store.revoke({}).status, 400)
})

test("extend moves expiry: active, expired (restart) and not started", () => {
  const { store } = fresh()
  const active = byKey(store, "A1B2-C3D4-E5F6-0A1B")
  const r1 = store.extend({ key: active.key, days: 10 })
  assert.equal(r1.body.outcome, "extended")
  assert.equal(r1.body.expires_at, day(Date.parse(active.expires_at) + 10 * DAY))
  assert.equal(r1.body.days_left, 28)

  const r2 = store.extend({ key: "D3E4-F5A6-B7C8-9D0E", days: 30 })
  assert.equal(r2.body.outcome, "restarted")
  assert.equal(r2.body.expires_at, day(T0 + 30 * DAY))

  const r3 = store.extend({ key: "1D2C-3B4A-5F6E-7D8C", days: 15 })
  assert.equal(r3.body.outcome, "not_started")
  assert.equal(r3.body.expires_at, null)
  assert.equal(byKey(store, "1D2C-3B4A-5F6E-7D8C").days, 45)

  assert.equal(store.extend({ key: active.key, days: 0 }).status, 400)
  assert.equal(store.extend({ key: "FFFF-FFFF-FFFF-FFFF", days: 5 }).status, 404)
})

test("extend refuses a revoked key", () => {
  const { store } = fresh()
  assert.equal(store.extend({ key: "F9A0-B1C2-D3E4-5F6A", days: 5 }).status, 409)
})

test("public reset rejects malformed, unknown, wrong-system and revoked keys", () => {
  const { store } = fresh()
  assert.equal(store.publicResetHwid({ key: "not-a-key", system_type: "SORTER" }).status, 400)
  assert.equal(store.publicResetHwid({ key: "A1B2-C3D4-E5F6-0A1B", system_type: "x" }).status, 400)
  assert.equal(store.publicResetHwid({ key: "FFFF-FFFF-FFFF-FFFF", system_type: "SORTER" }).status, 404)
  // Seeded key belongs to SORTER; asking as CAPTCHA looks identical to unknown.
  assert.equal(store.publicResetHwid({ key: "A1B2-C3D4-E5F6-0A1B", system_type: "CAPTCHA" }).status, 404)
  assert.equal(store.publicResetHwid({ key: "F9A0-B1C2-D3E4-5F6A", system_type: "CAPTCHA" }).status, 403)
  assert.equal(store.publicResetHwid({ key: "D3E4-F5A6-B7C8-9D0E", system_type: "CAPTCHA" }).status, 403) // expired
  assert.equal(store.publicResetHwid({ key: "0A9B-8C7D-6E5F-4A3B", system_type: "SORTER" }).status, 409) // unbound
})

test("public reset clears the HWID, normalising key case", () => {
  const { store, clock } = fresh()
  const ok = store.publicResetHwid({ key: "a1b2-c3d4-e5f6-0a1b", system_type: "SORTER" })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.reset, true)
  assert.equal(ok.body.resets_left_today, 0)
  assert.equal(ok.body.resets_last_30d, 1)
  assert.equal(byKey(store, "A1B2-C3D4-E5F6-0A1B").hwid, null)
  // Next Bangkok midnight after 12:00 on 15 Oct is 16 Oct 00:00 +07 = 15 Oct 17:00Z.
  assert.equal(ok.body.next_reset_available_at, "2026-10-15T17:00:00.000Z")
  assert.ok(Date.parse(ok.body.next_reset_available_at) > clock.t)
  // Binding is gone, so repeating the call has nothing to reset.
  assert.equal(store.publicResetHwid({ key: "A1B2-C3D4-E5F6-0A1B", system_type: "SORTER" }).status, 409)
})

test("public reset: one per Bangkok day, then allowed again the next day", () => {
  const { store, clock } = fresh()
  const k = { key: "2B3C-4D5E-6F7A-8B9C", system_type: "CAPTCHA" }
  assert.equal(store.publicResetHwid(k).status, 429)
  clock.t += DAY // next day; seeded reset is now yesterday
  assert.equal(store.publicResetHwid(k).status, 200)
})

test("public reset: 30-day quota blocks, and frees up as old resets age out", () => {
  const { store, clock } = fresh()
  const k = { key: "3C4D-5E6F-7A8B-9C0D", system_type: "SORTER" }
  assert.equal(store.publicResetHwid(k).status, 429)
  clock.t += 16 * DAY // oldest resets (15d, 12d) fall out of the 30-day window
  assert.equal(store.publicResetHwid(k).status, 200)
  assert.ok(MAX_RESETS_30D === 5)
})

test("admin reset ignores limits and clears the HWID", () => {
  const { store } = fresh()
  assert.equal(store.adminResetHwid({ key: "C5D6-E7F8-A9B0-1C2D", reason: "new PC" }).status, 200)
  assert.equal(byKey(store, "C5D6-E7F8-A9B0-1C2D").hwid, null)
  assert.equal(store.adminResetHwid({ key: "FFFF-FFFF-FFFF-FFFF" }).status, 404)
})

test("list never leaks internal reset history", () => {
  const { store } = fresh()
  for (const row of store.list().body) assert.equal("resets" in row, false)
})
