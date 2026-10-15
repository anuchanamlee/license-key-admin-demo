"use client"
import { useCallback, useEffect, useState } from "react"
import { adminApi } from "@/app/lib/admin-api"
import { LicenseKey } from "@/app/lib/types"
import SettingsBar from "@/app/components/SettingsBar"
import StatusBadge from "@/app/components/StatusBadge"
import { useToast } from "@/app/components/Toast"

export default function DashboardPage() {
  const [keys,    setKeys]    = useState<LicenseKey[]>([])
  const [loading, setLoading] = useState(false)
  const [errMsg,  setErrMsg]  = useState("")
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true); setErrMsg("")
    try   { setKeys(await adminApi.list()) }
    catch (e: unknown) { const m = (e as Error).message; setErrMsg(m); toast(m, "error") }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const today   = new Date().toISOString().slice(0, 10)
  const active  = keys.filter(r => !r.revoked && !!r.expires_at && r.expires_at >= today).length
  const revoked = keys.length - active

  // The list that turns this page into a to-do: who to talk to about renewing,
  // before their program stops working and they find out the hard way.
  const daysLeft = (expires: string) =>
    Math.ceil((new Date(expires + "T23:59:59+07:00").getTime() - Date.now()) / 86_400_000)

  const expiringSoon = keys
    .filter(r => !r.revoked && !!r.expires_at && r.expires_at >= today && daysLeft(r.expires_at!) <= 7)
    .sort((a, b) => (a.expires_at ?? "").localeCompare(b.expires_at ?? ""))

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
        res.outcome === "not_started" ? `เพิ่มโควตาเป็นก้อน ยังไม่เริ่มนับจนกว่าลูกค้าจะเปิดใช้` :
        `หมดอายุใหม่ ${res.expires_at} (เหลือ ${res.days_left} วัน)`
      toast(`ต่ออายุ ${key} +${days} วัน — ${what}`, "success")
      load()
    } catch (e: unknown) { toast((e as Error).message, "error") }
  }

  return (
    <div>
      <SettingsBar />
      <p className="page-title">Dashboard</p>
      <p className="page-sub">ภาพรวม License และคิวที่ต้องตามต่ออายุ</p>

      {errMsg && <div className="err-banner">⚠️ {errMsg}</div>}

      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { val: keys.length, lbl: "Key ทั้งหมด",      color: "var(--accent)"  },
          { val: active,      lbl: "ใช้งานได้",          color: "var(--success)" },
          { val: revoked,     lbl: "ยกเลิก / หมดอายุ", color: "var(--error)"   },
        ].map(s => (
          <div key={s.lbl} className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{loading ? "—" : s.val}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {expiringSoon.length > 0 && (
        <div className="card card-warning animate-in">
          <div className="card-title">ใกล้หมดอายุใน 7 วัน — {expiringSoon.length} ราย</div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            ทักลูกค้าไปต่ออายุก่อนโปรแกรมหยุดทำงาน
          </p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr>{["Key","Note","หมดอายุ","เหลือ",""].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {expiringSoon.map(r => (
                  <tr key={r.key}>
                    <td><span className="key-mono">{r.key}</span></td>
                    <td className="wrap">{r.note || "—"}</td>
                    <td>{r.expires_at}</td>
                    <td style={{ fontWeight: 700 }}>{daysLeft(r.expires_at!)} วัน</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => renew(r.key, r.expires_at)}>
                        ต่ออายุ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Key ล่าสุด</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr>{["Key","Note","หมดอายุ","HWID","สถานะ"].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 32 }}>⏳ กำลังโหลด...</td></tr>
              ) : keys.slice(0,10).length ? keys.slice(0,10).map(r => (
                <tr key={r.key}>
                  <td><span className="key-mono">{r.key}</span></td>
                  <td className="wrap">{r.note || "—"}</td>
                  <td>{r.expires_at}</td>
                  <td><span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{r.hwid ? r.hwid.slice(0,8)+"…" : "—"}</span></td>
                  <td><StatusBadge row={r} /></td>
                </tr>
              )) : (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 32 }}>ยังไม่มี Key</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>🔄 รีเฟรช</button>
        </div>
      </div>
    </div>
  )
}
