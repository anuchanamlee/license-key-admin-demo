"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/app/lib/admin-api"
import { useToast } from "./Toast"
import Modal from "./Modal"

type Status = "idle" | "ok" | "err" | "loading"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

/**
 * The admin secret used to be typed in here and kept in localStorage, next to
 * a copy hardcoded in the client bundle. Both are gone: the secret lives in
 * the server environment and is attached inside /api/license/*, so there is
 * nothing here to configure - only a connection to check.
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [label, setLabel] = useState("ยังไม่ได้ทดสอบ")
  const { toast } = useToast()

  async function test() {
    setStatus("loading")
    setLabel("กำลังทดสอบ...")
    try {
      const data = await adminApi.list()
      setStatus("ok")
      setLabel(`เชื่อมต่อสำเร็จ (${data.length} keys)`)
      toast("เชื่อมต่อ API สำเร็จ", "success")
    } catch (e: unknown) {
      setStatus("err")
      setLabel("เชื่อมต่อไม่ได้")
      toast((e as Error).message, "error")
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  const dotClass =
    status === "ok" ? "status-dot-ok" :
    status === "err" ? "status-dot-err" :
    status === "loading" ? "status-dot-loading" : "status-dot-idle"

  return (
    <Modal open={open} onClose={onClose} title="ตั้งค่าระบบ" large>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          ปลายทาง API และ admin secret ตั้งเป็น environment variable ที่ฝั่งเซิร์ฟเวอร์
          (<code>LICENSE_API_URL</code>, <code>ADMIN_SECRET</code>) — ไม่ได้เก็บไว้ในเบราว์เซอร์แล้ว
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 8,
            background: "var(--bg)",
            border: "1px solid var(--border)",
          }}
        >
          <span className={`status-dot ${dotClass}`} />
          <span
            style={{
              fontSize: 13,
              color: status === "ok" ? "var(--accent)" : status === "err" ? "var(--danger)" : "var(--text-secondary)",
            }}
          >
            {label}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button className="btn btn-ghost" onClick={() => void logout()}>ออกจากระบบ</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
            <button className="btn btn-primary" onClick={() => void test()} disabled={status === "loading"}>
              {status === "loading" ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function SettingsBar() {
  const [open, setOpen] = useState(false)

  // Anyone who opened the old dashboard still has the leaked secret sitting in
  // their browser storage. Drop it on sight.
  useEffect(() => {
    try {
      localStorage.removeItem("api_secret")
      localStorage.removeItem("api_url")
    } catch {}
  }, [])

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            System Settings
          </span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Check the licence API connection, or sign out.
          </span>
        </div>
        <button className="btn btn-ghost" onClick={() => setOpen(true)}>
          Open Settings
        </button>
      </div>
      {open ? <SettingsModal open={open} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
