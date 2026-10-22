"use client"

import * as React from "react"
import { AlertTriangle, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { locationErrorMessage, locationRequest, useCrmLocation } from "@/hooks/useCrmLocations"
import {
  LOCATION_HISTORY_LABELS,
  locationKeys,
  normalizeLocationKey,
  suggestLocationCode,
  type CrmLocation,
  type CrmLocationIssue,
} from "@/lib/crmLocations"

export type LocationEditorTarget =
  | { mode: "create"; prefill?: { name?: string; aliases?: string[] } }
  | { mode: "edit"; location: CrmLocation; appendAlias?: string }
  | { mode: "view"; location: CrmLocation }

const splitLines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean)

function formatWhen(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

export function LocationEditorSheet({ target, canManage, allLocations, getToken, onClose, onSaved }: {
  target: LocationEditorTarget | null
  canManage: boolean
  allLocations: CrmLocation[]
  getToken: () => Promise<string | null>
  onClose: () => void
  onSaved: (location: CrmLocation) => void
}) {
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [codeTouched, setCodeTouched] = React.useState(false)
  const [aliasesText, setAliasesText] = React.useState("")
  const [issues, setIssues] = React.useState<CrmLocationIssue[]>([])
  const [busy, setBusy] = React.useState(false)
  const existing = target && target.mode !== "create" ? target.location : null
  const detail = useCrmLocation(getToken, existing ? existing.id : null)
  const readOnly = !canManage || target?.mode === "view" || existing?.status === "archived"

  React.useEffect(() => {
    if (!target) return
    setIssues([])
    setCodeTouched(false)
    if (target.mode === "create") {
      const prefillName = target.prefill?.name || ""
      setName(prefillName)
      setCode(suggestLocationCode(prefillName))
      setAliasesText((target.prefill?.aliases || []).join("\n"))
    } else {
      setName(target.location.name)
      setCode(target.location.code)
      const aliases = [...target.location.aliases]
      if (target.mode === "edit" && target.appendAlias && !aliases.some((alias) => normalizeLocationKey(alias) === normalizeLocationKey(target.appendAlias as string))) {
        aliases.push(target.appendAlias)
      }
      setAliasesText(aliases.join("\n"))
    }
  }, [target])

  const aliases = React.useMemo(() => splitLines(aliasesText), [aliasesText])
  const conflicts = React.useMemo(() => {
    if (!target || readOnly) return []
    const keys = locationKeys({ name, code, aliases })
    const found: string[] = []
    for (const other of allLocations) {
      if (existing && other.id === existing.id) continue
      const otherKeys = new Set(locationKeys(other))
      for (const key of keys) {
        if (otherKeys.has(key)) found.push(`"${key}" is already used by ${other.name}${other.status === "archived" ? " (archived)" : ""}.`)
      }
    }
    return Array.from(new Set(found))
  }, [target, readOnly, name, code, aliases, allLocations, existing])

  const fieldIssues = (field: string) => issues.filter((issue) => issue.field === field || issue.field.startsWith(`${field}.`))

  const save = async () => {
    if (!target || readOnly) return
    setBusy(true)
    setIssues([])
    try {
      const data = target.mode === "create"
        ? await locationRequest<{ location: CrmLocation }>(getToken, "post", "/api/crm/locations", { location: { code, name, aliases } })
        : await locationRequest<{ location: CrmLocation; changed: boolean }>(getToken, "patch", `/api/crm/locations/${existing?.id}`, {
          location: { name, aliases },
          expectedRevision: existing?.revision,
        })
      toast.success(target.mode === "create" ? "Location added" : "Location saved")
      onSaved(data.location)
    } catch (err) {
      const serverIssues = (err as { response?: { data?: { errors?: CrmLocationIssue[] } } })?.response?.data?.errors
      if (Array.isArray(serverIssues)) setIssues(serverIssues)
      toast.error("Could not save the location", { description: locationErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(false)
    }
  }

  const title = target?.mode === "create" ? "New location" : readOnly ? "Location" : "Edit location"
  const canSave = !readOnly && !busy && name.trim().length >= 2 && code.trim().length >= 2 && conflicts.length === 0

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">{title}</SheetTitle>
          <SheetDescription className="text-xs">A store or lot of this dealership. Its code stays the same forever, so imported content can always point back to it.</SheetDescription>
        </SheetHeader>

        <form className="space-y-5 px-4 py-5 sm:px-6" onSubmit={(event) => { event.preventDefault(); void save() }} aria-label="Location">
          {existing?.status === "archived" && (
            <p className="rounded-lg border border-slate-400/40 bg-slate-500/5 p-3 text-[11px] text-muted-foreground">This location is archived. Restore it to make changes.</p>
          )}
          {!canManage && <p className="text-[11px] text-muted-foreground">You can view locations. Only admins can change them.</p>}

          <div className="space-y-1">
            <label htmlFor="location-name" className="text-xs font-semibold">Location name</label>
            <Input
              id="location-name"
              value={name}
              maxLength={80}
              disabled={readOnly || busy}
              onChange={(event) => {
                setName(event.target.value)
                if (target?.mode === "create" && !codeTouched) setCode(suggestLocationCode(event.target.value))
              }}
              placeholder="Orem"
            />
            {fieldIssues("name").map((issue, index) => <p key={index} className="text-[11px] text-red-600 dark:text-red-400">{issue.message}</p>)}
          </div>

          <div className="space-y-1">
            <label htmlFor="location-code" className="text-xs font-semibold">Location code</label>
            <p className="text-[11px] text-muted-foreground">Lowercase letters, numbers and hyphens. It can&apos;t be changed after the location is created.</p>
            <div className="flex items-center gap-2">
              <Input
                id="location-code"
                value={code}
                maxLength={40}
                disabled={target?.mode !== "create" || busy}
                onChange={(event) => { setCode(event.target.value.toLowerCase()); setCodeTouched(true) }}
                placeholder="orem"
                className="font-mono"
              />
              {target?.mode !== "create" && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Code is locked" />}
            </div>
            {fieldIssues("code").map((issue, index) => <p key={index} className="text-[11px] text-red-600 dark:text-red-400">{issue.message}</p>)}
          </div>

          <div className="space-y-1">
            <label htmlFor="location-aliases" className="text-xs font-semibold">Other names for this location</label>
            <p className="text-[11px] text-muted-foreground">One per line, up to 20. For example how it appears in Podium, on vehicles or in lead records. Spelling and capitals don&apos;t matter.</p>
            <Textarea
              id="location-aliases"
              rows={4}
              value={aliasesText}
              disabled={readOnly || busy}
              onChange={(event) => setAliasesText(event.target.value)}
              placeholder={"Orem UT\nAction Auto Orem"}
              className="resize-y"
            />
            {fieldIssues("aliases").map((issue, index) => <p key={index} className="text-[11px] text-red-600 dark:text-red-400">{issue.message}</p>)}
          </div>

          {conflicts.length > 0 && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <ul className="space-y-0.5">{conflicts.map((line) => <li key={line}>{line}</li>)}</ul>
            </div>
          )}

          {existing && (
            <section aria-labelledby="location-history" className="space-y-2">
              <h3 id="location-history" className="text-xs font-bold">History</h3>
              {detail.loading && <p className="text-[11px] text-muted-foreground">Loading…</p>}
              {detail.error && <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{detail.error}</p>}
              {detail.data && (
                <ol className="space-y-1.5">
                  {detail.data.history.map((entry) => (
                    <li key={entry.id} className="text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Revision {entry.revision} · {LOCATION_HISTORY_LABELS[entry.action] || entry.action}</span>
                      {" · "}{entry.actorName || "Team member"}{" · "}{formatWhen(entry.createdAt)}
                      {entry.action === "updated" && entry.before && (
                        <span className="block">
                          {entry.before.name !== entry.after.name ? `Name: ${entry.before.name} → ${entry.after.name}. ` : ""}
                          {entry.before.aliases.join(", ") !== entry.after.aliases.join(", ") ? `Other names: ${entry.after.aliases.join(", ") || "none"}.` : ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border/40 bg-background px-4 py-3 sm:-mx-6 sm:px-6">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>{readOnly ? "Close" : "Cancel"}</Button>
            {!readOnly && (
              <Button type="submit" disabled={!canSave}>
                {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} {target?.mode === "create" ? "Add location" : "Save changes"}
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
