"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, Loader2, Plus, ShieldCheck, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { trainingErrorMessage, trainingRequest } from "@/hooks/useAiTraining"
import {
  TRAINING_RULE_CATEGORIES,
  TRAINING_RULE_CHANNELS,
  TRAINING_RULE_HANDLING,
  TRAINING_RULE_LIMITS as L,
  emptyTrainingRule,
  type TrainingProposalDetail,
  type TrainingRuleChannel,
  type TrainingRuleEvaluation,
  type TrainingRuleInput,
  type TrainingRuleIssue,
} from "@/lib/aiTraining"

export type TrainingRuleEditorTarget =
  | { mode: "create" }
  | { mode: "edit"; proposalId: string; expectedVersion: number; initial: TrainingRuleInput; reviewEdit: boolean }

const toLines = (items: string[]) => items.join("\n")
const fromLines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean)

interface FormState extends Omit<TrainingRuleInput, "triggers" | "requiredQuestions" | "mustInclude" | "mustAvoid"> {
  triggers: string
  requiredQuestions: string
  mustInclude: string
  mustAvoid: string
}

function toForm(rule: TrainingRuleInput): FormState {
  return {
    ...rule,
    triggers: toLines(rule.triggers),
    requiredQuestions: toLines(rule.requiredQuestions),
    mustInclude: toLines(rule.mustInclude),
    mustAvoid: toLines(rule.mustAvoid),
    examples: rule.examples.map((example) => ({ ...example })),
    escalation: { ...rule.escalation },
  }
}

function toPayload(form: FormState): TrainingRuleInput {
  return {
    ...form,
    triggers: fromLines(form.triggers),
    requiredQuestions: fromLines(form.requiredQuestions),
    mustInclude: fromLines(form.mustInclude),
    mustAvoid: fromLines(form.mustAvoid),
    examples: form.examples.filter((example) => example.customerMessage.trim() || example.idealReply.trim()),
  }
}

function issuesFor(issues: TrainingRuleIssue[], field: string) {
  return issues.filter((issue) => issue.field === field || issue.field.startsWith(`${field}.`))
}

