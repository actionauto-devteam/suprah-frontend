"use client"

import * as React from "react"
import { Loader2, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { toast } from "@/lib/readable-toast"
import {
  ACCOUNT_DELETION_ENDPOINT,
  ACCOUNT_DELETION_TEXT,
  DELETE_CONFIRM_WORD,
  deletionConfirmed,
  deletionErrorMessage,
  type DeletingAccount,
} from "@/lib/account-deletion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteAccountCardProps {
  account: DeletingAccount
  /** "card" explains it on the page; "button" is a small button (the driver's waiting page). */
  variant?: "card" | "button"
}

/**
 * Lets a driver or customer delete their own account (2026-11-11). They see
 * what's removed and what stays, type DELETE, and are signed out once it's
 * done. If something stops it (a load or shipment in progress, an unpaid
 * payout, an email not verified yet), the reason is shown in plain words.
 */
export function DeleteAccountCard({ account, variant = "card" }: DeleteAccountCardProps) {
  const { getToken, signOut } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState("")
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const text = ACCOUNT_DELETION_TEXT[account]
  const inputId = `delete-account-confirm-${account}`

  const changeOpen = (next: boolean) => {
    if (deleting) return
    setOpen(next)
    if (!next) {
      setConfirmText("")
      setError(null)
    }
  }

  const deleteAccount = async () => {
    if (!deletionConfirmed(confirmText) || deleting) return
    setDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      await apiClient.delete(ACCOUNT_DELETION_ENDPOINT[account], {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch (requestError) {
      setError(deletionErrorMessage(requestError))
      setDeleting(false)
      return
    }
    toast.success("Your account was deleted.")
    try {
      await signOut({ redirectUrl: "/sign-in" })
    } catch {
      window.location.assign("/sign-in")
    }
  }

  const trigger =
    variant === "button" ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-11 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Delete account
      </Button>
    ) : (
      <section
        aria-labelledby={`delete-account-heading-${account}`}
        className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 id={`delete-account-heading-${account}`} className="text-base font-semibold text-foreground">
              Delete your account
            </h2>
            <p className="text-sm text-muted-foreground">
              Removes your account and personal details for good. {text.blockedWhen}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            className="h-11 shrink-0 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete account
          </Button>
        </div>
      </section>
    )

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">Removed right away</p>
              <p className="text-muted-foreground">{text.removed}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Kept for the dealerships</p>
              <p className="text-muted-foreground">{text.kept}</p>
            </div>
            <p className="text-muted-foreground">{text.blockedWhen}</p>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor={inputId}>Type {DELETE_CONFIRM_WORD} to confirm</Label>
              <Input
                id={inputId}
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={DELETE_CONFIRM_WORD}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={deleting}
                className="h-11"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="h-11" onClick={() => changeOpen(false)} disabled={deleting}>
              Keep my account
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11 gap-2"
              onClick={deleteAccount}
              disabled={!deletionConfirmed(confirmText) || deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {deleting ? "Deleting…" : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
