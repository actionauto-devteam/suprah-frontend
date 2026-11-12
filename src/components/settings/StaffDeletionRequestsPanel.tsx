"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Loader2, UserX, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth, useUser } from "@/providers/AuthProvider"
import { useOrg } from "@/hooks/useOrg"
import { toast } from "@/lib/readable-toast"
import { userErrorMessage } from "@/lib/user-error"
import {
  REASON_MAX_LENGTH,
  STAFF_DELETION_ENDPOINT,
  formatRequestDate,
  rejectionReasonProblem,
  type StaffDeletionReviewItem,
} from "@/lib/staff-deletion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const QUERY_KEY = ["staff-deletion-requests"]

/**
 * Settings, Organization: staff who asked to delete their account
 * (2026-11-12). Approving removes them from the dealership (like Remove
 * member) and deletes their account; rejecting needs a reason they'll see.
 */
export function StaffDeletionRequestsPanel() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { isAdmin, organizationId } = useOrg()
  const queryClient = useQueryClient()
  const canReview = Boolean(organizationId) && (isAdmin || user?.role === "super_admin")

  const [approving, setApproving] = React.useState<StaffDeletionReviewItem | null>(null)
  const [rejecting, setRejecting] = React.useState<StaffDeletionReviewItem | null>(null)
  const [reason, setReason] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [dialogError, setDialogError] = React.useState<string | null>(null)

  const authHeaders = React.useCallback(async () => {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [getToken])

  const { data: requests = [], isLoading, isError, refetch } = useQuery({
    queryKey: [...QUERY_KEY, organizationId],
    enabled: canReview,
    queryFn: async () => {
      const response = await apiClient.get(STAFF_DELETION_ENDPOINT, { headers: await authHeaders() })
      return (response.data?.data ?? []) as StaffDeletionReviewItem[]
    },
  })

  if (!canReview) return null

  const closeDialogs = () => {
    if (busy) return
    setApproving(null)
    setRejecting(null)
    setReason("")
    setDialogError(null)
  }

  const refreshAfterDecision = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    // The Members list changes when an account is deleted.
    await queryClient.invalidateQueries({ queryKey: ["org-members"] })
  }

  const approve = async () => {
    if (!approving || busy) return
    setBusy(true)
    setDialogError(null)
    try {
      const response = await apiClient.post(`${STAFF_DELETION_ENDPOINT}/${approving.id}/approve`, {}, { headers: await authHeaders() })
      toast.success(String(response.data?.message || "Account deleted."))
      setBusy(false)
      setApproving(null)
      await refreshAfterDecision()
    } catch (error) {
      setDialogError(userErrorMessage(error, "approve this request"))
      setBusy(false)
    }
  }

  const reasonProblem = rejectionReasonProblem(reason)

  const reject = async () => {
    if (!rejecting || busy || reasonProblem) return
    setBusy(true)
    setDialogError(null)
    try {
      await apiClient.post(`${STAFF_DELETION_ENDPOINT}/${rejecting.id}/reject`, { reason: reason.trim() }, { headers: await authHeaders() })
      toast.success("Request rejected. They can see your reason.")
      setBusy(false)
      setRejecting(null)
      setReason("")
      await refreshAfterDecision()
    } catch (error) {
      setDialogError(userErrorMessage(error, "reject this request"))
      setBusy(false)
    }
  }

  const pending = requests.filter((request) => request.status === "pending")
  const decided = requests.filter((request) => request.status !== "pending")

  return (
    <Card className="mt-6 min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserX className="size-4 shrink-0" aria-hidden="true" />
          Account deletion requests
          {pending.length > 0 && <Badge variant="destructive">{pending.length}</Badge>}
        </CardTitle>
        <CardDescription>
          Staff who asked to delete their account. Approving removes them from your dealership, like Remove member, and
          deletes their account; it can&apos;t be undone. Rejecting needs a reason, which they&apos;ll see.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading requests…
          </p>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load the requests.{" "}
            <button type="button" onClick={() => refetch()} className="font-medium text-foreground underline underline-offset-2">
              Try again
            </button>
          </p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No account deletion requests.</p>
        ) : (
          <>
            {pending.map((request) => (
              <div key={request.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="break-words font-semibold text-foreground [overflow-wrap:anywhere]">
                    {request.person.name} <span className="font-normal text-muted-foreground">· {request.person.role}</span>
                  </p>
                  {request.person.email && (
                    <p className="break-all text-sm text-muted-foreground">{request.person.email}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Sent {formatRequestDate(request.createdAt)}</p>
                  {request.note && (
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground [overflow-wrap:anywhere]">
                      <span className="font-medium">Their message:</span> {request.note}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" className="h-11 gap-1.5" onClick={() => setRejecting(request)}>
                    <X className="size-4" aria-hidden="true" /> Reject
                  </Button>
                  <Button type="button" variant="destructive" className="h-11 gap-1.5" onClick={() => setApproving(request)}>
                    <Check className="size-4" aria-hidden="true" /> Approve
                  </Button>
                </div>
              </div>
            ))}

            {decided.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last 30 days</p>
                {decided.map((request) => (
                  <div key={request.id} className="min-w-0 rounded-xl border border-border/60 p-3 text-sm">
                    <p className="break-words [overflow-wrap:anywhere]">
                      <span className="font-medium text-foreground">{request.person.name}</span>
                      <span className="text-muted-foreground">
                        {" "}· {request.status === "approved" ? "Approved, account deleted" : "Rejected"} {formatRequestDate(request.decidedAt)}
                      </span>
                    </p>
                    {request.status === "rejected" && request.rejectionReason && (
                      <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground [overflow-wrap:anywhere]">
                        Reason: {request.rejectionReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={Boolean(approving)} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="break-words [overflow-wrap:anywhere]">Delete {approving?.person.name}&apos;s account?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>They&apos;re removed from your dealership, the same as Remove member: their unfinished loads are removed, and loads they dispatch move to you.</li>
            <li>Their sign-in and personal details are deleted, and their CRM sign-in stops working. They get an email saying so.</li>
            <li>Your dealership keeps its business and employee records, such as leads, deals, loads, chats and time records.</li>
          </ul>
          {dialogError && (
            <p role="alert" className="break-words rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive [overflow-wrap:anywhere]">
              {dialogError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="h-11" onClick={closeDialogs} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="h-11 gap-2" onClick={approve} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Approve and delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="break-words [overflow-wrap:anywhere]">Reject {rejecting?.person.name}&apos;s request?</DialogTitle>
            <DialogDescription>They&apos;ll see your reason in the app and by email, and can send a new request later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="staff-deletion-reject-reason">Reason (required)</Label>
            <Textarea
              id="staff-deletion-reject-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, REASON_MAX_LENGTH))}
              placeholder="For example: please hand over your open leads first"
              rows={4}
              disabled={busy}
              aria-invalid={reason.length > 0 && Boolean(reasonProblem)}
              className="resize-none break-words [overflow-wrap:anywhere]"
            />
            <p className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>{reason.length > 0 && reasonProblem ? reasonProblem : ""}</span>
              <span className="shrink-0">
                {reason.length}/{REASON_MAX_LENGTH}
              </span>
            </p>
          </div>
          {dialogError && (
            <p role="alert" className="break-words rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive [overflow-wrap:anywhere]">
              {dialogError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="h-11" onClick={closeDialogs} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" className="h-11 gap-2" onClick={reject} disabled={busy || Boolean(reasonProblem)}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
