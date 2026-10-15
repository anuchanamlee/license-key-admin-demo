import type { ReactNode } from "react"

/**
 * Pages a customer (or a not-yet-signed-in admin) can reach. No navigation
 * into the admin area, and nothing here may import from app/lib/admin-api.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <main className="page-shell">{children}</main>
}
