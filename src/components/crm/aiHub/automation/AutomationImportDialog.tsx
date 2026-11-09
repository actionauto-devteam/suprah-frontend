"use client"

import * as React from "react"
import { FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PODIUM_BATCH_SIZE,
  PODIUM_KEY_COLUMNS,
  PODIUM_MAX_ROWS,
  PODIUM_REQUIRED_COLUMNS,
  automationError,
  automationRequest,
  type PodiumImportResult,
} from "@/lib/crmAutomations"

type GetToken = () => Promise<string | null>
type PodiumRow = { cells: string[]; n: number }
type ParsedFile = { fileName: string; headers: string[]; rows: PodiumRow[] }

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_BATCH_CHARS = 350_000
const MAX_CELL = 500
const EMPTY_RESULT: PodiumImportResult = { added: 0, updated: 0, unchanged: 0, skipped: 0, tooOld: 0 }

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function cellText(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ""
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}Z`
  }
  return String(value ?? "").trim().slice(0, MAX_CELL)
}

function keyText(value: string): string {
  const text = value.replace(/\s+/g, " ").trim()
  return text.toLowerCase() === "null" ? "" : text.toLowerCase()
}

async function readPodiumFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error("This file is too big. Export a shorter date range from Podium.")
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv"
  const XLSX = await import("xlsx")
  const book = isCsv
    ? XLSX.read(await file.text(), { type: "string", raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true })
  const sheet = book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error("This file has no data.")
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: false })
  const headers = (table[0] || []).map(cellText)
  const lower = headers.map((header) => header.toLowerCase())
  const missing = PODIUM_REQUIRED_COLUMNS.filter((column) => !lower.includes(column.toLowerCase()))
  if (missing.length) throw new Error(`This file is missing the ${missing.join(", ")} column${missing.length === 1 ? "" : "s"}. Use the automations export from Podium.`)
  const body = table.slice(1).filter((row) => Array.isArray(row) && row.some((value) => cellText(value)))
  if (!body.length) throw new Error("This file has no rows.")
  if (body.length > PODIUM_MAX_ROWS) throw new Error(`This file has more than ${PODIUM_MAX_ROWS.toLocaleString("en-US")} rows. Export a shorter date range from Podium.`)
  const keyIndexes = PODIUM_KEY_COLUMNS.map((column) => lower.indexOf(column.toLowerCase()))
  const seen = new Map<string, number>()
  const rows = body.map((row) => {
    const cells = headers.map((_, index) => cellText(row[index]))
    const key = keyIndexes.map((index) => (index === -1 ? "" : keyText(cells[index]))).join("\u001f")
    const n = (seen.get(key) || 0) + 1
    seen.set(key, n)
    return { cells, n }
  })
  return { fileName: file.name, headers, rows }
}

function batches(rows: PodiumRow[]): PodiumRow[][] {
  const result: PodiumRow[][] = []
  let current: PodiumRow[] = []
  let size = 0
  for (const row of rows) {
    const rowSize = JSON.stringify(row).length
    if (current.length && (current.length >= PODIUM_BATCH_SIZE || size + rowSize > MAX_BATCH_CHARS)) {
      result.push(current)
      current = []
      size = 0
    }
    current.push(row)
    size += rowSize
  }
  if (current.length) result.push(current)
  return result
}

function summary(result: PodiumImportResult): string[] {
  const lines = [`${result.added.toLocaleString("en-US")} added`]
  if (result.updated) lines.push(`${result.updated.toLocaleString("en-US")} updated with a newer status`)
  if (result.unchanged) lines.push(`${result.unchanged.toLocaleString("en-US")} were already imported`)
  if (result.tooOld) lines.push(`${result.tooOld.toLocaleString("en-US")} skipped because they are older than 180 days`)
  if (result.skipped) lines.push(`${result.skipped.toLocaleString("en-US")} skipped because the date or status could not be read`)
  return lines
}

export function AutomationImportDialog({ open, getToken, onClose, onImported }: {
  open: boolean
  getToken: GetToken
  onClose: () => void
  onImported: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = React.useState<ParsedFile | null>(null)
  const [reading, setReading] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [done, setDone] = React.useState(0)
  const [result, setResult] = React.useState<PodiumImportResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) return
    setParsed(null)
    setReading(false)
    setDone(0)
    setResult(null)
    setError(null)
  }, [open])

  const choose = async (file: File | undefined) => {
    if (!file) return
    setReading(true)
    setError(null)
    setResult(null)
    setParsed(null)
    try {
      setParsed(await readPodiumFile(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file")
    } finally {
      setReading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const runImport = async () => {
    if (!parsed) return
    setImporting(true)
    setError(null)
    setDone(0)
    const total = { ...EMPTY_RESULT }
    let sent = 0
    try {
      for (const rows of batches(parsed.rows)) {
        const part = await automationRequest<PodiumImportResult>(getToken, "post", "/activity/import/podium", { headers: parsed.headers, rows })
        for (const key of Object.keys(total) as Array<keyof PodiumImportResult>) total[key] += Number(part?.[key]) || 0
        sent += rows.length
        setDone(sent)
      }
      setResult(total)
      onImported()
    } catch (err) {
      if (sent) setResult(total)
      setError(`${automationError(err, "Could not import the file")}${sent ? `. ${sent.toLocaleString("en-US")} of ${parsed.rows.length.toLocaleString("en-US")} rows were imported before it stopped. Importing the same file again will not add them twice.` : ""}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !importing && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Podium</DialogTitle>
          <DialogDescription>
            Pick the automations export from Podium (.csv or .xlsx). The rows show in Monitor when From Podium is on. They are only a record: Suprah does not send or run anything from them, and they are removed after 180 days like other Monitor events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={inputRef}
            id="automation-podium-file"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="sr-only"
            onChange={(event) => void choose(event.target.files?.[0])}
            disabled={reading || importing}
          />
          <label
            htmlFor="automation-podium-file"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-xs text-muted-foreground hover:bg-muted/40"
          >
            {reading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileUp className="h-5 w-5" aria-hidden="true" />}
            <span className="font-semibold text-foreground">{parsed ? "Choose a different file" : "Choose the Podium file"}</span>
            <span>.csv or .xlsx, up to {PODIUM_MAX_ROWS.toLocaleString("en-US")} rows</span>
          </label>

          {parsed && !result && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <span className="font-semibold">{parsed.fileName}</span> · {parsed.rows.length.toLocaleString("en-US")} row{parsed.rows.length === 1 ? "" : "s"} ready to import
            </p>
          )}

          {importing && parsed && (
            <p role="status" className="text-xs text-muted-foreground">Importing {done.toLocaleString("en-US")} of {parsed.rows.length.toLocaleString("en-US")} rows…</p>
          )}

          {result && (
            <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
              <p className="font-semibold">Import finished</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {summary(result).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
          )}

          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={importing}>{result ? "Close" : "Cancel"}</Button>
          {!result && (
            <Button type="button" onClick={() => void runImport()} disabled={!parsed || importing || reading}>
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
