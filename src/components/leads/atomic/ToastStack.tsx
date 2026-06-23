import * as React from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { fmtTime } from "@/lib/lead-utils"

export interface Toast {
  id: string
  type: "success" | "error" | "info"
  message: string
  ts: Date
}

interface ToastStackProps {
  toasts: Toast[]
  dismiss: (id: string) => void
}

const VARIANT = {
  success: {
    cls:  "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-800 dark:text-emerald-200",
    sub:  "text-emerald-600/70 dark:text-emerald-400/60",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  },
  error: {
    cls:  "border-red-500/30 bg-red-50 dark:bg-red-950/60",
    text: "text-red-800 dark:text-red-200",
    sub:  "text-red-600/70 dark:text-red-400/60",
    icon: <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />,
  },
  info: {
    cls:  "border-sky-500/30 bg-sky-50 dark:bg-sky-950/60",
    text: "text-sky-800 dark:text-sky-200",
    sub:  "text-sky-600/70 dark:text-sky-400/60",
    icon: <Info className="h-4 w-4 text-sky-500 shrink-0" />,
  },
}

export const ToastStack = React.memo(({ toasts, dismiss }: ToastStackProps) => (
  <div
    className="fixed inset-x-4 sm:left-auto sm:right-5 z-50 space-y-2 sm:max-w-sm pointer-events-none"
    style={{ top: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
  >
    {toasts.map((t) => {
      const v = VARIANT[t.type]
      return (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-top-3 duration-200 ${v.cls}`}
        >
          {v.icon}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${v.text}`}>{t.message}</p>
            <p className={`text-[10px] mt-0.5 ${v.sub}`}>{fmtTime(t.ts)}</p>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className={`flex items-center justify-center h-8 w-8 -m-1.5 -mr-2 shrink-0 transition-opacity opacity-60 hover:opacity-100 ${v.text}`}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    })}
  </div>
))

ToastStack.displayName = "ToastStack"
