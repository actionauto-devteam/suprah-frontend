"use client"

import * as React from "react"
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"
import { useAiOperatingModes } from "@/hooks/useAiOperatingModes"
import {
  AI_CHANNELS,
  AI_CHANNEL_LABELS,
  AI_LIVE_CONFIRMATION_PHRASE,
  AI_MODE_LABELS,
  AI_SELECTABLE_MODES,
  describeAiMode,
  type AiChannel,
  type AiMode,
  type AiModesPayload,
} from "@/lib/aiOperatingModes"

const MODE_STYLES: Record<AiMode, string> = {
  off: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  training: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  testing: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  live: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
}

export function summarizeAiModes(data: AiModesPayload | null): { label: string; tone: "live" | "training" | "off" } {
  if (!data) return { label: "Loading", tone: "off" }
  const modes = AI_CHANNELS.map((channel) => data.effective[channel])
  if (modes.every((mode) => mode === "off")) return { label: "Off", tone: "off" }
  if (modes.some((mode) => mode === "live")) {
    return modes.every((mode) => mode === "live") ? { label: "Live", tone: "live" } : { label: "Partly live", tone: "live" }
  }
  return { label: "Training", tone: "training" }
}

export function AiOperatingModesPanel({
  getToken,
  isAdmin,
  agentName,
  onSummaryChange,
}: {
  getToken: () => Promise<string | null>
  isAdmin: boolean
  agentName: string
  onSummaryChange?: (data: AiModesPayload | null) => void
}) {
  const { data, setData, loading, error } = useAiOperatingModes(getToken)
  const [draft, setDraft] = React.useState<Record<AiChannel, AiMode> | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState("")
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (data) setDraft({ ...data.modes })
    onSummaryChange?.(data)
  }, [data, onSummaryChange])

  const canEdit = isAdmin && Boolean(data?.canEdit)
  const changedChannels = React.useMemo(() => {
    if (!data || !draft) return [] as AiChannel[]
    return AI_CHANNELS.filter((channel) => data.source === "legacy" || draft[channel] !== data.modes[channel])
  }, [data, draft])
  const goingLive = React.useMemo(() => {
    if (!data || !draft) return [] as AiChannel[]
    return changedChannels.filter((channel) => draft[channel] === "live" && (data.source === "legacy" || data.modes[channel] !== "live"))
  }, [changedChannels, data, draft])

  const submit = async (confirmLive?: string, liveReason?: string) => {
    if (!draft) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await apiClient.patch(
        "/api/crm/ai-modes",
        { modes: draft, ...(confirmLive ? { confirmLive, reason: liveReason } : {}) },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setData((res.data?.data || res.data) as AiModesPayload)
      setConfirmOpen(false)
      setConfirmText("")
      setReason("")
      toast.success("AI operating modes saved")
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error("Save failed", { description: message || "Could not save the AI operating modes. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    if (goingLive.length) {
      setConfirmOpen(true)
      return
    }
    void submit()
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading AI operating modes…
      </div>
    )
  }

  if (!data || !draft) {
    return <p className="text-xs text-red-600 dark:text-red-400">{error || "Could not load AI operating modes."}</p>
  }

  return (
    <div className="space-y-3 max-w-xl">
      <div>
        <label className="text-sm font-semibold text-foreground">Operating mode</label>
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed mt-0.5">
          Training keeps {agentName} from sending anything to customers. Only Live sends automatic replies.
        </p>
      </div>

      {!data.masterSwitchOn && (
        <div className="flex items-start gap-2 rounded-lg border border-slate-300/60 bg-slate-500/5 p-3 text-[11px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          AI is switched off for this whole server, so every channel is off no matter what is selected here.
        </div>
      )}

      {data.source === "legacy" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          These channels still follow the old on/off switch. Save once to set each channel explicitly.
        </div>
      )}

      <div className="divide-y divide-border/40 rounded-xl border border-border/40">
        {AI_CHANNELS.map((channel) => (
          <div key={channel} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{AI_CHANNEL_LABELS[channel]}</p>
              <p className="text-[11px] text-muted-foreground/70">{describeAiMode(draft[channel], agentName)}</p>
            </div>
            <div role="radiogroup" aria-label={`${AI_CHANNEL_LABELS[channel]} mode`} className="flex shrink-0 gap-1">
              {AI_SELECTABLE_MODES.map((mode) => {
                const selected = draft[channel] === mode || (mode === "training" && draft[channel] === "testing")
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!canEdit || saving}
                    onClick={() => setDraft((prev) => (prev ? { ...prev, [channel]: mode } : prev))}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                      selected ? MODE_STYLES[mode] : "border-border/50 bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {AI_MODE_LABELS[mode]}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground/70">
        Customer-attention checks today: {data.usageToday?.attention_screen || 0}
      </p>

      {canEdit && (
        <Button
          onClick={handleSave}
          disabled={saving || !changedChannels.length}
          className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save operating modes"}
        </Button>
      )}

      {data.recentChanges.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Recent changes</p>
          <ul className="space-y-1">
            {data.recentChanges.slice(0, 5).map((change) => (
              <li key={change.id} className="text-[11px] text-muted-foreground">
                {new Date(change.createdAt).toLocaleString()} · {AI_CHANNEL_LABELS[change.channel]}:{" "}
                {AI_MODE_LABELS[change.fromMode] || change.fromMode} → {AI_MODE_LABELS[change.toMode] || change.toMode}
                {change.changedByName ? ` by ${change.changedByName}` : ""}
                {change.reason ? ` — ${change.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={(open) => !saving && setConfirmOpen(open)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Turn on live AI replies?
            </DialogTitle>
            <DialogDescription>
              {agentName} will start replying to real customers on: {goingLive.map((channel) => AI_CHANNEL_LABELS[channel]).join(", ")}.
              Make sure Podium AI is turned off for these customers first, so nobody gets two automatic replies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Reason</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="Why is this going live now?"
                className="min-h-20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Type {AI_LIVE_CONFIRMATION_PHRASE} to confirm</label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={AI_LIVE_CONFIRMATION_PHRASE} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit(confirmText.trim(), reason.trim())}
              disabled={saving || confirmText.trim() !== AI_LIVE_CONFIRMATION_PHRASE || reason.trim().length < 5}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Turn on live replies"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
