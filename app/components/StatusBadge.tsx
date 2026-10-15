import { LicenseKey } from "@/app/lib/types"

export function getStatus(row: LicenseKey): "active" | "expired" | "revoked" | "pending" {
  if (row.revoked) return "revoked"
  if (!row.expires_at) return "pending"
  const today = new Date().toISOString().slice(0, 10)
  if (row.expires_at < today) return "expired"
  return "active"
}

export default function StatusBadge({ row }: { row: LicenseKey }) {
  const status = getStatus(row)
  if (status === "revoked") return <span className="badge badge-revoked">ยกเลิกแล้ว</span>
  if (status === "pending") return <span className="badge badge-pending">ยังไม่ใช้งาน</span>
  if (status === "expired") return <span className="badge badge-expired">หมดอายุ</span>
  const today = new Date().toISOString().slice(0, 10)
  const d = Math.ceil(
    (new Date(row.expires_at!).getTime() - new Date(today).getTime()) / 86_400_000
  )
  return <span className="badge badge-active">เหลือ {d} วัน</span>
}
