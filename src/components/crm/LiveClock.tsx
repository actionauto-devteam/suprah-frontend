"use client"
import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const MDT_OFFSET_MS = -6 * 60 * 60 * 1000
const toMDT = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS)

export function LiveClock() {
  const [now, setNow] = React.useState(new Date())
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const mdtNow = toMDT(now)
  const timeStr = mdtNow.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group relative inline-flex items-center gap-2.5 rounded-full px-4 py-2 cursor-default select-none overflow-hidden border border-emerald-200/80 dark:border-emerald-500/20 bg-linear-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 backdrop-blur-sm hover:border-emerald-300/80 dark:hover:border-emerald-400/30 transition-all duration-300">
            <div className="absolute inset-0 bg-linear-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            </span>
            <span className="font-mono text-xs font-bold tabular-nums tracking-wide text-emerald-700 dark:text-emerald-400">
              {timeStr}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
        >
          <p className="text-xs">
            {mdtNow.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
