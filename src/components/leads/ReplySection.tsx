"use client"

import * as React from "react"
import { Send, Circle, ChevronDown, Calendar, XCircle, Lock, LockOpen, Truck } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { STATUS_CONFIG } from "./atomic/StatusPill"

interface ReplySectionProps {
  isClosed: boolean
  replyMessage: string
  setReplyMessage: (msg: string) => void
  onSend: () => void
  isSending: boolean
  onStatusChange: (status: string) => void
  onApptOpen: () => void
  onReopen: () => void
  onQuoteShipping: () => void
  selectedLeadStatus: string
}

// ── Shared toolbar button ─────────────────────────────────────────────────────
const toolbarBtn =
  "flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all whitespace-nowrap"

export const ReplySection = React.memo(({
  isClosed,
  replyMessage,
  setReplyMessage,
  onSend,
  isSending,
  onStatusChange,
  onApptOpen,
  onReopen,
  onQuoteShipping,
  selectedLeadStatus,
}: ReplySectionProps) => {

  // ── Closed state ─────────────────────────────────────────────────────────────
  if (isClosed) {
    return (
      <div className="border-t border-border/50 px-5 py-3.5 flex items-center justify-between bg-card/80 shrink-0">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/60">This inquiry is closed</span>
        </div>
        <button
          onClick={onReopen}
          className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <LockOpen className="h-3 w-3" /> Reopen
        </button>
      </div>
    )
  }

  // ── Active reply area ─────────────────────────────────────────────────────────
  return (
    <div className="border-t border-border/50 bg-card/80 px-3 sm:px-4 py-3 shrink-0">
      {/* SS4-style input wrap */}
      <div className="rounded-[14px] border-[1.5px] border-border/60 bg-background overflow-hidden transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(var(--primary)/0.12)]">

        {/* Textarea */}
        <textarea
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder="Write a reply…"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              onSend()
            }
          }}
          className="w-full px-4 pt-3.5 pb-2 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/40 resize-none outline-none leading-relaxed"
        />

        {/* Toolbar row */}
        <div className="flex items-center justify-between px-2.5 py-2 border-t border-border/40">
          {/* Left: action buttons — scrollable on mobile */}
          <div className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink min-w-0">

            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={toolbarBtn}>
                  <Circle className="h-3 w-3" />
                  Status
                  <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="rounded-xl border border-border bg-popover shadow-lg p-1 min-w-40 z-50"
              >
                {Object.entries(STATUS_CONFIG)
                  .filter(([s]) => s !== selectedLeadStatus && s !== "Inbound Calls")
                  .map(([s, c]) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => onStatusChange(s)}
                      className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg cursor-pointer px-2.5 py-1.5 focus:bg-muted focus:text-foreground"
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${c.dot}`} />
                      {c.label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Schedule */}
            <button onClick={onApptOpen} className={toolbarBtn}>
              <Calendar className="h-3 w-3" />
              Schedule
            </button>

            {/* Quote Shipping */}
            <button onClick={onQuoteShipping} className={toolbarBtn}>
              <Truck className="h-3 w-3" />
              Quote
            </button>

            {/* Close inquiry */}
            <button
              onClick={() => onStatusChange("Closed")}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-medium text-destructive/50 hover:text-destructive hover:bg-destructive/8 transition-all whitespace-nowrap"
            >
              <XCircle className="h-3 w-3" />
              Close
            </button>
          </div>

          {/* Right: send button (SS4-style gradient) */}
          <div className="flex items-center gap-2 shrink-0 pl-2">
            <span className="text-[10px] text-muted-foreground/30 hidden sm:block">⌘↵</span>
            <button
              onClick={onSend}
              disabled={isSending || !replyMessage.trim()}
              className="flex items-center gap-1.5 px-4 h-8 rounded-xl text-[13px] font-semibold bg-linear-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-px active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

ReplySection.displayName = "ReplySection"
