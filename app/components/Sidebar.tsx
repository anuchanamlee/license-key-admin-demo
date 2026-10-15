"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { SettingsModal } from "./SettingsBar"

const NAV = [
  { href: "/dashboard", icon: "grid", label: "Dashboard" },
  { href: "/create",    icon: "plus", label: "สร้าง Key" },
  { href: "/keys",      icon: "list", label: "รายการ Key" },
]

function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const s: React.CSSProperties = { width: size, height: size, strokeWidth: 2, fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (name === "grid") return (
    <svg viewBox="0 0 24 24" style={s}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
  if (name === "plus") return (
    <svg viewBox="0 0 24 24" style={s}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
  if (name === "list") return (
    <svg viewBox="0 0 24 24" style={s}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="13" y2="16" />
    </svg>
  )
  if (name === "settings") return (
    <svg viewBox="0 0 24 24" style={s}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
  if (name === "collapse") return (
    <svg viewBox="0 0 24 24" style={s}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
  if (name === "key") return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
  return null
}

export { NavIcon }

interface SidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export default function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const path = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)

  function toggle() {
    onCollapsedChange(!collapsed)
  }

  return (
    <>
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? "20px 12px" : "20px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          minHeight: 68,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent), #05C896)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <NavIcon name="key" size={18} />
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>License Admin</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Management System</div>
            </div>
          )}
        </div>

        {/* Toggle */}
        <div style={{ padding: "12px 12px 4px" }}>
          <button
            onClick={toggle}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              background: "transparent", border: "none", color: "var(--text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8, fontSize: 12, transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
            title={collapsed ? "ขยาย" : "ย่อ"}
          >
            <NavIcon name="collapse" size={16} />
            {!collapsed && <span>ย่อเมนู</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "8px 12px", flex: 1 }}>
          {!collapsed && (
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 12px 6px", marginBottom: 2 }}>
              เมนูหลัก
            </div>
          )}
          {NAV.map(n => {
            const active = path === n.href
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
                style={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "10px 0" : "10px 12px",
                }}
                title={collapsed ? n.label : undefined}
              >
                <div className="sidebar-icon">
                  <NavIcon name={n.icon} size={18} />
                </div>
                {!collapsed && <span>{n.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer — Settings */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setSettingsOpen(true)}
            className="sidebar-link"
            style={{
              width: "100%", border: "none", cursor: "pointer", background: "transparent",
              fontFamily: "inherit", fontSize: 13,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "10px 0" : "10px 12px",
            }}
            title={collapsed ? "ตั้งค่า" : undefined}
          >
            <div className="sidebar-icon">
              <NavIcon name="settings" size={18} />
            </div>
            {!collapsed && <span>ตั้งค่า</span>}
          </button>
          {!collapsed && (
            <div style={{ padding: "8px 12px 4px", fontSize: 11, color: "var(--text-muted)" }}>
              v2.0 Premium
            </div>
          )}
        </div>
      </aside>

      {settingsOpen ? <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} /> : null}
    </>
  )
}
