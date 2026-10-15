"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!password) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        setError(data.message ?? "เข้าสู่ระบบไม่สำเร็จ")
        setPassword("")
        return
      }
      const next = params.get("next")
      router.replace(next && next.startsWith("/") ? next : "/dashboard")
      router.refresh()
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell" style={{ maxWidth: 380 }}>
      <div className="auth-brand">
        <span className="auth-mark" aria-hidden>🔑</span>
        <div>
          <div className="page-title">License Admin</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>สำหรับผู้ดูแลระบบเท่านั้น</div>
        </div>
      </div>

      <div className="card animate-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="label" htmlFor="admin-password">รหัสผ่านผู้ดูแล</label>
          <input
            id="admin-password"
            className="input"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void submit() }}
            placeholder="••••••••"
          />
        </div>

        {error ? <div className="result result-bad" role="alert">{error}</div> : null}

        <button
          className="btn btn-primary"
          onClick={() => void submit()}
          disabled={busy || !password}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
        ลูกค้าที่ต้องการย้ายเครื่อง ไปที่หน้า{" "}
        <a href="/reset" style={{ color: "var(--accent)" }}>ย้ายเครื่อง</a>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
