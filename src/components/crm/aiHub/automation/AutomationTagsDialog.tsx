"use client"

import * as React from "react"
import { Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { automationError, type Automation } from "@/lib/crmAutomations"

const MAX_TAGS = 20
const MAX_TAG = 30

export function AutomationTagsDialog({ automation, suggestions, onClose, onSave }: {
  automation: Automation | null
  suggestions: string[]
  onClose: () => void
  onSave: (automation: Automation, tags: string[]) => Promise<void>
}) {
  const [tags, setTags] = React.useState<string[]>([])
  const [draft, setDraft] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setTags(automation?.tags || [])
    setDraft("")
    setError(null)
  }, [automation])

  const add = (value: string) => {
    const tag = value.trim().replace(/\s+/g, " ").slice(0, MAX_TAG)
    if (!tag || tags.some((item) => item.toLowerCase() === tag.toLowerCase()) || tags.length >= MAX_TAGS) return
    setTags((current) => [...current, tag])
    setDraft("")
  }

  const save = async () => {
    if (!automation) return
    setSaving(true)
    setError(null)
    try {
      await onSave(automation, tags)
      onClose()
    } catch (err) {
      setError(automationError(err, "Could not save the tags"))
    } finally {
      setSaving(false)
    }
  }

  const unused = suggestions.filter((item) => !tags.some((tag) => tag.toLowerCase() === item.toLowerCase()))

  return (
    <Dialog open={Boolean(automation)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>Tags help you group and filter automations. {automation ? `For "${automation.name}".` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex min-h-9 flex-wrap gap-1.5">
            {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet.</span>}
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
                {tag}
                <button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} aria-label={`Remove ${tag}`} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              add(draft)
            }}
          >
            <label htmlFor="automation-tag-input" className="sr-only">New tag</label>
            <Input id="automation-tag-input" value={draft} maxLength={MAX_TAG} onChange={(event) => setDraft(event.target.value)} placeholder="Type a tag and press Enter" className="h-9 text-sm" />
            <Button type="submit" variant="outline" size="sm" className="h-9" disabled={!draft.trim() || tags.length >= MAX_TAGS}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
          {unused.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">Tags already in use</p>
              <div className="flex flex-wrap gap-1.5">
                {unused.map((tag) => (
                  <button key={tag} type="button" onClick={() => add(tag)} className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] hover:bg-muted">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
