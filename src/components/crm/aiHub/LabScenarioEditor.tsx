"use client"

import * as React from "react"
import { CheckCircle2, Loader2, Plus, ShieldAlert, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { trainingErrorMessage, trainingRequest } from "@/hooks/useAiTraining"
import { TRAINING_RULE_CHANNELS } from "@/lib/aiTraining"
import {
  LAB_EXPECTED_HANDLING,
  LAB_FICTIONAL_NOTICE,
  LAB_SCENARIO_LIMITS as L,
  LAB_TURN_AUTHORS,
  emptyLabScenario,
  labScenarioToInput,
  type LabIssue,
  type LabScenario,
  type LabScenarioInput,
  type LabTurnAuthor,
} from "@/lib/aiTrainingLab"

export type LabScenarioEditorTarget = { mode: "create" } | { mode: "edit"; scenario: LabScenario }

const toLines = (items: string[]) => items.join("\n")
const fromLines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean)

interface FormState extends Omit<LabScenarioInput, "expectation" | "tags"> {
  expectation: Omit<LabScenarioInput["expectation"], "mustAsk" | "mustInclude" | "mustAvoid"> & { mustAsk: string; mustInclude: string; mustAvoid: string }
  tags: string
}

function toForm(input: LabScenarioInput): FormState {
  return {
    ...input,
    turns: input.turns.map((turn) => ({ ...turn })),
    flags: { ...input.flags },
    expectation: {
      ...input.expectation,
      mustAsk: toLines(input.expectation.mustAsk),
      mustInclude: toLines(input.expectation.mustInclude),
      mustAvoid: toLines(input.expectation.mustAvoid),
    },
    tags: input.tags.join(", "),
  }
}

function toPayload(form: FormState): LabScenarioInput {
  return {
    ...form,
    turns: form.turns.filter((turn) => turn.body.trim()),
    expectation: {
      ...form.expectation,
      mustAsk: fromLines(form.expectation.mustAsk),
      mustInclude: fromLines(form.expectation.mustInclude),
      mustAvoid: fromLines(form.expectation.mustAvoid),
    },
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
  }
}

