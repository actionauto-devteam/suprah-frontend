"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle } from "lucide-react"

interface StatusReasonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: (reason: string) => void
  isSubmitting?: boolean
}

export function StatusReasonModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isSubmitting,
}: StatusReasonModalProps) {
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (!open) setReason("")
  }, [open])

  const handleConfirm = () => {
    if (!reason.trim()) return
    onConfirm(reason.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md p-0 gap-0 z-200">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border bg-muted/20">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <AlertCircle className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason…"
            rows={4}
            autoFocus
            className="resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? "Saving…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
