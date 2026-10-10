"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Search, Trash2, Upload, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT } from "@/lib/timezone"

type ConsentStatus = "unknown" | "claimed_verbal" | "documented"

const CONSENT_OPTIONS: { value: ConsentStatus; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "claimed_verbal", label: "Claimed (verbal)" },
  { value: "documented", label: "Documented" },
]

interface ImportCounts {
  totalRows: number
  validNew: number
  duplicateInFile: number
  duplicateExisting: number
  suppressed: number
  invalidFormat: number
}

interface ImportSampleRow {
  rowIndex: number
  rawEmail: string
  firstName?: string
  lastName?: string
}

interface ImportSamples {
  validNew: ImportSampleRow[]
  duplicateInFile: ImportSampleRow[]
  duplicateExisting: ImportSampleRow[]
  suppressed: ImportSampleRow[]
  invalidFormat: ImportSampleRow[]
}

interface MarketingContact {
  _id: string
  email: string
  firstName?: string
  lastName?: string
  source: string
  consentStatus: ConsentStatus
  importLabel: string
  createdAt: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

const PAGE_SIZE = 25

const COUNT_LABELS: { key: keyof ImportCounts; label: string; tone: string }[] = [
  { key: "validNew", label: "New & eligible", tone: "text-emerald-600 dark:text-emerald-400" },
  { key: "duplicateInFile", label: "Duplicate in file", tone: "text-muted-foreground" },
  { key: "duplicateExisting", label: "Already in library", tone: "text-muted-foreground" },
  { key: "suppressed", label: "Suppressed (opted out)", tone: "text-amber-600 dark:text-amber-400" },
  { key: "invalidFormat", label: "Invalid email format", tone: "text-red-600 dark:text-red-400" },
]

function SampleList({ title, rows }: { title: string; rows: ImportSampleRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {rows.map((row) => (
          <li key={`${title}-${row.rowIndex}`} className="truncate">
            {row.rawEmail}
            {row.firstName ? ` — ${row.firstName}${row.lastName ? ` ${row.lastName}` : ""}` : ""}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MarketingContactsPanel({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const router = useRouter()
  const { getToken } = useAuth()

  const [file, setFile] = React.useState<File | null>(null)
  const [importLabel, setImportLabel] = React.useState("")
  const [source, setSource] = React.useState("")
  const [consentStatus, setConsentStatus] = React.useState<ConsentStatus>("unknown")
  const [consentNote, setConsentNote] = React.useState("")

  const [previewing, setPreviewing] = React.useState(false)
  const [previewError, setPreviewError] = React.useState("")
  const [previewCounts, setPreviewCounts] = React.useState<ImportCounts | null>(null)
  const [previewSamples, setPreviewSamples] = React.useState<ImportSamples | null>(null)
  const [fingerprint, setFingerprint] = React.useState("")

  const [confirming, setConfirming] = React.useState(false)
  const [confirmError, setConfirmError] = React.useState("")
  const [lastImportResult, setLastImportResult] = React.useState<{ imported: number; insertFailed: number } | null>(null)

  const clearPreview = React.useCallback(() => {
    setPreviewCounts(null)
    setPreviewSamples(null)
    setFingerprint("")
    setConfirmError("")
    setLastImportResult(null)
  }, [])

  const [contacts, setContacts] = React.useState<MarketingContact[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [listLoading, setListLoading] = React.useState(true)
  const [listError, setListError] = React.useState("")
  const [deletingId, setDeletingId] = React.useState("")

  const loadContacts = React.useCallback(async () => {
    setListLoading(true)
    setListError("")
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/marketing-contacts", {
        params: { page, limit: PAGE_SIZE, search: search || undefined },
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      setContacts(data?.contacts || [])
      setTotal(typeof data?.total === "number" ? data.total : 0)
    } catch (err) {
      setListError(getErrorMessage(err, "Could not load Marketing Contacts."))
    } finally {
      setListLoading(false)
    }
  }, [getToken, page, search])

  React.useEffect(() => {
    const timer = window.setTimeout(() => void loadContacts(), 300)
    return () => window.clearTimeout(timer)
  }, [loadContacts])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null)
    clearPreview()
  }

  const handleSettingChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (value: T) => {
    setter(value)
    clearPreview()
  }

  const canPreview = !!file && importLabel.trim().length > 0 && source.trim().length > 0 && !previewing

  const buildFormData = () => {
    const formData = new FormData()
    if (file) formData.append("file", file)
    formData.append("importLabel", importLabel.trim())
    formData.append("source", source.trim())
    formData.append("consentStatus", consentStatus)
    if (consentNote.trim()) formData.append("consentNote", consentNote.trim())
    return formData
  }

  const handlePreview = async () => {
    if (!file) return
    setPreviewing(true)
    setPreviewError("")
    setConfirmError("")
    setLastImportResult(null)
    try {
      const t = await getToken()
      const formData = buildFormData()
      const res = await apiClient.post("/api/crm/marketing-contacts/import", formData, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      setPreviewCounts(data?.counts || null)
      setPreviewSamples(data?.samples || null)
      setFingerprint(data?.fingerprint || "")
    } catch (err) {
      clearPreview()
      setPreviewError(getErrorMessage(err, "Could not preview this import."))
    } finally {
      setPreviewing(false)
    }
  }

  const handleConfirm = async () => {
    if (!file || !fingerprint) return
    setConfirming(true)
    setConfirmError("")
    try {
      const t = await getToken()
      const formData = buildFormData()
      formData.append("confirm", "true")
      formData.append("fingerprint", fingerprint)
      const res = await apiClient.post("/api/crm/marketing-contacts/import", formData, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      setLastImportResult({ imported: data?.imported ?? 0, insertFailed: data?.insertFailed ?? 0 })
      setFile(null)
      setImportLabel("")
      setSource("")
      setConsentStatus("unknown")
      setConsentNote("")
      setPreviewCounts(null)
      setPreviewSamples(null)
      setFingerprint("")
      setPage(1)
      await loadContacts()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        setConfirmError("The file or import settings changed since you last previewed this import. Please preview again before confirming.")
        setPreviewCounts(null)
        setPreviewSamples(null)
        setFingerprint("")
      } else {
        setConfirmError(getErrorMessage(err, "Could not complete this import."))
      }
    } finally {
      setConfirming(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!window.confirm(`Remove ${email} from Marketing Contacts? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const t = await getToken()
      await apiClient.delete(`/api/crm/marketing-contacts/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      await loadContacts()
    } catch (err) {
      setListError(getErrorMessage(err, "Could not delete this contact."))
    } finally {
      setDeletingId("")
    }
  }

  return (
    <div className={hideHeader ? "contents" : "h-full overflow-y-auto"}>
      <div className={hideHeader ? "space-y-6" : "mx-auto max-w-5xl space-y-6 p-4 sm:p-6"}>
        {!hideHeader && (
          <>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/crm/leads")} aria-label="Back to leads">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold tracking-tight">Marketing Contacts</h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              A reusable list of email contacts for campaigns, separate from CRM Leads. Importing contacts here never
              creates sales Leads and never adds anyone to the Leads inbox.
            </p>
          </>
        )}

        <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Import contacts</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">CSV file</label>
            <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            {file && <p className="text-[11px] text-muted-foreground">{file.name}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Import label</label>
              <Input
                value={importLabel}
                onChange={(event) => handleSettingChange(setImportLabel)(event.target.value)}
                placeholder="e.g. Raffle Batch 1"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Source</label>
              <Input
                value={source}
                onChange={(event) => handleSettingChange(setSource)(event.target.value)}
                placeholder="e.g. Raffle 2026"
                maxLength={120}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Consent evidence status</label>
            <p className="text-[11px] text-muted-foreground">
              This records what evidence exists for these contacts — it does not by itself authorize sending them
              marketing email. &ldquo;Unknown&rdquo; and &ldquo;Claimed (verbal)&rdquo; are not the same as documented opt-in.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {CONSENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSettingChange(setConsentStatus)(option.value)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                    consentStatus === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Consent note (optional)</label>
            <Textarea
              value={consentNote}
              onChange={(event) => handleSettingChange(setConsentNote)(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="e.g. Verbal confirmation only, no documentary consent record on file"
              className="resize-none"
            />
          </div>

          {previewError && <p className="text-sm text-red-500">{previewError}</p>}

          <div className="pt-1">
            <Button disabled={!canPreview} onClick={() => void handlePreview()}>
              {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Preview import
            </Button>
          </div>

          {previewCounts && (
            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview results — nothing has been imported yet
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COUNT_LABELS.map(({ key, label, tone }) => (
                  <div key={key} className="rounded-lg border bg-background p-2 text-center">
                    <p className={cn("text-lg font-bold", tone)}>{previewCounts[key]}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {previewSamples && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <SampleList title="New & eligible (sample)" rows={previewSamples.validNew} />
                  <SampleList title="Suppressed (sample)" rows={previewSamples.suppressed} />
                  <SampleList title="Already in library (sample)" rows={previewSamples.duplicateExisting} />
                  <SampleList title="Invalid format (sample)" rows={previewSamples.invalidFormat} />
                </div>
              )}

              {confirmError && <p className="text-sm text-red-500">{confirmError}</p>}
              {lastImportResult && (
                <p className="text-sm font-medium">
                  {lastImportResult.insertFailed > 0
                    ? `Imported ${lastImportResult.imported} contact(s). ${lastImportResult.insertFailed} could not be saved.`
                    : `Imported ${lastImportResult.imported} contact(s) successfully.`}
                </p>
              )}

              <Button onClick={() => void handleConfirm()} disabled={confirming || previewCounts.validNew === 0}>
                {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import Contacts ({previewCounts.validNew} eligible)
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Library ({total} contact{total === 1 ? "" : "s"})
            </h2>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setPage(1)
                  setSearch(event.target.value)
                }}
                placeholder="Search by email or name"
                className="pl-8"
              />
            </div>
          </div>

          {listError && <p className="text-sm text-red-500">{listError}</p>}

          {listLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search ? "No contacts match your search." : "No Marketing Contacts imported yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact._id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {contact.email}
                      {(contact.firstName || contact.lastName) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {contact.source} · {contact.importLabel} · {contact.consentStatus} · {fmtLongDateTimeMDT(contact.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    disabled={deletingId === contact._id}
                    onClick={() => void handleDelete(contact._id, contact.email)}
                    aria-label={`Delete ${contact.email}`}
                  >
                    {deletingId === contact._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
