/**
 * In-memory stand-in for the licence backend, used in DEMO mode
 * (LICENSE_API_URL unset). State lives in this process only and resets on
 * restart. Every method returns { status, body } with the same shapes the real
 * backend returns (see ./types), so the route handlers can pass it straight on.
 *
 * Deliberately free of path aliases and Node-only imports so the unit tests can
 * load it with `node --test`.
 *
 * Rules the mock enforces for the public reset (a demo of the real rules; the
 * numbers are this mock's own): the key must exist, match the chosen system and
 * not be revoked or expired; one reset per Bangkok calendar day; at most
 * MAX_RESETS_30D resets in any 30 days.
 */
import type { CreateResult, ExtendResult, LicenseKey, ResetResult, SystemType } from "./types"

export interface MockResponse<T = unknown> {
  status: number
  body: T | { message: string }
}

export const MAX_RESETS_30D = 5
const DAY_MS = 86_400_000
const BANGKOK_OFFSET_MS = 7 * 3_600_000
const SYSTEM_TYPES: ReadonlySet<string> = new Set(["SORTER", "CAPTCHA"])

interface StoredKey extends LicenseKey {
  resets: number[] // epoch ms of each HWID reset
}

export interface MockStore {
  list(): MockResponse<LicenseKey[]>
  create(input: { days?: unknown; note?: unknown; system_type?: unknown }): MockResponse<CreateResult>
  extend(input: { key?: unknown; days?: unknown }): MockResponse<ExtendResult>
  revoke(input: { key?: unknown }): MockResponse<{ revoked: boolean; key: string }>
  adminResetHwid(input: { key?: unknown; reason?: unknown }): MockResponse<ResetResult>
  publicResetHwid(input: { key?: unknown; system_type?: unknown }): MockResponse<ResetResult>
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const bangkokDay = (ms: number) => isoDay(ms + BANGKOK_OFFSET_MS)
const fail = (status: number, message: string): MockResponse<never> => ({
  status,
  body: { message },
})

function normKey(v: unknown): string {
  return typeof v === "string" ? v.trim().toUpperCase() : ""
}

function randomGroup(rand: () => number): string {
  let out = ""
  for (let i = 0; i < 4; i++) out += Math.floor(rand() * 16).toString(16).toUpperCase()
  return out
}

export function createMockStore(
  options: { now?: () => number; random?: () => number } = {},
): MockStore {
  const now = options.now ?? Date.now
  const rand = options.random ?? Math.random
  const records = new Map<string, StoredKey>()

  const ago = (days: number) => isoDay(now() - days * DAY_MS)
  const ahead = (days: number) => isoDay(now() + days * DAY_MS)

  function seed(
    key: string,
    note: string,
    system_type: SystemType,
    days: number,
    createdDaysAgo: number,
    expires: string | null,
    hwid: string | null,
    revoked = false,
    resetsDaysAgo: number[] = [],
  ) {
    records.set(key, {
      key,
      note,
      days,
      system_type,
      revoked,
      hwid,
      expires_at: expires,
      created_at: ago(createdDaysAgo),
      resets: resetsDaysAgo.map((d) => now() - d * DAY_MS),
    })
  }

  // Fake data only: invented names, random-looking keys and machine ids.
  seed("A1B2-C3D4-E5F6-0A1B", "Acme Studio (demo)", "SORTER", 30, 12, ahead(18), "7f3a9c2e41b8d605")
  seed("B7C8-D9E0-F1A2-3B4C", "Northwind Labs (demo)", "CAPTCHA", 90, 40, ahead(50), "c04e1d77a9b3528f")
  seed("C5D6-E7F8-A9B0-1C2D", "Globex trial (demo)", "SORTER", 7, 5, ahead(2), "1b9d6e03f2a74c58")
  seed("D3E4-F5A6-B7C8-9D0E", "Initech (demo)", "CAPTCHA", 30, 60, ago(30), "9e52b8c0d1f3a647")
  seed("E1F2-A3B4-C5D6-7E8F", "Umbrella reseller (demo)", "SORTER", 30, 45, ahead(15), "5a7c0e94b2d81f36", false, [10])
  // Already reset today: the public page answers "try again tomorrow".
  seed("2B3C-4D5E-6F7A-8B9C", "Soylent (demo), reset today", "CAPTCHA", 30, 25, ahead(5), "3d8f6a1c9e0b7425", false, [0])
  // Five resets in the last 30 days: quota used up.
  seed("3C4D-5E6F-7A8B-9C0D", "Vandelay (demo), quota used", "SORTER", 90, 30, ahead(60), "a62e9b04c7d1f358", false, [3, 6, 9, 12, 15])
  seed("F9A0-B1C2-D3E4-5F6A", "Hooli refund (demo)", "CAPTCHA", 30, 20, ahead(10), "e8b1f4a6073c92d5", true)
  seed("0A9B-8C7D-6E5F-4A3B", "Stark Tools (demo)", "SORTER", 180, 3, ahead(177), null)
  seed("1D2C-3B4A-5F6E-7D8C", "Wayne Corp, not yet activated (demo)", "CAPTCHA", 30, 1, null, null)

  function afterReset(rec: StoredKey, ts: number): ResetResult {
    rec.resets.push(ts)
    rec.hwid = null
    const last30 = rec.resets.filter((t) => t > ts - 30 * DAY_MS).length
    const nextMidnight =
      (Math.floor((ts + BANGKOK_OFFSET_MS) / DAY_MS) + 1) * DAY_MS - BANGKOK_OFFSET_MS
    return {
      reset: true,
      message: "Machine binding cleared. Open the program on your new machine to bind it.",
      resets_left_today: 0,
      next_reset_available_at: new Date(nextMidnight).toISOString(),
      resets_last_30d: last30,
    }
  }

  return {
    list() {
      const rows = [...records.values()]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((r) => ({
          key: r.key,
          note: r.note,
          days: r.days,
          created_at: r.created_at,
          expires_at: r.expires_at,
          hwid: r.hwid,
          revoked: r.revoked,
          system_type: r.system_type,
        }))
      return { status: 200, body: rows }
    },

    create(input) {
      const days = Number(input.days)
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        return fail(400, "จำนวนวันต้องอยู่ระหว่าง 1-3650")
      }
      const systemType = typeof input.system_type === "string" ? input.system_type : ""
      if (!SYSTEM_TYPES.has(systemType)) return fail(400, "เลือกระบบที่ใช้งานก่อน")
      const note = typeof input.note === "string" ? input.note.trim().slice(0, 200) : ""

      let key = ""
      do {
        key = [randomGroup(rand), randomGroup(rand), randomGroup(rand), randomGroup(rand)].join("-")
      } while (records.has(key))

      const expires = isoDay(now() + days * DAY_MS)
      records.set(key, {
        key,
        note,
        days,
        system_type: systemType as SystemType,
        revoked: false,
        hwid: null,
        expires_at: expires,
        created_at: isoDay(now()),
        resets: [],
      })
      return {
        status: 200,
        body: { key, expires_at: expires, note, system_type: systemType as SystemType },
      }
    },

    extend(input) {
      const key = normKey(input.key)
      const days = Number(input.days)
      if (!key) return fail(400, "ต้องระบุ key")
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        return fail(400, "จำนวนวันต้องอยู่ระหว่าง 1-3650")
      }
      const rec = records.get(key)
      if (!rec) return fail(404, "ไม่พบ key")
      if (rec.revoked) return fail(409, "Key นี้ถูกยกเลิกแล้ว")

      const today = isoDay(now())
      let outcome: ExtendResult["outcome"]
      if (!rec.expires_at) {
        outcome = "not_started"
        rec.days += days
      } else if (rec.expires_at < today) {
        outcome = "restarted"
        rec.expires_at = isoDay(now() + days * DAY_MS)
      } else {
        outcome = "extended"
        rec.expires_at = isoDay(Date.parse(rec.expires_at) + days * DAY_MS)
      }
      const daysLeft = rec.expires_at
        ? Math.ceil((Date.parse(rec.expires_at) - Date.parse(today)) / DAY_MS)
        : null
      return {
        status: 200,
        body: { key, expires_at: rec.expires_at, days_left: daysLeft, days_added: days, outcome },
      }
    },

