"use client"

import * as React from "react"
import { FileText, Search, Smile } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCannedReplies } from "@/hooks/useCannedReplies"
import { EMOJI_CATS, EMOJI_SEARCH } from "@/lib/emoji-data"
import { cn } from "@/lib/utils"

const TOOL_CLASS = "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"

export function TemplatePicker({ onPick }: { onPick: (body: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const { replies, isLoading } = useCannedReplies()
  const needle = query.trim().toLowerCase()
  const visible = (replies || []).filter((reply) => `${reply.title} ${reply.body}`.toLowerCase().includes(needle)).slice(0, 50)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={TOOL_CLASS} aria-label="Insert a saved reply" title="Saved replies">
        <FileText className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-2">
        <p className="px-1 pb-1.5 text-xs font-bold">Saved replies</p>
        <div className="relative">
          <label htmlFor="automation-template-search" className="sr-only">Search saved replies</label>
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input id="automation-template-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-8 pl-7 text-xs" />
        </div>
        <div className="mt-1.5 max-h-64 space-y-0.5 overflow-y-auto">
          {isLoading && <p className="px-2 py-2 text-xs text-muted-foreground">Loading…</p>}
          {!isLoading && visible.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">{replies?.length ? "No saved replies match." : "No saved replies yet. Add them from a lead conversation."}</p>
          )}
          {visible.map((reply) => (
            <button
              key={reply._id}
              type="button"
              onClick={() => {
                onPick(reply.body)
                setOpen(false)
                setQuery("")
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
            >
              <span className="block truncate text-xs font-semibold">{reply.title}</span>
              <span className="line-clamp-2 text-[11px] text-muted-foreground">{reply.body}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState(EMOJI_CATS[0]?.key || "")
  const needle = query.trim().toLowerCase()
  const emojis = needle
    ? EMOJI_CATS.flatMap((cat) => cat.emojis).filter((emoji) => (EMOJI_SEARCH[emoji] || "").toLowerCase().includes(needle)).slice(0, 80)
    : EMOJI_CATS.find((cat) => cat.key === category)?.emojis || []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={TOOL_CLASS} aria-label="Insert an emoji" title="Emoji">
        <Smile className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] p-2">
        <label htmlFor="automation-emoji-search" className="sr-only">Search emoji</label>
        <Input id="automation-emoji-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emoji" className="h-8 text-xs" />
        {!needle && (
          <div className="mt-1.5 flex gap-0.5 overflow-x-auto" role="tablist" aria-label="Emoji groups">
            {EMOJI_CATS.map((cat) => (
              <button key={cat.key} type="button" role="tab" aria-selected={category === cat.key} title={cat.label} onClick={() => setCategory(cat.key)} className={cn("shrink-0 rounded-md px-1.5 py-1 text-base", category === cat.key ? "bg-muted" : "hover:bg-muted/60")}>
                {cat.icon}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1.5 grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
          {emojis.map((emoji, index) => (
            <button key={`${emoji}-${index}`} type="button" onClick={() => onPick(emoji)} className="rounded-md p-1 text-lg leading-none hover:bg-muted" aria-label={EMOJI_SEARCH[emoji] || emoji}>
              {emoji}
            </button>
          ))}
          {emojis.length === 0 && <p className="col-span-8 px-1 py-2 text-xs text-muted-foreground">No emoji match.</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}
