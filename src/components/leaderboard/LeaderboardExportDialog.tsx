"use client"

import * as React from "react"
import { Download, FileSpreadsheet, FileText, FileType2, Loader2, Phone, ListChecks } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api-client"
import {
  buildExportBlob,
  downloadBlob,
  exportFileName,
  type ExportFormat,
  type ExportScope,
  type LeaderboardRecords,
} from "./leaderboard-export"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  authHeaders: Record<string, string>
  periodParams: Record<string, string>
  periodLabel: string
  rankBy: string
}

const SCOPES: Array<{ value: ExportScope; label: string; help: string; icon: React.ReactNode }> = [
  { value: "calls", label: "Call counts", help: "Calls per team member, the 12 to 8 PM checkpoints, and every call.", icon: <Phone className="h-4 w-4" /> },
  { value: "full", label: "Full record", help: "Everything on the Leaderboard: calls, messages, leads, appointments, sales, customers and every activity.", icon: <ListChecks className="h-4 w-4" /> },
]

const FORMATS: Array<{ value: ExportFormat; label: string; help: string; icon: React.ReactNode }> = [
  { value: "csv", label: "CSV", help: "Opens in Excel or Google Sheets", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { value: "doc", label: "Word", help: "Opens in Word or Google Docs", icon: <FileType2 className="h-4 w-4" /> },
  { value: "pdf", label: "PDF", help: "Ready to print or send", icon: <FileText className="h-4 w-4" /> },
]

function errorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof message === "string" && message ? message : "Could not prepare the file. Please try again."
}

export function LeaderboardExportDialog({ open, onOpenChange, authHeaders, periodParams, periodLabel, rankBy }: Props) {
  const [scope, setScope] = React.useState<ExportScope>("calls")
  const [format, setFormat] = React.useState<ExportFormat>("csv")
  const [busy, setBusy] = React.useState(false)

  const handleDownload = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiClient.get("/api/analytics/records", {
        headers: authHeaders,
        params: { ...periodParams, scope, rankBy },
      })
      const records: LeaderboardRecords = res.data?.data
      if (!records) throw new Error("empty")
      const blob = await buildExportBlob(records, format)
      downloadBlob(blob, exportFileName(records, format))
      toast.success("Your file is ready", { description: "Check your browser downloads." })
      onOpenChange(false)
    } catch (error) {
      toast.error("Download failed", { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const choice = (selected: boolean) =>
    `flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
      selected ? "border-emerald-500/60 bg-emerald-500/10" : "border-border/60 hover:bg-muted/40"
    }`

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Download records</DialogTitle>
          <DialogDescription>{periodLabel} · Mountain Time (Denver)</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">What to include</p>
            {SCOPES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={choice(scope === item.value)}
                onClick={() => setScope(item.value)}
                aria-pressed={scope === item.value}
              >
                <span className="mt-0.5 text-emerald-500">{item.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.help}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">File type</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`${choice(format === item.value)} flex-col items-center text-center`}
                  onClick={() => setFormat(item.value)}
                  aria-pressed={format === item.value}
                >
                  <span className="text-emerald-500">{item.icon}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">{item.help}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDownload} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? "Preparing" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
