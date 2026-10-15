"use client"

import { useState } from "react"
import { customerApi } from "@/app/lib/customer-api"
import { ResetResult, SystemType } from "@/app/lib/types"

const KEY_FORMAT = /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/

/** Typing the key by hand is the whole interaction, so shape it as it is typed. */
function formatKeyInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 16)
  return cleaned.replace(/(.{4})(?=.)/g, "$1-")
}

function thaiTime(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ""
  return at.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function CustomerResetPage() {
  const [key, setKey] = useState("")
  const [system, setSystem] = useState<SystemType>("SORTER")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ResetResult | null>(null)
  const [error, setError] = useState("")

  const keyValid = KEY_FORMAT.test(key)

  async function submit() {
    if (!keyValid || busy) return
    setBusy(true)
    setError("")
    setResult(null)
    try {
      setResult(await customerApi.selfReset(key, system))
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <span className="auth-mark" aria-hidden>⇄</span>
        <div>
          <div className="page-title">ย้ายไปใช้เครื่องใหม่</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>ทำเองได้ วันละ 1 ครั้ง</div>
        </div>
      </div>

      {result ? (
        <div className="card card-accent animate-in">
          <div className="card-title" style={{ marginBottom: 8 }}>
            <span>✓ {result.message}</span>
          </div>
          <ol className="steps" style={{ marginTop: 14, marginBottom: 14 }}>
            <li>เปิดโปรแกรมที่เครื่องใหม่</li>
            <li>ใส่ Key เดิม แล้วกด Activate</li>
            <li>ใช้งานได้ตามปกติ วันหมดอายุเท่าเดิม</li>
          </ol>
          <div className="result result-ok">
            วันนี้ปลดได้อีก <strong>{result.resets_left_today}</strong> ครั้ง
            {result.resets_left_today === 0 && result.next_reset_available_at
              ? ` · ครั้งถัดไปหลัง ${thaiTime(result.next_reset_available_at)} น.`
              : ""}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => { setResult(null); setKey("") }}
          >
            ปลดคีย์อื่นอีก
          </button>
        </div>
      ) : (
        <div className="card animate-in">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label" htmlFor="license-key">License Key ของคุณ</label>
              <input
                id="license-key"
                className="input"
                value={key}
                onChange={(e) => setKey(formatKeyInput(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") void submit() }}
                placeholder="ABCD-1234-EF56-7890"
                style={{ fontFamily: "monospace", letterSpacing: 2, fontSize: 16, textAlign: "center" }}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="key-hint"
              />
              <p id="key-hint" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                {key.length === 0
                  ? "คีย์เดียวกับที่ใส่ในโปรแกรม (16 ตัว)"
                  : keyValid ? "รูปแบบถูกต้อง" : `ใส่ครบ 16 ตัว (ตอนนี้ ${key.replace(/-/g, "").length})`}
              </p>
            </div>

            <div>
              <label className="label" htmlFor="system-type">โปรแกรมที่ใช้</label>
              <select
                id="system-type"
                className="input"
                value={system}
                onChange={(e) => setSystem(e.target.value as SystemType)}
              >
                <option value="SORTER">SORTER</option>
                <option value="CAPTCHA">CAPTCHA</option>
              </select>
            </div>

            {error ? (
              <div className="result result-bad" role="alert">{error}</div>
            ) : null}

            <button
              className="btn btn-primary"
              onClick={() => void submit()}
              disabled={!keyValid || busy}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {busy ? "กำลังปลดเครื่องเดิม..." : "ปลดเครื่องเดิม"}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">ก่อนกด</div>
        <ol className="steps">
          <li><strong>ปิดโปรแกรมที่เครื่องเก่าก่อน</strong> — ถ้าไม่ปิด มันจะยังใช้ได้อีกพักหนึ่งแล้วหยุดเอง ระบบมองเห็นว่ามีสองเครื่องเปิดอยู่</li>
          <li>เครื่องใหม่เปิดใช้ได้ทันที ไม่ต้องรอ</li>
          <li>วันหมดอายุไม่เปลี่ยน ย้ายเครื่องกี่ครั้งก็เท่าเดิม</li>
        </ol>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
        ปลดได้วันละ 1 ครั้ง · ถ้าต้องย้ายมากกว่านั้นให้ติดต่อผู้ขาย
      </p>
    </div>
  )
}
