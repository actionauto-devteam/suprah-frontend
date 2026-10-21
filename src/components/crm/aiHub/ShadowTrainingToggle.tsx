"use client"

import * as React from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api-client"
import { AI_CHANNEL_LABELS, type AiModesPayload } from "@/lib/aiOperatingModes"

export function ShadowTrainingToggle({ data, isAdmin, getToken, onSaved }: {
  data: AiModesPayload
  isAdmin: boolean
  getToken: () => Promise<string | null>
  onSaved: (data: AiModesPayload) => void
}) {
  const shadow = data.shadowDrafts
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [target, setTarget] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  if (!shadow) return null

  const orgOn = shadow.orgEnabled
  const effectivelyOn = orgOn && shadow.globalEnabled && data.masterSwitchOn
  const activeLabels = shadow.activeChannels.map((channel) => AI_CHANNEL_LABELS[channel])

  const askToChange = (enabled: boolean) => {
    setTarget(enabled)
    setReason("")
    setConfirmOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      const res = await apiClient.patch(
        "/api/crm/ai-modes/shadow-drafts",
        { enabled: target, ...(reason.trim() ? { reason: reason.trim() } : {}) },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      onSaved((res.data?.data || res.data) as AiModesPayload)
      setConfirmOpen(false)
      toast.success(target ? "Shadow Training turned on" : "Shadow Training turned off")
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error("Save failed", { description: message || "Could not change Shadow Training. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Shadow Training</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/70">
            Alex writes a private practice draft for each new customer message on channels in Training. Drafts are never sent and only managers and admins can see them.
          </p>
        </div>
        <Switch
          checked={orgOn}
          disabled={!isAdmin || saving}
          onCheckedChange={(checked) => askToChange(checked)}
          aria-label="Shadow Training"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={effectivelyOn
          ? "rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300"
          : "rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"}
        >
          {effectivelyOn ? "Active" : orgOn ? "On, but inactive" : "Off"}
        </span>
        {effectivelyOn && (
          <span className="text-muted-foreground">
            {activeLabels.length ? `Drafting on: ${activeLabels.join(", ")}` : "No channel is in Training, so no drafts are being made."}
          </span>
        )}
      </div>

      {!shadow.globalEnabled && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Shadow Training is turned off for this whole server, so no drafts are made{orgOn ? " even though it is on for this organization" : ""}. Your choice here is saved and takes effect once the server setting is enabled.
          </span>
        </div>
      )}
      {shadow.globalEnabled && !data.masterSwitchOn && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-slate-300/60 bg-slate-500/5 p-3 text-[11px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          AI is switched off for this whole server, so no drafts are made.
        </div>
      )}
      {!isAdmin && <p className="text-[11px] text-muted-foreground/70">Only admins can change Shadow Training.</p>}

      <Dialog open={confirmOpen} onOpenChange={(open) => !saving && setConfirmOpen(open)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{target ? "Turn on Shadow Training?" : "Turn off Shadow Training?"}</DialogTitle>
            <DialogDescription>
              {target
                ? `Alex will write up to ${shadow.dailyLimit} private drafts a day for channels in Training. Nothing is sent to customers.`
                : "Alex will stop writing private drafts. Existing drafts stay available until they expire."}
            </DialogDescription>
          </DialogHeader>
          {target && !shadow.globalEnabled && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
              The server setting is off, so this stays inactive until it is enabled.
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="shadow-toggle-reason" className="text-xs font-semibold">Reason (optional)</label>
            <Textarea id="shadow-toggle-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} className="resize-none" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : target ? "Turn on" : "Turn off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