function FieldIssues({ issues, field }: { issues: { errors: LabIssue[]; warnings: LabIssue[] }; field: string }) {
  const match = (issue: LabIssue) => issue.field === field || issue.field.startsWith(`${field}.`)
  const errors = issues.errors.filter(match)
  const warnings = issues.warnings.filter(match)
  if (!errors.length && !warnings.length) return null
  return (
    <ul className="mt-1 space-y-0.5 text-[11px]">
      {errors.map((issue, index) => <li key={`e${index}`} className="text-red-600 dark:text-red-400">{issue.message}</li>)}
      {warnings.map((issue, index) => <li key={`w${index}`} className="text-amber-700 dark:text-amber-300">{issue.message}</li>)}
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

export function LabScenarioEditor({ target, getToken, onClose, onSaved }: {
  target: LabScenarioEditorTarget | null
  getToken: () => Promise<string | null>
  onClose: () => void
  onSaved: (scenario: LabScenario) => void
}) {
  const [form, setForm] = React.useState<FormState>(() => toForm(emptyLabScenario()))
  const [changeNote, setChangeNote] = React.useState("")
  const [issues, setIssues] = React.useState<{ errors: LabIssue[]; warnings: LabIssue[] }>({ errors: [], warnings: [] })
  const [checking, setChecking] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const getTokenRef = React.useRef(getToken)

  React.useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  React.useEffect(() => {
    if (!target) return
    setForm(toForm(target.mode === "edit" ? labScenarioToInput(target.scenario) : emptyLabScenario()))
    setChangeNote("")
    setIssues({ errors: [], warnings: [] })
  }, [target])

  const payload = React.useMemo(() => toPayload(form), [form])

  React.useEffect(() => {
    if (!target) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setChecking(true)
      try {
        const result = await trainingRequest<{ errors: LabIssue[]; warnings: LabIssue[] }>(getTokenRef.current, "post", "/api/crm/ai-training/lab/scenarios/check", { scenario: payload })
        if (!cancelled) setIssues(result)
      } catch {
        if (!cancelled) setIssues({ errors: [], warnings: [] })
      } finally {
        if (!cancelled) setChecking(false)
      }
    }, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [payload, target])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))
  const setExpectation = <K extends keyof FormState["expectation"]>(key: K, value: FormState["expectation"][K]) =>
    setForm((current) => ({ ...current, expectation: { ...current.expectation, [key]: value } }))
  const updateTurn = (index: number, patch: Partial<{ from: LabTurnAuthor; body: string }>) =>
    setForm((current) => ({ ...current, turns: current.turns.map((turn, position) => (position === index ? { ...turn, ...patch } : turn)) }))

  const save = async () => {
    if (!target) return
    setBusy(true)
    try {
      const data = target.mode === "create"
        ? await trainingRequest<{ scenario: LabScenario; warnings: LabIssue[] }>(getToken, "post", "/api/crm/ai-training/lab/scenarios", { scenario: payload })
        : await trainingRequest<{ scenario: LabScenario; warnings: LabIssue[] }>(getToken, "put", `/api/crm/ai-training/lab/scenarios/${target.scenario.id}`, {
          scenario: payload,
          expectedRevision: target.scenario.revision,
          changeNote: changeNote.trim() || undefined,
        })
      toast.success(target.mode === "create" ? "Scenario saved" : "Scenario updated", data.warnings?.length ? { description: data.warnings[0].message } : undefined)
      onSaved(data.scenario)
    } catch (err) {
      const serverIssues = (err as { response?: { data?: { errors?: LabIssue[] } } })?.response?.data?.errors
      if (Array.isArray(serverIssues) && serverIssues.length) setIssues((current) => ({ ...current, errors: serverIssues }))
      toast.error("Could not save the scenario", { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(false)
    }
  }

  const canSave = form.title.trim().length >= L.titleMin && form.message.trim().length > 0 && Boolean(form.expectation.handling) && !issues.errors.length && !busy && !checking
  const isSms = form.channel === "sms"

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">{target?.mode === "edit" ? "Edit scenario" : "New scenario"}</SheetTitle>
          <SheetDescription className="text-xs">A made-up customer situation your team can test training rules against. Scenarios are shared with your organization.</SheetDescription>
        </SheetHeader>

        <form className="space-y-5 px-4 py-5 sm:px-6" onSubmit={(event) => { event.preventDefault(); void save() }} aria-label="Scenario">
          <div role="note" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-900 dark:text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span><span className="font-semibold">Fictional data only.</span> {LAB_FICTIONAL_NOTICE} The server rejects anything that looks real.</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lab-title" label="Scenario title">
              <Input id="lab-title" value={form.title} maxLength={L.title} onChange={(event) => set("title", event.target.value)} placeholder="Family of five, sedan or SUV" />
              <FieldIssues issues={issues} field="title" />
            </Field>
            <Field id="lab-channel" label="Channel">
              <select id="lab-channel" className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm" value={form.channel} onChange={(event) => set("channel", event.target.value as FormState["channel"])}>
                {TRAINING_RULE_CHANNELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <FieldIssues issues={issues} field="channel" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lab-customer" label="Customer name (optional)" hint="Made up, for example Riley Example.">
              <Input id="lab-customer" value={form.customerName} maxLength={L.customerName} onChange={(event) => set("customerName", event.target.value)} />
              <FieldIssues issues={issues} field="customerName" />
            </Field>
            <Field id="lab-vehicle" label="Vehicle interest (optional)" hint="A general description, never a VIN.">
              <Input id="lab-vehicle" value={form.vehicleInterest} maxLength={L.vehicleInterest} onChange={(event) => set("vehicleInterest", event.target.value)} placeholder="2022 midsize SUV" />
              <FieldIssues issues={issues} field="vehicleInterest" />
            </Field>
          </div>

          <section aria-labelledby="lab-turns" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 id="lab-turns" className="text-xs font-semibold">Earlier messages ({form.turns.length}/{L.turns})</h3>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={form.turns.length >= L.turns}
                onClick={() => set("turns", [...form.turns, { from: "customer", body: "" }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add message
              </Button>
            </div>
            {form.turns.map((turn, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-xl border border-border/50 p-2.5 sm:flex-row sm:items-start">
                <select aria-label={`Message ${index + 1} sender`} className="h-9 rounded-md border border-input bg-background px-2 text-xs sm:w-28" value={turn.from} onChange={(event) => updateTurn(index, { from: event.target.value as LabTurnAuthor })}>
                  {LAB_TURN_AUTHORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Textarea aria-label={`Message ${index + 1}`} rows={2} maxLength={L.turnBody} value={turn.body} onChange={(event) => updateTurn(index, { body: event.target.value })} className="min-w-0 flex-1 resize-y" />
                <Button type="button" size="sm" variant="ghost" className="h-8 self-end px-2 sm:self-start" aria-label={`Remove message ${index + 1}`}
                  onClick={() => set("turns", form.turns.filter((_, position) => position !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <FieldIssues issues={issues} field={`turns.${index}`} />
              </div>
            ))}
          </section>

          <Field id="lab-message" label="Customer message being tested" hint="The newest message Alex would respond to.">
            <Textarea id="lab-message" rows={3} maxLength={L.message} value={form.message} onChange={(event) => set("message", event.target.value)} className="resize-y" placeholder="Should I get a sedan or an SUV for my family of five?" />
            <p className="text-right text-[10px] text-muted-foreground">{form.message.length}/{L.message}</p>
            <FieldIssues issues={issues} field="message" />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold">Situation</legend>
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" className="mt-0.5" checked={form.flags.hasUpcomingAppointment} onChange={(event) => set("flags", { ...form.flags, hasUpcomingAppointment: event.target.checked })} />
              <span>The customer has an upcoming appointment</span>
            </label>
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" className="mt-0.5" checked={form.flags.previouslyOptedOut} onChange={(event) => set("flags", { ...form.flags, previouslyOptedOut: event.target.checked })} />
              <span>The customer replied STOP earlier and has not opted back in</span>
            </label>
            {!isSms && <p className="text-[11px] text-muted-foreground">STOP, START and appointment keyword checks apply to SMS only.</p>}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold">What should happen</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LAB_EXPECTED_HANDLING.map((option) => (
                <label key={option.value} className={cn("flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs", form.expectation.handling === option.value ? "border-primary bg-primary/5" : "border-border/60")}>
                  <input type="radio" name="lab-handling" className="mt-0.5" checked={form.expectation.handling === option.value} onChange={() => setExpectation("handling", option.value)} />
                  <span>
                    <span className="font-semibold">{option.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldIssues issues={issues} field="expectation.handling" />
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="lab-must-ask" label="Alex must ask" hint={`One per line, up to ${L.listItems}.`}>
              <Textarea id="lab-must-ask" rows={3} value={form.expectation.mustAsk} onChange={(event) => setExpectation("mustAsk", event.target.value)} className="resize-y" />
              <FieldIssues issues={issues} field="expectation.mustAsk" />
            </Field>
            <Field id="lab-must-include" label="Reply must include" hint={`One per line, up to ${L.includeItems}.`}>
              <Textarea id="lab-must-include" rows={3} value={form.expectation.mustInclude} onChange={(event) => setExpectation("mustInclude", event.target.value)} className="resize-y" />
              <FieldIssues issues={issues} field="expectation.mustInclude" />
            </Field>
            <Field id="lab-must-avoid" label="Reply must avoid" hint={`One per line, up to ${L.includeItems}.`}>
              <Textarea id="lab-must-avoid" rows={3} value={form.expectation.mustAvoid} onChange={(event) => setExpectation("mustAvoid", event.target.value)} className="resize-y" />
              <FieldIssues issues={issues} field="expectation.mustAvoid" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lab-notes" label="Notes for testers (optional)">
              <Textarea id="lab-notes" rows={2} maxLength={L.notes} value={form.expectation.notes} onChange={(event) => setExpectation("notes", event.target.value)} className="resize-y" />
              <FieldIssues issues={issues} field="expectation.notes" />
            </Field>
            <Field id="lab-tags" label="Tags (optional)" hint={`Separate with commas, up to ${L.tags}.`}>
              <Input id="lab-tags" value={form.tags} onChange={(event) => set("tags", event.target.value)} placeholder="family, body style" />
              <FieldIssues issues={issues} field="tags" />
            </Field>
          </div>

          {target?.mode === "edit" && (
            <Field id="lab-change-note" label="What changed (optional)" hint="Every save keeps the earlier revision in the history.">
              <Input id="lab-change-note" maxLength={L.changeNote} value={changeNote} onChange={(event) => setChangeNote(event.target.value)} />
            </Field>
          )}

          <div aria-live="polite" className="text-[11px]">
            {checking ? (
              <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</span>
            ) : issues.errors.length ? (
              <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-red-700 dark:text-red-300">
                <p className="flex items-center gap-1 font-semibold"><XCircle className="h-3.5 w-3.5" /> Fix before saving ({issues.errors.length})</p>
                <ul className="ml-4 list-disc">{issues.errors.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>
              </div>
            ) : form.message.trim() ? (
              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> No real-looking customer data found</span>
            ) : null}
          </div>

          <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border/40 bg-background px-4 py-3 sm:-mx-6 sm:px-6">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={!canSave}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} {target?.mode === "edit" ? "Save changes" : "Save scenario"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
