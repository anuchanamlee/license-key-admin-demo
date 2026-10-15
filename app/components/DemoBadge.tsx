"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/** Small corner badge shown only when the server runs against the in-memory mock. */
export default function DemoBadge() {
  const [demo, setDemo] = useState(false)
  const path = usePathname()

  useEffect(() => {
    let cancelled = false
    fetch("/api/public/mode", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { demo?: boolean } | null) => {
        if (!cancelled && d?.demo) setDemo(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!demo) return null
  return (
    <div
      role="status"
      data-testid="demo-badge"
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 1000,
        maxWidth: 300,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: 1.5,
        background: "var(--surface, #1f2937)",
        color: "var(--text-secondary, #d1d5db)",
        border: "1px solid var(--border, #374151)",
        boxShadow: "0 2px 8px rgba(0,0,0,.25)",
      }}
    >
      <strong>Demo data</strong> · in memory, resets on restart
      {path === "/login" ? " · password: demo1234" : ""}
    </div>
  )
}
