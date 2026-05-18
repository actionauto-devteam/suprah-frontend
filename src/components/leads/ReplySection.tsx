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
      <div
        className="px-5 py-3.5 flex items-center justify-between shrink-0"
        style={{ borderTop: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" style={{ color: 'var(--text-disabled)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>This inquiry is closed</span>
        </div>
        <button onClick={onReopen} className="ss4-pill-btn flex items-center gap-1.5 px-3 h-7 text-xs font-medium">
          <LockOpen className="h-3 w-3" /> Reopen
        </button>
      </div>
    )
  }

  // ── Active reply area ─────────────────────────────────────────────────────────
  return (
    <div
      className="px-3 sm:px-4 py-3 shrink-0"
      style={{ borderTop: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}
    >
      <div className="ss4-input-wrap overflow-hidden">

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
          className="w-full px-4 pt-3.5 pb-2 bg-transparent resize-none outline-none leading-relaxed"
          style={{ fontSize: 14, color: 'var(--text-primary)' }}
        />

        {/* Toolbar row */}
        <div
          className="flex items-center justify-between px-2.5 py-2"
          style={{ borderTop: '1px solid var(--border-1)' }}
        >
          {/* Left: action buttons */}
          <div className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink min-w-0">

            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ss4-pill-btn flex items-center gap-1.5 px-2.5 h-7 text-[11px] font-medium">
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

            <button onClick={onApptOpen} className="ss4-pill-btn flex items-center gap-1.5 px-2.5 h-7 text-[11px] font-medium whitespace-nowrap">
              <Calendar className="h-3 w-3" />
              Schedule
            </button>

            <button onClick={onQuoteShipping} className="ss4-pill-btn flex items-center gap-1.5 px-2.5 h-7 text-[11px] font-medium whitespace-nowrap">
              <Truck className="h-3 w-3" />
              Quote
            </button>

            <button
              onClick={() => onStatusChange("Closed")}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap"
              style={{ color: 'var(--danger)', opacity: 0.7 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              <XCircle className="h-3 w-3" />
              Close
            </button>
          </div>

          {/* Right: send button */}
          <div className="flex items-center gap-2 shrink-0 pl-2">
            <span className="hidden sm:block" style={{ fontSize: 10, color: 'var(--text-disabled)' }}>⌘↵</span>
            <button
              onClick={onSend}
              disabled={isSending || !replyMessage.trim()}
              className="ss4-send-btn flex items-center gap-1.5 px-4 h-8 font-semibold"
              style={{ fontSize: 13 }}
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
