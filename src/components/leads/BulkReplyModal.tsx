"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Send, Users } from "lucide-react"

export interface BulkReplyRecipient {
  _id: string
  firstName: string
  lastName?: string
  email: string
}

interface BulkReplyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipients: BulkReplyRecipient[]
  onRemoveRecipient: (id: string) => void
  onSend: (message: string) => Promise<void>
  isSending: boolean
}

export function BulkReplyModal({
  open,
  onOpenChange,
  recipients,
  onRemoveRecipient,
  onSend,
  isSending,
}: BulkReplyModalProps) {
  const [message, setMessage] = React.useState("")

  React.useEffect(() => {
    if (!open) setMessage("")
  }, [open])

  const handleSend = async () => {
    if (!message.trim() || recipients.length === 0) return
    await onSend(message.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90dvh] overflow-hidden p-0 gap-0 z-200">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border bg-muted/20">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Reply to {recipients.length} customer{recipients.length === 1 ? "" : "s"}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto max-h-[calc(90dvh-180px)] px-4 sm:px-6 py-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {recipients.map((r) => (
              <span
                key={r._id}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted text-xs font-medium text-foreground"
              >
                {r.firstName} {r.lastName || ""}
                <button
                  type="button"
                  onClick={() => onRemoveRecipient(r._id)}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  aria-label={`Remove ${r.firstName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {recipients.length === 0 && (
              <p className="text-sm text-muted-foreground">No recipients selected.</p>
            )}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write one reply to send to everyone above…"
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Each customer receives this message individually, threaded onto their own inquiry.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim() || recipients.length === 0}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {isSending ? "Sending…" : `Send to ${recipients.length}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
