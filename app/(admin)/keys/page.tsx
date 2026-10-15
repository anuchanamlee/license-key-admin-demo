"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { adminApi } from "@/app/lib/admin-api"
import { LicenseKey, SystemType } from "@/app/lib/types"
import SettingsBar from "@/app/components/SettingsBar"
import StatusBadge from "@/app/components/StatusBadge"
import { useToast } from "@/app/components/Toast"

export default function KeysPage() {
  const [allKeys, setAllKeys] = useState<LicenseKey[]>([])
  const [loading, setLoading] = useState(false)
  const [search,  setSearch]  = useState("")
  const { toast } = useToast()

  // ── Create key form state ──
  const [showForm, setShowForm]     = useState(false)
  const [formDays, setFormDays]     = useState(30)
  const [formNote, setFormNote]     = useState("")
  const [formSystem, setFormSystem] = useState<SystemType>("CAPTCHA")
  const [creating, setCreating]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await adminApi.list(); setAllKeys(data) }
    catch (e: unknown) { toast((e as Error).message, "error") }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allKeys.filter(r =>
      r.key.toLowerCase().includes(q) ||
      (r.note ?? "").toLowerCase().includes(q) ||
      (r.hwid ?? "").toLowerCase().includes(q) ||
      r.system_type.toLowerCase().includes(q)
    )
  }, [search, allKeys])

  async function revoke(key: string) {
    if (!confirm(`ยืนยันยกเลิก Key นี้?\n\n${key}`)) return
    try {
      await adminApi.revoke(key)
      toast(`ยกเลิก ${key} แล้ว ✓`, "success")
      setAllKeys(prev => prev.map(k => k.key === key ? { ...k, revoked: true } : k))
    } catch (e: unknown) { toast((e as Error).message, "error") }
  }

  /** Admin override of the customer's once-a-day limit, for the phone call
   *  that starts with "I bought a new PC". Clears the binding only - the new
   *  machine binds itself the next time the program is opened. */
  async function resetHwid(key: string, hwid: string | null) {
    if (!hwid) {
      toast("Key นี้ยังไม่ได้ผูกกับเครื่องไหน เปิดโปรแกรมที่เครื่องใหม่ได้เลย", "success")
      return
    }
    const reason = prompt(`ปลดเครื่องของ Key นี้?\n\n${key}\nเครื่องปัจจุบัน: ${hwid}\n\nเหตุผล (บันทึกไว้ตรวจสอบ):`)
    if (reason === null) return
    try {
      await adminApi.resetHwid(key, reason.trim())
      toast(`ปลดเครื่องของ ${key} แล้ว ✓ ให้ลูกค้าเปิดโปรแกรมที่เครื่องใหม่`, "success")
      setAllKeys(prev => prev.map(k => k.key === key ? { ...k, hwid: null } : k))
    } catch (e: unknown) { toast((e as Error).message, "error") }
  }

  /** Renewal in place: the customer keeps the key already pasted into their
   *  program, so selling another month costs them nothing to set up. */
  async function renew(key: string, current: string | null) {
    const answer = prompt(`ต่ออายุ ${key}

หมดอายุ ${current ?? "ยังไม่เริ่มนับ"}

ต่อกี่วัน?`, "30")
    if (answer === null) return
    const days = Number(answer.trim())
    if (!Number.isInteger(days) || days < 1) { toast("จำนวนวันไม่ถูกต้อง", "error"); return }
    try {
      const res = await adminApi.extend(key, days)
      const what =
        res.outcome === "restarted" ? `เริ่มนับใหม่ หมดอายุ ${res.expires_at}` :
        res.outcome === "not_started" ? "เพิ่มเป็นก้อน ยังไม่เริ่มนับจนกว่าลูกค้าจะเปิดใช้" :
        `หมดอายุใหม่ ${res.expires_at} (เหลือ ${res.days_left} วัน)`
      toast(`ต่ออายุ ${key} +${days} วัน — ${what}`, "success")
      setAllKeys(prev => prev.map(k => k.key === key ? { ...k, expires_at: res.expires_at } : k))
    } catch (e: unknown) { toast((e as Error).message, "error") }
  }

  async function handleCreate() {
    if (formDays < 1 || formDays > 3650) {
      toast("จำนวนวันต้องอยู่ระหว่าง 1–3650", "error")
      return
    }
    setCreating(true)
    try {
      const res = await adminApi.create(formDays, formNote.trim(), formSystem)
      toast(`สร้าง Key สำเร็จ: ${res.key} ✓`, "success")
      setShowForm(false)
      setFormNote("")
      setFormDays(30)
      load()
    } catch (e: unknown) {
      toast((e as Error).message, "error")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <SettingsBar />
      <p className="page-title">รายการ Key ทั้งหมด</p>
      <p className="page-sub">ออก · ต่ออายุ · ย้ายเครื่อง · ยกเลิก</p>

      {/* ── Create Key Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, border: "1px solid var(--accent)" }}>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>สร้าง Key ใหม่</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>ระบบ</label>
              <select
                className="input"
                style={{ minWidth: 140 }}
                value={formSystem}
                onChange={e => setFormSystem(e.target.value as SystemType)}
              >
                <option value="CAPTCHA">🤖 Captcha (CNN)</option>
                <option value="SORTER">📦 Sorter</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>จำนวนวัน</label>
              <input
                className="input"
                type="number"
                min={1}
                max={3650}
                style={{ width: 100 }}
                value={formDays}
                onChange={e => setFormDays(Number(e.target.value))}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>โน้ต (ไม่บังคับ)</label>
              <input
                className="input"
                placeholder="ชื่อลูกค้า หรือหมายเหตุ..."
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? "กำลังสร้าง..." : "สร้าง Key"}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="toolbar">
          <input className="input" placeholder="ค้นหา Key, Note, HWID..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-ghost" onClick={load} disabled={loading}>🔄 โหลด</button>
          <button
            className="btn btn-primary"
            onClick={() => { setFormSystem("CAPTCHA"); setShowForm(s => !s) }}
          >
            + สร้าง Key
          </button>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr>{["Key","Note","ระบบ","วันที่สร้าง","หมดอายุ","HWID","สถานะ",""].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><div className="empty">กำลังโหลด...</div></td></tr>
              ) : filtered.length ? filtered.map(r => (
                <tr key={r.key}>
                  <td>
                    <span className="key-mono">{r.key}</span>
                    <button className="copy-btn" title="คัดลอก"
                      onClick={() => { navigator.clipboard.writeText(r.key); toast("คัดลอกแล้ว ✓", "success") }}>📋</button>
                  </td>
                  <td className="wrap">{r.note || "—"}</td>
                  <td>
                    <span style={{ fontSize: 12, paddingInline: 6, paddingBlock: 3, borderRadius: 4, background: r.system_type === "SORTER" ? "rgba(100,200,150,.15)" : "rgba(79,142,247,.15)" }}>
                      {r.system_type === "SORTER" ? "📦 Sorter" : "🤖 Captcha"}
                    </span>
                  </td>
                  <td>{r.created_at || "—"}</td>
                  <td>{r.expires_at || "—"}</td>
                  <td><span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{r.hwid ? r.hwid.slice(0,8)+"…" : "—"}</span></td>
                  <td><StatusBadge row={r} /></td>
                  <td>
                    {!r.revoked ? (
                      <div className="row-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          title="เพิ่มวันให้ key เดิม ลูกค้าไม่ต้องเปลี่ยน key"
                          onClick={() => renew(r.key, r.expires_at)}
                        >
                          ต่ออายุ
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="ปลดเครื่องที่ผูกไว้ ให้ลูกค้าย้ายไปเครื่องใหม่"
                          onClick={() => resetHwid(r.key, r.hwid)}
                        >
                          ย้ายเครื่อง
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => revoke(r.key)}>ยกเลิก</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8}>
                  <div className="empty">
                    <div className="empty-icon">🔑</div>
                    <div className="empty-title">{search ? "ไม่พบ key ที่ค้นหา" : "ยังไม่มี key"}</div>
                    <div>{search ? "ลองคำค้นอื่น" : "กดปุ่ม + สร้าง Key เพื่อออกคีย์แรก"}</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
