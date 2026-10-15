"use client"
import { useState } from "react"
import { adminApi } from "@/app/lib/admin-api"
import { CreateResult, SystemType } from "@/app/lib/types"
import SettingsBar from "@/app/components/SettingsBar"
import { useToast } from "@/app/components/Toast"

function buildMessage(data: CreateResult, days: number, note: string) {
  const systemName = data.system_type === "SORTER" ? "Sorter Bot" : "Captcha Collector"
  return `สวัสดีครับ คุณ${note} 🎮\n\n✅ License Key สำหรับ ${systemName}\n━━━━━━━━━━━━━━━━━━━━━\n🔑  ${data.key}\n━━━━━━━━━━━━━━━━━━━━━\n📅 ใช้ได้ ${days} วัน (หมดอายุ ${data.expires_at})\n🎲 ระบบ: ${systemName}\n\nวิธีใช้:\n1. เปิดโปรแกรม\n2. ใส่ Key แล้วกด ยืนยัน\n3. ใช้งานได้เลย ✨\n\nหากมีปัญหาติดต่อได้เลยนะครับ`
}

export default function CreatePage() {
  const [note,        setNote]        = useState("")
  const [days,        setDays]        = useState(30)
  const [customDays,  setCustomDays]  = useState("")
  const [usePinput,   setUseCustom]   = useState(false)
  const [systemType,  setSystemType]  = useState<SystemType>("CAPTCHA")
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<CreateResult | null>(null)
  const [errMsg,      setErrMsg]      = useState("")
  const [msgText,     setMsgText]     = useState("")
  const { toast } = useToast()

  async function createKey() {
    if (!note.trim()) { toast("ใส่ชื่อลูกค้าก่อน", "error"); return }
    const finalDays = usePinput ? (customDays ? parseInt(customDays) : 30) : days
    if (isNaN(finalDays) || finalDays <= 0) { toast("จำนวนวันต้องเป็นตัวเลขที่มากกว่า 0", "error"); return }
    setLoading(true); setErrMsg(""); setResult(null)
    try {
      const data = await adminApi.create(finalDays, note.trim(), systemType)
      setResult(data); setMsgText(buildMessage(data, finalDays, note.trim()))
      toast("สร้าง Key สำเร็จ ✓", "success")
      setTimeout(() => document.getElementById("share-section")?.scrollIntoView({ behavior: "smooth" }), 100)
    } catch (e: unknown) {
      setErrMsg((e as Error).message)
      toast((e as Error).message, "error")
    } finally { setLoading(false) }
  }

  function copy(text: string, label: string) { navigator.clipboard.writeText(text); toast(label, "success") }

  async function createTestKey() {
    const testNote = `TEST-${new Date().toISOString().slice(0, 10)}`
    setLoading(true); setErrMsg(""); setResult(null)
    try {
      const data = await adminApi.create(1, testNote, "SORTER")
      setResult(data); setMsgText(buildMessage(data, 1, testNote))
      toast("สร้าง Test Key SORTER สำเร็จ ✓", "success")
      setTimeout(() => document.getElementById("share-section")?.scrollIntoView({ behavior: "smooth" }), 100)
    } catch (e: unknown) {
      setErrMsg((e as Error).message)
      toast((e as Error).message, "error")
    } finally { setLoading(false) }
  }

  return (
    <div>
      <SettingsBar />
      <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>สร้าง License Key</p>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>สร้าง key ใหม่เพื่อส่งให้ลูกค้า</p>

      <div className="card">
        <div className="card-title">ข้อมูล Key</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>ชื่อลูกค้า / หมายเหตุ</label>
            <input className="input" placeholder="เช่น นายสมชาย หรือ LINE: xxx"
              value={note} onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createKey()} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>จำนวนวัน</label>
            {!usePinput ? (
              <select className="input" value={days} onChange={e => setDays(+e.target.value)}
                style={{ background: "var(--bg)" }}>
                {[1, 7, 30, 90, 180, 365].map(d => <option key={d} value={d}>{d} วัน</option>)}
              </select>
            ) : (
              <input className="input" type="number" placeholder="ระบุจำนวนวัน"
                value={customDays} onChange={e => setCustomDays(e.target.value)} min="1" />
            )}
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => { setUseCustom(!usePinput); setCustomDays("") }}>
              {usePinput ? "← เลือกจาก preset" : "พิมพ์เองแทน →"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>ประเภทระบบ</label>
            <select className="input" value={systemType} onChange={e => setSystemType(e.target.value as SystemType)}
              style={{ background: "var(--bg)" }}>
              <option value="CAPTCHA">🤖 Captcha Collector</option>
              <option value="SORTER">📦 Sorter Bot</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={createKey} disabled={loading}>
            {loading ? "⏳ กำลังสร้าง..." : "สร้าง Key"}
          </button>
          <button className="btn btn-secondary" onClick={createTestKey} disabled={loading}>
            📦 Test Key (1 วัน)
          </button>
        </div>

        {errMsg && <div className="result-box" style={{ color: "var(--error)", borderColor: "var(--error)" }}>❌ {errMsg}</div>}
        {result && (
          <div className="result-box" style={{ color: "var(--success)" }}>
            {`✓ สร้างสำเร็จ\nKey:       ${result.key}\nหมดอายุ:  ${result.expires_at}\nระบบ:     ${result.system_type}\nNote:      ${result.note}`}
          </div>
        )}
      </div>

      {result && (
        <div id="share-section">
          <div className="card">
            <div className="card-title">ส่งให้ลูกค้า</div>
            <div className="share-card">
              <div>
                <div className="key-big">{result.key}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  หมดอายุ {result.expires_at} · {usePinput ? customDays : days} วัน · {note} · {result.system_type}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-ghost" onClick={() => copy(result.key, "คัดลอก Key แล้ว ✓")}>📋 คัดลอก Key</button>
                <button className="btn btn-ghost" onClick={() => copy(msgText, "คัดลอกข้อความแล้ว ✓")}>💬 คัดลอกข้อความ</button>
              </div>
            </div>
            <div className="divider" />
            <div className="card-title">ข้อความสำเร็จรูป</div>
            <textarea rows={8} className="input" style={{ lineHeight: 1.6, resize: "vertical" }}
              value={msgText} onChange={e => setMsgText(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  )
}