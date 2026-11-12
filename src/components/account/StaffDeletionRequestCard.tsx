"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Info, Loader2, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth, useUser } from "@/providers/AuthProvider"
import { useOrg } from "@/hooks/useOrg"
import { toast } from "@/lib/readable-toast"
import {
  DELETION_HELP_LEAD,
  RETENTION_ACKNOWLEDGEMENT,
  RETENTION_NOTICE,
  RETENTION_POLICY_HREF,
  deletionErrorMessage,
} from "@/lib/account-deletion"
import {
  NOTE_MAX_LENGTH,
  STAFF_DELETION_ENDPOINT,
  STAFF_DELETION_MINE_ENDPOINT,
  STAFF_DELETION_TEXT,
  canRequestStaffDeletion,
  myRequestSummary,
  staffDeletionRequestBody,
  type MyStaffDeletionRequest,
} from "@/lib/staff-deletion"
import { SUPPORT_EMAIL } from "@/lib/support-contact"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const QUERY_KEY = ["staff-deletion-request", "mine"]

/**
 * Staff profile: ask to delete your account (2026-11-12). An admin of your
 * dealership approves or rejects it; a rejection shows their reason here.
 * Shown only to dealership members and admins.
 */
export function StaffDeletionRequestCard() {
  const { user } = useUser()
  const { orgId, getToken } = useAuth()
  const { organization } = useOrg()
  const queryClient = useQueryClient()
  const allowed = canRequestStaffDeletion({ role: user?.role, organizationId: orgId })
  const dealership = organization?.name ?? ""

  const [open, setOpen] = React.useState(false)
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [cancelling, setCancelling] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const authHeaders = React.useCallback(async () => {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [getToken])

  const { data: request, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    enabled: allowed,
    queryFn: async () => {
      const response = await apiClient.get(STAFF_DELETION_MINE_ENDPOINT, { headers: await authHeaders() })
      return (response.data?.data ?? null) as MyStaffDeletionRequest
    },
  })

  if (!allowed) return null

  const summary = myRequestSummary(request ?? null, dealership)
  const pending = request?.status === "pending"
  const acknowledgementId = "staff-deletion-acknowledge"
  const noteId = "staff-deletion-note"

  const changeOpen = (next: boolean) => {
    if (sending) return
    setOpen(next)
    if (!next) {
      setAcknowledged(false)
      setNote("")
      setError(null)
    }
  }

  const sendRequest = async () => {
    if (!acknowledged || sending) return
    setSending(true)
    setError(null)
    try {
      await apiClient.post(STAFF_DELETION_ENDPOINT, staffDeletionRequestBody(note), { headers: await authHeaders() })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Your request was sent to your dealership admin.")
      setSending(false)
      changeOpen(false)
    } catch (requestError) {
      setError(deletionErrorMessage(requestError))
      setSending(false)
    }
  }

  const cancelRequest = async () => {
    if (cancelling) return
    setCancelling(true)
    try {
      await apiClient.delete(STAFF_DELETION_MINE_ENDPOINT, { headers: await authHeaders() })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Your deletion request was cancelled.")
    } catch (requestError) {
      toast.error(deletionErrorMessage(requestError))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <section
        aria-labelledby="staff-deletion-heading"
        className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 id="staff-deletion-heading" className="text-base font-semibold text-foreground">
              {summary?.title ?? "Delete your account"}
            </h2>
            {isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking for a request…
              </p>
            ) : isError ? (
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t check your deletion request.{" "}
                <button type="button" onClick={() => refetch()} className="font-medium text-foreground underline underline-offset-2">
                  Try again
                </button>
              </p>
            ) : (
              <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                {summary?.message ??
                  "Staff accounts are deleted after an admin of your dealership approves your request. Suprah AI keeps some transaction records for compliance, accounting, tax laws and fraud prevention."}
              </p>
            )}
          </div>
          {!isLoading && !isError && (
            pending ? (
              <Button
                type="button"
                variant="outline"
                onClick={cancelRequest}
                disabled={cancelling}
                className="h-11 shrink-0 gap-2"
              >
                {cancelling && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Cancel request
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(true)}
                className="h-11 shrink-0 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {request?.status === "rejected" ? "Request again" : "Request account deletion"}
              </Button>
            )
          )}
        </div>
      </section>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request account deletion?</DialogTitle>
            <DialogDescription>{STAFF_DELETION_TEXT.howItWorks}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">Removed if it&apos;s approved</p>
              <p className="text-muted-foreground">{STAFF_DELETION_TEXT.removed}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Kept by your dealership</p>
              <p className="text-muted-foreground">{STAFF_DELETION_TEXT.keptByDealership}</p>
            </div>
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground">Kept by Suprah AI</p>
                <p className="text-foreground/80">
                  {RETENTION_NOTICE}{" "}
                  <a
                    href={RETENTION_POLICY_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Read the Privacy Policy
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id={acknowledgementId}
                checked={acknowledged}
                onCheckedChange={(value) => setAcknowledged(value === true)}
                disabled={sending}
                aria-required="true"
                className="mt-0.5 h-5 w-5"
              />
              <Label htmlFor={acknowledgementId} className="text-sm font-normal leading-snug text-foreground">
                {RETENTION_ACKNOWLEDGEMENT}
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={noteId}>Message to your admin (optional)</Label>
              <Textarea
                id={noteId}
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX_LENGTH))}
                placeholder="For example, your last day"
                rows={3}
                disabled={sending}
                className="resize-none break-words [overflow-wrap:anywhere]"
              />
              <p className="text-right text-xs text-muted-foreground">
                {note.length}/{NOTE_MAX_LENGTH}
              </p>
            </div>

            {error && (
              <p role="alert" className="break-words rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive [overflow-wrap:anywhere]">
                {error}
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              {DELETION_HELP_LEAD}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-foreground underline underline-offset-2">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="h-11" onClick={() => changeOpen(false)} disabled={sending}>
              Keep my account
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11 gap-2"
              onClick={sendRequest}
              disabled={!acknowledged || sending}
            >
              {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {sending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
