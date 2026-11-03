"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftRight, CalendarDays, MoreVertical, Pencil, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { DATA_SYNC_TYPE_LABELS, automationError, automationRequest, formatAutomationDate, type DataSync } from "@/lib/crmAutomations"
import { HubState } from "../ShadowStatusBadge"

type GetToken = () => Promise<string | null>

export function AddSyncButton({ className }: { className?: string }) {
  const router = useRouter()
  return (
    <Button type="button" variant="outline" size="sm" className={cn("h-9", className)} onClick={() => router.push("/crm/settings/ai-agent/syncs/new")}>
      <RefreshCw className="h-4 w-4" />
      Add New Sync
    </Button>
  )
}

export function DataSyncList({ getToken }: { getToken: GetToken }) {
  const router = useRouter()
  const [items, setItems] = React.useState<DataSync[] | null>(null)
  const [canEdit, setCanEdit] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<DataSync | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await automationRequest<{ items: DataSync[]; canEdit: boolean }>(getToken, "get", "/syncs")
      setItems(data.items)
      setCanEdit(data.canEdit)
    } catch (err) {
      setError(automationError(err, "Could not load data syncs"))
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    void load()
  }, [load])

  const remove = async () => {
    if (!deleting) return
    try {
      await automationRequest(getToken, "delete", `/syncs/${deleting.id}`)
      toast.success(`Deleted "${deleting.name}"`)
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(automationError(err, "Could not delete the data sync"))
    }
  }

  return (
    <HubState loading={loading && !items} error={items ? null : error} onRetry={load}>
      {items && items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
            <ArrowLeftRight className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold">No data syncs yet</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">Data Sync keeps Suprah and your other tools in step, like appointments from another CRM.</p>
          {canEdit && <div className="mt-4"><AddSyncButton /></div>}
        </div>
      ) : items && (
        <ul className="space-y-2" aria-label="Data syncs">
          {items.map((sync) => (
            <li key={sync.id} className="flex items-start gap-3 rounded-xl border border-border/40 bg-background p-3 sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => router.push(`/crm/settings/ai-agent/syncs/${sync.id}`)} className="text-left text-sm font-semibold hover:underline">{sync.name}</button>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{DATA_SYNC_TYPE_LABELS[sync.type]}</span>
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", sync.status === "active" ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300" : "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-500/40 dark:bg-zinc-400/10 dark:text-zinc-300")}>
                    {sync.status === "active" ? "Active" : "Inactive"}
                  </span>
                  <span>{sync.locations.mode === "all" ? "All locations" : `${sync.locations.ids.length} location${sync.locations.ids.length === 1 ? "" : "s"}`}</span>
                  {!sync.setupComplete && <span className="text-amber-700 dark:text-amber-300">Setup not finished, nothing syncs yet</span>}
                  <span>Updated {formatAutomationDate(sync.updatedAt)}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" aria-label={`Actions for ${sync.name}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => router.push(`/crm/settings/ai-agent/syncs/${sync.id}`)}>
                    <Pencil className="h-4 w-4" />
                    {canEdit ? "Edit" : "View"}
                  </DropdownMenuItem>
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(sync)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this data sync?</AlertDialogTitle>
            <AlertDialogDescription>&quot;{deleting?.name}&quot; will be removed for everyone. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void remove() }} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HubState>
  )
}
