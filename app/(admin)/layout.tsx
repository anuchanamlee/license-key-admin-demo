"use client"

import type { CSSProperties, ReactNode } from "react"
import { useState } from "react"
import Sidebar from "@/app/components/Sidebar"

/**
 * Admin shell. Everything rendered under app/(admin) sits behind the session
 * check in proxy.ts - the navigation lives here and nowhere else, so a page
 * that is meant for customers cannot pick it up by accident.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("sidebar_collapsed") === "true"
  })

  function handleCollapsedChange(next: boolean) {
    setCollapsed(next)
    localStorage.setItem("sidebar_collapsed", String(next))
  }

  const shellStyle = {
    "--layout-sidebar-offset": collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-w)",
  } as CSSProperties

  return (
    <div className="app-shell" style={shellStyle}>
      <Sidebar collapsed={collapsed} onCollapsedChange={handleCollapsedChange} />
      <div className="app-shell-content">
        <main className="page-shell">{children}</main>
      </div>
    </div>
  )
}
