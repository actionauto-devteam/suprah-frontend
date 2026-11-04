"use client"

import * as React from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { setQuotePortalShare } from "@/lib/api/quotePortalShare"
import { userErrorMessage } from "@/lib/user-error"
import { cn } from "@/lib/utils"
import type { PortalCustomerSummary } from "@/types/transportation"

/**
 * "Customer follows this shipment in their portal: <name>" on staff quote
 * cards and the load page (decided 2026-11-05). A staff quote is shared with
 * the customer account whose verified email is the quote's email, so staff
 * can spot a wrong email and Unlink it, or Link it again. A request the
 * customer sent from their portal always shows there, so it has no button.
 */
export function PortalShareLine({
  quoteId,
  portalCustomer,
  className,
  onChange,
}: {
  quoteId: string
  portalCustomer: PortalCustomerSummary | null | undefined
  className?: string
  /** Called with the new state after staff unlink or link it again. */
  onChange?: (next: PortalCustomerSummary | null) => void
}) {
  const [current, setCurrent] = React.useState(portalCustomer ?? null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => setCurrent(portalCustomer ?? null), [portalCustomer])

  if (!current) return null

  const change = async (share: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const result = await setQuotePortalShare(quoteId, share)
      const next = result.portalCustomer ? { ...result.portalCustomer, fromRequest: false } : null
      setCurrent(next)
      onChange?.(next)
      setConfirmOpen(false)
      toast.success(result.message)
    } catch (err) {
      const message = userErrorMessage(err, share ? "share this shipment with the customer's portal again" : "unlink this shipment")
      setError(message)
      if (share) toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    // Cards open when tapped; these buttons and the confirmation must not open them.
    <div
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground", className)}
      onClick={(event) => event.stopPropagation()}
    >
      {current.shared ? (
        <Eye className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <EyeOff className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 break-words">
        {current.shared ? (
          <>
            Customer follows this shipment in their portal:{" "}
            <span className="font-bold text-foreground">{current.name}</span>
          </>
        ) : (
          <>
            Unlinked: <span className="font-bold text-foreground">{current.name}</span> no longer sees this shipment in their
            portal
          </>
        )}
      </span>
      {!current.fromRequest &&
        (current.shared ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setError(null)
              setConfirmOpen(true)
            }}
            className="h-10 rounded-lg px-2.5 text-xs font-semibold sm:h-8 sm:text-[11px]"
          >
            Unlink
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void change(true)}
            className="h-10 gap-1 rounded-lg px-2.5 text-xs font-semibold sm:h-8 sm:text-[11px]"
          >
            {busy && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
            Link again
          </Button>
        ))}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (busy) return
          setConfirmOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop sharing this shipment with {current.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This shipment shows in {current.name}&apos;s customer portal because their verified account uses this
              quote&apos;s email. If that&apos;s the wrong person, unlink it: they stop seeing it and stop getting its
              updates. You can link it again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep sharing</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void change(false)} className="gap-1.5">
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Unlink
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