function FieldIssues({ errors, warnings, field }: { errors: TrainingRuleIssue[]; warnings: TrainingRuleIssue[]; field: string }) {
  const fieldErrors = issuesFor(errors, field)
  const fieldWarnings = issuesFor(warnings, field)
  if (!fieldErrors.length && !fieldWarnings.length) return null
  return (
    <ul className="mt-1 space-y-0.5 text-[11px]">
      {fieldErrors.map((issue, index) => <li key={`e${index}`} className="text-red-600 dark:text-red-400">{issue.message}</li>)}
      {fieldWarnings.map((issue, index) => <li key={`w${index}`} className="text-amber-700 dark:text-amber-300">{issue.message}</li>)}
    </ul>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

export function TrainingRuleEditor({ target, getToken, onClose, onSaved }: {
  target: TrainingRuleEditorTarget | null
  getToken: () => Promise<string | null>
  onClose: () => void
  onSaved: (detail: TrainingProposalDetail) => void
}) {
  const [form, setForm] = React.useState<FormState>(() => toForm(emptyTrainingRule()))
  const [changeNote, setChangeNote] = React.useState("")
  const [evaluation, setEvaluation] = React.useState<TrainingRuleEvaluation | null>(null)
  const [previewing, setPreviewing] = React.useState(false)
  const [busy, setBusy] = React.useState<"draft" | "submit" | null>(null)
  const getTokenRef = React.useRef(getToken)

  React.useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  React.useEffect(() => {
    if (!target) return
    setForm(toForm(target.mode === "edit" ? target.initial : emptyTrainingRule()))
    setChangeNote("")
    setEvaluation(null)
  }, [target])

  const payload = React.useMemo(() => toPayload(form), [form])

  React.useEffect(() => {
    if (!target) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setPreviewing(true)
      try {
        const result = await trainingRequest<TrainingRuleEvaluation>(getTokenRef.current, "post", "/api/crm/ai-training/rules/preview", { rule: payload })
        if (!cancelled) setEvaluation(result)
      } catch {
        if (!cancelled) setEvaluation(null)
      } finally {
        if (!cancelled) setPreviewing(false)
      }
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [payload, target])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))
  const errors = evaluation?.errors || []
  const warnings = evaluation?.warnings || []
  const reviewEdit = target?.mode === "edit" && target.reviewEdit

  const toggleChannel = (channel: TrainingRuleChannel) => {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel) ? current.channels.filter((value) => value !== channel) : [...current.channels, channel],
    }))
  }

  const updateExample = (index: number, key: "customerMessage" | "idealReply", value: string) => {
    setForm((current) => ({
      ...current,
      examples: current.examples.map((example, position) => (position === index ? { ...example, [key]: value } : example)),
    }))
  }

  const save = async (submit: boolean) => {
    if (!target) return
    setBusy(submit ? "submit" : "draft")
    try {
      let detail: TrainingProposalDetail
      if (target.mode === "create") {
        detail = await trainingRequest<TrainingProposalDetail>(getToken, "post", "/api/crm/ai-training/proposals", { rule: payload, submit })
      } else {
        detail = await trainingRequest<TrainingProposalDetail>(getToken, "put", `/api/crm/ai-training/proposals/${target.proposalId}`, {
          rule: payload,
          expectedVersion: target.expectedVersion,
          changeNote: changeNote.trim() || undefined,
        })
        if (submit) {
          detail = await trainingRequest<TrainingProposalDetail>(getToken, "post", `/api/crm/ai-training/proposals/${target.proposalId}/submit`, {
            expectedVersion: detail.currentVersion,
          })
        }
      }
      toast.success(submit ? "Sent for review" : reviewEdit ? "New version saved" : "Draft saved")
      onSaved(detail)
    } catch (err) {
      const serverIssues = (err as { response?: { data?: { errors?: TrainingRuleIssue[] } } })?.response?.data?.errors
      if (Array.isArray(serverIssues) && serverIssues.length) {
        setEvaluation((current) => current ? { ...current, errors: serverIssues, readyToSubmit: false } : current)
      }
      toast.error(submit ? "Could not submit" : "Could not save", { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(null)
    }
  }

  const canSaveDraft = form.title.trim().length >= 3 && form.instruction.trim().length > 0 && !busy
  const canSubmit = Boolean(evaluation?.readyToSubmit) && !busy && !previewing
  const title = target?.mode === "create" ? "New training rule" : reviewEdit ? "Edit during review" : "Edit training rule"

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">{title}</SheetTitle>
          <SheetDescription className="text-xs">
            Describe how the AI Agent should handle a common customer inquiry. Rules are proposals; the AI Agent does not use them until a later release publishes approved rules.
          </SheetDescription>
        </SheetHeader>

        <form className="space-y-5 px-4 py-5 sm:px-6" onSubmit={(event) => event.preventDefault()} aria-label="Training rule">
          <div className="flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-[11px] text-sky-800 dark:text-sky-200">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Mandatory checks always run first. Requests for a person, questions about talking to AI, opt-outs, compliance limits and technical failures pause the AI Agent no matter what a rule says.</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rule-title" label="Rule title">
              <Input id="rule-title" value={form.title} maxLength={L.title} onChange={(event) => set("title", event.target.value)} placeholder="Sedan versus SUV questions" />
              <FieldIssues errors={errors} warnings={warnings} field="title" />
            </Field>
            <Field id="rule-category" label="Category" hint="Facts and FAQs will live in a separate Knowledge area.">
              <select id="rule-category" className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm" value={form.category} onChange={(event) => set("category", event.target.value)}>
                {TRAINING_RULE_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
          </div>

          <Field id="rule-intent" label="Customer intent" hint='Finish the sentence "When a customer…"'>
            <Input id="rule-intent" value={form.intent} maxLength={L.intent} onChange={(event) => set("intent", event.target.value)} placeholder="is deciding between a sedan and an SUV" />
            <FieldIssues errors={errors} warnings={warnings} field="intent" />
          </Field>

          <Field id="rule-triggers" label="Scenario triggers" hint={`One per line, up to ${L.triggers}. What the customer says or asks.`}>
            <Textarea id="rule-triggers" rows={3} value={form.triggers} onChange={(event) => set("triggers", event.target.value)} className="resize-y" placeholder={"asks whether a sedan or SUV fits their family\ncompares cargo space"} />
            <FieldIssues errors={errors} warnings={warnings} field="triggers" />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold">Preferred handling</legend>
            <div className="grid gap-2">
              {TRAINING_RULE_HANDLING.map((option) => (
                <label key={option.value} className={cn("flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs", form.handling === option.value ? "border-primary bg-primary/5" : "border-border/60")}>
                  <input type="radio" name="rule-handling" value={option.value} checked={form.handling === option.value} onChange={() => set("handling", option.value)} className="mt-0.5" />
                  <span>
                    <span className="font-semibold">{option.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldIssues errors={errors} warnings={warnings} field="handling" />
          </fieldset>

          <Field id="rule-instruction" label="Response guidance" hint="How the AI Agent should respond in this situation.">
            <Textarea id="rule-instruction" rows={4} maxLength={L.instruction} value={form.instruction} onChange={(event) => set("instruction", event.target.value)} className="resize-y" />
            <p className="text-right text-[10px] text-muted-foreground">{form.instruction.length}/{L.instruction}</p>
            <FieldIssues errors={errors} warnings={warnings} field="instruction" />
          </Field>

          <Field id="rule-questions" label="Required follow-up questions" hint={`One per line, up to ${L.questions}.`}>
            <Textarea id="rule-questions" rows={2} value={form.requiredQuestions} onChange={(event) => set("requiredQuestions", event.target.value)} className="resize-y" />
            <FieldIssues errors={errors} warnings={warnings} field="requiredQuestions" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rule-include" label="Information to include" hint={`One per line, up to ${L.include}.`}>
              <Textarea id="rule-include" rows={3} value={form.mustInclude} onChange={(event) => set("mustInclude", event.target.value)} className="resize-y" />
              <FieldIssues errors={errors} warnings={warnings} field="mustInclude" />
            </Field>
            <Field id="rule-avoid" label="Information to avoid" hint={`One per line, up to ${L.avoid}.`}>
              <Textarea id="rule-avoid" rows={3} value={form.mustAvoid} onChange={(event) => set("mustAvoid", event.target.value)} className="resize-y" />
              <FieldIssues errors={errors} warnings={warnings} field="mustAvoid" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rule-escalation-when" label="Escalation conditions" hint="When the AI Agent should hand off.">
              <Textarea id="rule-escalation-when" rows={2} maxLength={L.escalationWhen} value={form.escalation.when} onChange={(event) => set("escalation", { ...form.escalation, when: event.target.value })} className="resize-y" />
              <FieldIssues errors={errors} warnings={warnings} field="escalation.when" />
            </Field>
            <Field id="rule-handoff-reason" label="Handoff reason" hint="What staff see on the handoff.">
              <Input id="rule-handoff-reason" maxLength={L.handoffReason} value={form.escalation.handoffReason} onChange={(event) => set("escalation", { ...form.escalation, handoffReason: event.target.value })} />
              <FieldIssues errors={errors} warnings={warnings} field="escalation.handoffReason" />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold">Channels</legend>
            <div className="flex flex-wrap gap-3">
              {TRAINING_RULE_CHANNELS.map((option) => (
                <label key={option.value} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={form.channels.includes(option.value)} onChange={() => toggleChannel(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
            <FieldIssues errors={errors} warnings={warnings} field="channels" />
          </fieldset>

          <section aria-labelledby="rule-examples" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 id="rule-examples" className="text-xs font-semibold">Examples ({form.examples.length}/{L.examples})</h3>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={form.examples.length >= L.examples}
                onClick={() => set("examples", [...form.examples, { customerMessage: "", idealReply: "" }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add example
              </Button>
            </div>
            {form.examples.map((example, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-border/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">Example {index + 1}</span>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2" aria-label={`Remove example ${index + 1}`}
                    onClick={() => set("examples", form.examples.filter((_, position) => position !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Field id={`rule-example-${index}-customer`} label="Customer message">
                  <Textarea id={`rule-example-${index}-customer`} rows={2} maxLength={L.exampleMessage} value={example.customerMessage} onChange={(event) => updateExample(index, "customerMessage", event.target.value)} className="resize-y" />
                </Field>
                <Field id={`rule-example-${index}-reply`} label="Ideal response">
                  <Textarea id={`rule-example-${index}-reply`} rows={2} maxLength={L.exampleReply} value={example.idealReply} onChange={(event) => updateExample(index, "idealReply", event.target.value)} className="resize-y" />
                </Field>
                <FieldIssues errors={errors} warnings={warnings} field={`examples.${index}`} />
              </div>
            ))}
          </section>

          {target?.mode === "edit" && (
            <Field id="rule-change-note" label={reviewEdit ? "What you changed (required)" : "What changed (optional)"}>
              <Input id="rule-change-note" maxLength={L.changeNote} value={changeNote} onChange={(event) => setChangeNote(event.target.value)} />
            </Field>
          )}

          <section aria-labelledby="rule-preview" className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <h3 id="rule-preview" className="text-xs font-bold">Preview</h3>
              <span className="text-[10px] text-muted-foreground">No AI is used. This is exactly what reviewers will see.</span>
              {previewing && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            {evaluation ? (
              <>
                <p className="text-sm font-medium" data-testid="rule-preview-headline">{evaluation.preview.headline}</p>
                <p className="text-[11px] text-muted-foreground">{evaluation.preview.channels.join(" · ") || "No channel chosen"} · {evaluation.preview.handlingLabel}</p>
                {evaluation.preview.sections.map((section) => (
                  <div key={section.label} className="text-xs">
                    <p className="font-semibold">{section.label}</p>
                    <ul className="ml-4 list-disc text-muted-foreground">
                      {section.items.map((item, index) => <li key={index} className="break-words">{item}</li>)}
                    </ul>
                  </div>
                ))}
                {evaluation.preview.examples.map((example, index) => (
                  <div key={index} className="space-y-1 rounded-lg border border-border/50 bg-background p-2 text-xs">
                    <p className="break-words"><span className="font-semibold">Customer:</span> {example.customerMessage}</p>
                    <p className="break-words"><span className="font-semibold">AI Agent:</span> {example.idealReply}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {example.checks.map((check) => (
                        <span key={check.channel} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                          check.ok ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-amber-300 text-amber-700 dark:text-amber-300")}
                        >
                          {check.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {TRAINING_RULE_CHANNELS.find((option) => option.value === check.channel)?.label}: {check.ok ? "passes safety checks" : `would be blocked (${check.reasons.join(", ")})`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">{evaluation.preview.activationNotice}</p>
                {errors.length > 0 ? (
                  <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-700 dark:text-red-300">
                    <p className="flex items-center gap-1 font-semibold"><XCircle className="h-3.5 w-3.5" /> Fix before submitting ({errors.length})</p>
                    <ul className="ml-4 list-disc">{errors.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>
                  </div>
                ) : (
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Ready to submit for review</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{previewing ? "Checking…" : "Start typing to see the preview."}</p>
            )}
          </section>

          <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border/40 bg-background px-4 py-3 sm:-mx-6 sm:px-6">
            <Button type="button" variant="ghost" onClick={onClose} disabled={Boolean(busy)}>Cancel</Button>
            {reviewEdit ? (
              <Button type="button" onClick={() => save(false)} disabled={!canSaveDraft || !changeNote.trim()}>
                {busy === "draft" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save new version
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => save(false)} disabled={!canSaveDraft}>
                  {busy === "draft" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save draft
                </Button>
                <Button type="button" onClick={() => save(true)} disabled={!canSubmit || !canSaveDraft}>
                  {busy === "submit" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Submit for review
                </Button>
              </>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
