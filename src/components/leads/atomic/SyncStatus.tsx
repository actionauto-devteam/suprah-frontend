import * as React from "react"
import { fmtTime } from "@/lib/lead-utils"

interface SyncStatusProps {
  connected: boolean
  email: string
  sourceEmail: string
  lastSyncTime: Date | null
  statusLoaded: boolean
}

export const SyncStatus = React.memo(({
  connected,
  email,
  sourceEmail,
  lastSyncTime,
  statusLoaded,
}: SyncStatusProps) => {
  if (!statusLoaded) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-amber-500/70">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70 animate-pulse" />
        Checking sync status…
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/60">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        Gmail auto-sync not connected — other lead sources (e.g. ADF) are unaffected
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live sync
      </span>
      <span className="text-muted-foreground/30">·</span>
      <span className="text-muted-foreground truncate max-w-48">{email}</span>
      <span className="text-muted-foreground/30">·</span>
      <span className="hidden font-mono text-[11px] text-muted-foreground/50 sm:block">{sourceEmail}</span>
      {lastSyncTime && (
        <>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground/60">Last checked: {fmtTime(lastSyncTime)}</span>
        </>
      )}
    </div>
  )
})

SyncStatus.displayName = "SyncStatus"