    revoke(input) {
      const key = normKey(input.key)
      if (!key) return fail(400, "ต้องระบุ key")
      const rec = records.get(key)
      if (!rec) return fail(404, "ไม่พบ key")
      rec.revoked = true
      return { status: 200, body: { revoked: true, key } }
    },

    adminResetHwid(input) {
      const key = normKey(input.key)
      if (!key) return fail(400, "ต้องระบุ key")
      const rec = records.get(key)
      if (!rec) return fail(404, "ไม่พบ key")
      // Admin override: no daily limit, no 30-day quota.
      return { status: 200, body: afterReset(rec, now()) }
    },

    publicResetHwid(input) {
      const key = normKey(input.key)
      const systemType = typeof input.system_type === "string" ? input.system_type : ""
      if (!/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(key)) {
        return fail(400, "รูปแบบ Key ไม่ถูกต้อง (ตัวอย่าง ABCD-1234-EF56-7890)")
      }
      if (!SYSTEM_TYPES.has(systemType)) return fail(400, "เลือกระบบที่ใช้งานก่อน")

      const rec = records.get(key)
      // One answer for "unknown" and "wrong system" so keys cannot be probed.
      if (!rec || rec.system_type !== systemType) return fail(404, "ไม่พบ Key นี้ในระบบที่เลือก")
      if (rec.revoked) return fail(403, "Key นี้ถูกยกเลิกแล้ว")
      if (rec.expires_at && rec.expires_at < isoDay(now())) return fail(403, "Key นี้หมดอายุแล้ว")
      if (!rec.hwid) {
        return fail(409, "Key นี้ยังไม่ได้ผูกกับเครื่องไหน เปิดโปรแกรมที่เครื่องใหม่ได้เลย")
      }

      const ts = now()
      if (rec.resets.some((t) => bangkokDay(t) === bangkokDay(ts))) {
        return fail(429, "วันนี้ปลดเครื่องไปแล้ว ลองใหม่พรุ่งนี้")
      }
      if (rec.resets.filter((t) => t > ts - 30 * DAY_MS).length >= MAX_RESETS_30D) {
        return fail(429, `ปลดเครื่องครบ ${MAX_RESETS_30D} ครั้งใน 30 วันแล้ว กรุณาติดต่อผู้ดูแล`)
      }
      return { status: 200, body: afterReset(rec, ts) }
    },
  }
}

// One store per server process, shared by every route module (Next may load
// each route in its own module instance, so the singleton hangs off globalThis).
const GLOBAL_KEY = "__licenseDemoMockStore"

export function getMockStore(): MockStore {
  const g = globalThis as unknown as Record<string, MockStore | undefined>
  return (g[GLOBAL_KEY] ??= createMockStore())
}
