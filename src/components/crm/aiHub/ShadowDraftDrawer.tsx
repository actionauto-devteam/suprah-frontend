"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useShadowDraft } from "@/hooks/useAiShadowDrafts"
import { cn } from "@/lib/utils"
import {
  SHADOW_CHANNEL_LABELS,
  formatLatency,
  formatTokens,
  type ShadowInquiryMessage,
} from "@/lib/aiShadowDrafts"
import { HubState, ShadowStatusBadge, formatHubDate } from "./ShadowStatusBadge"
import { DraftEvaluationSection } from "./DraftEvaluationSection"

const VERDICT_LABELS: Record<string, string> = {
  SAFE: "Passed",
  UNSAFE: "Flagged as unsafe",
  ERROR: "Check unavailable (treated as unsafe)",
  compliant: "Followed coaching",
  violates: "Did not follow coaching",
  not_applicable: "No coaching applied",
  not_checked: "Not checked",
  error: "Coaching check unavailable",
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">{label}</dt>
      <dd className="mt-0.5 break-words text-xs text-foreground">{value}</dd>
    </div>
  )
}

function InquiryMessage({ message }: { message: ShadowInquiryMessage }) {
  const label = message.from === "customer" ? "Customer" : message.from === "ai" ? "AI Agent" : message.staffName || "Team"
  return (
    <li className={cn(
      "rounded-xl border p-3 text-xs",
      message.isSource ? "border-primary/40 bg-primary/5" : "border-border/40 bg-muted/20",
    )}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="font-semibold">{label}{message.isSource ? " · triggered this draft" : ""}</span>
        <span>{formatHubDate(message.at)}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-foreground">{message.body}</p>
    </li>
  )
}

export function ShadowDraftDrawer({ draftId, getToken, onClose, canEvaluate = false }: {
  draftId: string | null
  getToken: () => Promise<string | null>
  onClose: () => void
  canEvaluate?: boolean
}) {
  const { data, loading, error, reload } = useShadowDraft(getToken, draftId)

  return (
    <Sheet open={Boolean(draftId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">Shadow draft</SheetTitle>
          <SheetDescription className="text-xs">A private practice reply. It was never sent to the customer.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-8 sm:px-6">
          <HubState loading={loading} error={error} onRetry={reload}>
            {data && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <ShadowStatusBadge status={data.status} />
                  <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {SHADOW_CHANNEL_LABELS[data.channel]}
                  </span>
                  {data.kind === "vehicle_clarification" && (
                    <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Vehicle question</span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground">{formatHubDate(data.createdAt)}</span>
                </div>

                {data.lead && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{data.lead.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[data.lead.vehicle, data.lead.status, data.lead.source].filter(Boolean).join(" · ") || "Lead details unavailable"}
                      </p>
                    </div>
                    <Link href={`/crm/leads?leadId=${encodeURIComponent(data.lead.id)}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      Open lead <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                <section aria-labelledby="shadow-inquiry-heading" className="space-y-2">
                  <h3 id="shadow-inquiry-heading" className="text-xs font-bold">Customer conversation</h3>
                  {data.inquiry.available && data.inquiry.messages?.length ? (
                    <ol className="space-y-2">
                      {data.inquiry.messages.map((message, index) => <InquiryMessage key={index} message={message} />)}
                    </ol>
                  ) : (
                    <p className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">The original message is no longer available.</p>
                  )}
                </section>

                <section aria-labelledby="shadow-draft-heading" className="space-y-2">
                  <h3 id="shadow-draft-heading" className="text-xs font-bold">What the AI Agent would have said</h3>
                  {data.draftText ? (
                    <p className="whitespace-pre-wrap break-words rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">{data.draftText}</p>
                  ) : (
                    <p className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                      {data.failureReason || data.statusReason || data.handoffReason || "No draft text was produced."}
                    </p>
                  )}
                  {data.handoffReason && data.draftText && (
                    <p className="text-[11px] text-sky-700 dark:text-sky-300">Would hand off to a person: {data.handoffReason}</p>
                  )}
                  {data.wouldHaveBeenCapped && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">In Live mode, the AI Agent would have hit its reply limits on this conversation.</p>
                  )}
                </section>

                <section aria-labelledby="shadow-checks-heading" className="space-y-2">
                  <h3 id="shadow-checks-heading" className="text-xs font-bold">Safety and coaching checks</h3>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Fact label="Rule check" value={data.deterministicOk === undefined ? "Not run" : data.deterministicOk ? "Passed" : `Blocked: ${data.deterministicReasons.join(", ") || "rule match"}`} />
                    <Fact label="Safety review" value={data.classifierVerdict ? VERDICT_LABELS[data.classifierVerdict] : "Not run"} />
                    <Fact label="Coaching" value={data.coachingVerdict ? VERDICT_LABELS[data.coachingVerdict] || data.coachingVerdict : "Not run"} />
                    <Fact label="Vehicle" value={data.vehicleResolution ? data.vehicleResolution.replace(/_/g, " ") : "—"} />
                  </dl>
                </section>

                <section aria-labelledby="shadow-usage-heading" className="space-y-2">
                  <h3 id="shadow-usage-heading" className="text-xs font-bold">Generation details</h3>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Fact label="Model" value={data.aiModel || "—"} />
                    <Fact label="Time taken" value={formatLatency(data.latencyMs)} />
                    <Fact label="AI calls" value={typeof data.aiCallCount === "number" ? data.aiCallCount : "—"} />
                    <Fact label="Total tokens" value={formatTokens(data.totalTokens)} />
                    <Fact label="Prompt tokens" value={formatTokens(data.promptTokens)} />
                    <Fact label="Reply tokens" value={formatTokens(data.completionTokens)} />
                  </dl>
                  <p className="text-[11px] text-muted-foreground">Deleted automatically on {formatHubDate(data.expiresAt)}.</p>
                </section>

                {canEvaluate && draftId && <DraftEvaluationSection draftId={draftId} getToken={getToken} />}
              </>
            )}
          </HubState>
        </div>
      </SheetContent>
    </Sheet>
  )
}
