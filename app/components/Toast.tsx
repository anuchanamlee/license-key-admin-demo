"use client"
import { createContext, useContext, useState, useCallback, ReactNode } from "react"

type ToastType = "success" | "error" | "info"
interface ToastCtx { toast: (msg: string, type?: ToastType) => void }
const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("")
  const [type, setType] = useState<ToastType>("info")
  const [show, setShow] = useState(false)

  const toast = useCallback((m: string, t: ToastType = "info") => {
    setMsg(m)
    setType(t)
    setShow(true)
    setTimeout(() => setShow(false), 3500)
  }, [])

  const icon = type === "success" ? "\u2713" : type === "error" ? "\u2717" : "i"

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        <div className={`toast toast-${type} ${show ? "toast-show" : "toast-hidden"}`}>
          <div className="toast-icon">{icon}</div>
          <span style={{ flex: 1, lineHeight: 1.4 }}>{msg}</span>
        </div>
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
