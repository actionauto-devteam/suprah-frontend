"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { knowledgeErrorIssues, knowledgeErrorMessage, knowledgeRequest } from "@/hooks/useAiKnowledgeBase"
import {
  KB_CHANNEL_LABELS,
  KB_CHANNELS,
  KB_KIND_LABELS,
  KB_KINDS,
  KB_TOPIC_LABELS,
  KB_TOPICS,
  type KbChannel,
  type KbEntryDetail,
  type KbIssue,
  type KbKind,
  type KbLocation,
  type KbTopic,
} from "@/lib/aiKnowledgeBase"
import { KbFieldErrors, KbIssueList, KbLocationPicker, issuesFor, scopeFromPicker } from "./KnowledgeShared"

export type KbEditorTarget = { mode: "create" } | { mode: "edit"; detail: KbEntryDetail }

const KNOWN_FIELDS = ["kind", "topic", "question", "title", "answer", "channels", "locations", "changeNote"]

export function KnowledgeEntryEditor({ target, locations, getToken, onClose, onSaved }: {
  target: KbEditorTarget | null
  locations: KbLocation[]
  getToken: () => Promise<string | null>
  onClose: () => void
  onSaved: (detail: KbEntryDetail) => void
}) {
  const [kind, setKind] = React.useState<KbKind>("faq")
  const [topic, setTopic] = React.useState<KbTopic | "">("")
  const [question, setQuestion] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [answer, setAnswer] = React.useState("")
  const [channels, setChannels] = React.useState<KbChannel[]>([...KB_CHANNELS])
  const [scope, setScope] = React.useState<{ scope: "" | "all" | "locations"; locationIds: string[] }>({ scope: "", locationIds: [] })
  const [changeNote, setChangeNote] = React.useState("")
  const [issues, setIssues] = React.useState<KbIssue[]>([])
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!target) return
    setIssues([])
    setChangeNote("")
    if (target.mode === "create") {
      setKind("faq")
      setTopic("")
      setQuestion("")
      setTitle("")
      setAnswer("")
      setChannels([...KB_CHANNELS])
      setScope({ scope: "", locationIds: [] })
      return
    }
    const content = target.detail.current?.content
    setKind(target.detail.entry.kind)
    setTopic(content?.topic || target.detail.entry.topic)
    setQuestion(content?.question || "")
    setTitle(content?.title || target.detail.entry.title)
    setAnswer(content?.answer || "")
    setChannels(content?.channels?.length ? content.channels : [...KB_CHANNELS])
    setScope(content ? { scope: content.locationScope.scope, locationIds: content.locationScope.locationIds } : { scope: "", locationIds: [] })
  }, [target])

  const editing = target?.mode === "edit" ? target.detail : null
  const otherIssues = issues.filter((issue) => !KNOWN_FIELDS.some((field) => issue.field === field || issue.field.startsWith(`${field}.`)))

  const save = async () => {
    if (!target) return
    setBusy(true)
    setIssues([])
    const body: Record<string, unknown> = {
      topic: topic || undefined,
      question: question.trim() || undefined,
      title: title.trim() || undefined,
      answer,
      channels,
      locations: scopeFromPicker(scope),
      changeNote: changeNote.trim() || undefined,
    }
    try {
      const detail = editing
        ? await knowledgeRequest<KbEntryDetail>(getToken, "put", `/entries/${editing.entry.id}`, { ...body, expectedVersion: editing.entry.currentVersion })
        : await knowledgeRequest<KbEntryDetail>(getToken, "post", "/entries", { ...body, kind })
      toast.success(editing ? "New version saved" : "Draft saved")
      onSaved(detail)
    } catch (err) {
      setIssues(knowledgeErrorIssues(err))
      toast.error("Could not save", { description: knowledgeErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(false)
    }
  }

  const reviewEdit = editing?.entry.status === "in_review"
  const revision = editing?.entry.status === "approved"

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">{editing ? "Edit entry" : "New Knowledge Base entry"}</SheetTitle>
          <SheetDescription className="text-xs">
            Saved as a draft. A manager or admin reviews it before it is approved. Approved entries are not used by the AI Agent yet.
          </SheetDescription>
        </SheetHeader>

        <form className="space-y-5 px-4 py-5 sm:px-6" onSubmit={(event) => { event.preventDefault(); void save() }} aria-label="Knowledge Base entry">
          {reviewEdit && (
            <p className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-[11px] text-sky-800 dark:text-sky-200">
              This entry is waiting for review. Your edit becomes the version under review, and you won&apos;t be able to approve it yourself.
            </p>
          )}
          {revision && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-800 dark:text-amber-200">
              Saving starts a new draft revision. The approved version stays as it is until the revision is approved.
            </p>
          )}
          <KbIssueList issues={otherIssues} title="Fix these before saving" />

          {!editing ? (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold">Type</legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                {KB_KINDS.map((value) => (
                  <label key={value} className="flex items-center gap-2 text-xs">
                    <input type="radio" name="kb-kind" checked={kind === value} disabled={busy} onChange={() => setKind(value)} />
                    {KB_KIND_LABELS[value]}
                  </label>
                ))}
              </div>
              <KbFieldErrors issues={issuesFor(issues, "kind")} />
            </fieldset>
          ) : (
            <p className="text-xs"><span className="font-semibold">Type:</span> {KB_KIND_LABELS[editing.entry.kind]}</p>
          )}

          <div className="space-y-1">
            <label htmlFor="kb-topic" className="text-xs font-semibold">Topic</label>
            <select
              id="kb-topic"
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs"
              value={topic}
              disabled={busy}
              onChange={(event) => setTopic(event.target.value as KbTopic)}
              aria-invalid={issuesFor(issues, "topic").length > 0}
            >
              <option value="">Choose a topic</option>
              {KB_TOPICS.map((value) => <option key={value} value={value}>{KB_TOPIC_LABELS[value]}</option>)}
            </select>
            <KbFieldErrors issues={issuesFor(issues, "topic")} />
          </div>

          <div className="space-y-1">
            <label htmlFor="kb-question" className="text-xs font-semibold">
              Customer question{kind === "business_info" ? " (optional)" : ""}
            </label>
            <Input
              id="kb-question"
              value={question}
              maxLength={300}
              disabled={busy}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What are your Saturday hours?"
              aria-invalid={issuesFor(issues, "question").length > 0}
            />
            <KbFieldErrors issues={issuesFor(issues, "question")} />
          </div>

          <div className="space-y-1">
            <label htmlFor="kb-title" className="text-xs font-semibold">
              Title{kind === "faq" ? " (optional, defaults to the question)" : ""}
            </label>
            <Input
              id="kb-title"
              value={title}
              maxLength={120}
              disabled={busy}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={kind === "faq" ? "" : "Showroom hours"}
              aria-invalid={issuesFor(issues, "title").length > 0}
            />
            <KbFieldErrors issues={issuesFor(issues, "title")} />
          </div>

          <div className="space-y-1">
            <label htmlFor="kb-answer" className="text-xs font-semibold">Answer</label>
            <p className="text-[11px] text-muted-foreground">
              No prices, payments, rates, deposits, trade-in values, discounts or availability promises. Contact details and programs must be approved first.
            </p>
            <Textarea
              id="kb-answer"
              rows={5}
              value={answer}
              maxLength={1000}
              disabled={busy}
              onChange={(event) => setAnswer(event.target.value)}
              className="resize-y"
              aria-invalid={issuesFor(issues, "answer").length > 0}
            />
            <p className="text-right text-[10px] text-muted-foreground">{answer.length}/1000</p>
            <KbFieldErrors issues={issuesFor(issues, "answer")} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold">Channels</legend>
            <div className="flex flex-wrap gap-4">
              {KB_CHANNELS.map((value) => (
                <label key={value} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={channels.includes(value)}
                    disabled={busy}
                    onChange={(event) => setChannels((current) => event.target.checked ? Array.from(new Set([...current, value])) : current.filter((item) => item !== value))}
                  />
                  {KB_CHANNEL_LABELS[value]}
                </label>
              ))}
            </div>
            <KbFieldErrors issues={issuesFor(issues, "channels")} />
          </fieldset>

          <KbLocationPicker idPrefix="kb-entry" value={scope} onChange={setScope} locations={locations} disabled={busy} issues={issuesFor(issues, "locations")} />

          <div className="space-y-1">
            <label htmlFor="kb-change-note" className="text-xs font-semibold">Change note (optional)</label>
            <Input id="kb-change-note" value={changeNote} maxLength={500} disabled={busy} onChange={(event) => setChangeNote(event.target.value)} placeholder="What changed and why" />
            <KbFieldErrors issues={issuesFor(issues, "changeNote")} />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/40 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" size="sm" disabled={busy || !answer.trim()}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save new version" : "Save draft"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
