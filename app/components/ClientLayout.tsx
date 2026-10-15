"use client"

import type { ReactNode } from "react"
import { ToastProvider } from "./Toast"
import DemoBadge from "./DemoBadge"

/** Only what both audiences need. The admin shell lives in app/(admin)/layout. */
export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <DemoBadge />
    </ToastProvider>
  )
}
