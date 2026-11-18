"use client"

import * as React from "react"
import { ChevronRight, XIcon } from "lucide-react"
import { toast as sonnerToast, useSonner, type Action, type ToastT } from "sonner"
import { cn } from "@/lib/utils"
import {
  SWIPE_DISMISS_DISTANCE,
  countingDownIds,
  deckIndexAfterChange,
  deckPositionLabel,
  deckSwitchLabel,
  nextDeckIndex,
  toastLifetime,
  type DeckToastId,
} from "@/lib/toast-deck"

type DeckPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center"
type DeckIcons = Partial<Record<"success" | "info" | "warning" | "error" | "loading", React.ReactNode>>

export interface ToastDeckProps {
  position?: DeckPosition
  /** Distance from each screen edge, as CSS lengths. */
  offset?: { top?: string; bottom?: string; left?: string; right?: string }
  icons?: DeckIcons
  /** For toasts that don't set their own duration. */
  duration?: number
  /** Show a close button on every toast (toasts can also ask for one). */
  closeButton?: boolean
}

const isAction = (value: unknown): value is Action =>
  typeof value === "object" && value !== null && "label" in value && "onClick" in value

const show = (value: ToastT["title"]): React.ReactNode => (typeof value === "function" ? value() : value)

const sameIds = (a: readonly DeckToastId[], b: readonly DeckToastId[]) =>
  a.length === b.length && a.every((id, index) => id === b[index])

export function ToastDeck({ position = "top-right", offset = {}, icons = {}, duration, closeButton = true }: ToastDeckProps) {
  const { toasts } = useSonner()
  const ids = React.useMemo(() => toasts.map((toast) => toast.id), [toasts])

  // Which toast is on show, kept with the list it was chosen from.
  const [deck, setDeck] = React.useState<{ ids: DeckToastId[]; index: number }>({ ids: [], index: 0 })
  if (!sameIds(deck.ids, ids)) {
    setDeck({ ids, index: deckIndexAfterChange(deck.ids, ids, deck.ids[deck.index] ?? null, deck.index) })
  }
  const count = toasts.length
  const index = Math.min(deck.index, Math.max(count - 1, 0))
  const shown: ToastT | undefined = toasts[index]

  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const interacting = hovered || focused
  const resetInteraction = React.useCallback((element: HTMLDivElement | null) => {
    if (!element) {
      setHovered(false)
      setFocused(false)
    }
  }, [])
  const [pageHidden, setPageHidden] = React.useState(false)
  React.useEffect(() => {
    const update = () => setPageHidden(document.visibilityState === "hidden")
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  const remaining = React.useRef(new Map<DeckToastId, { ms: number; key: string }>())
  React.useEffect(() => {
    for (const id of [...remaining.current.keys()]) {
      if (!ids.includes(id)) remaining.current.delete(id)
    }
  }, [ids])

  const dismiss = React.useCallback((toast: ToastT) => {
    remaining.current.delete(toast.id)
    sonnerToast.dismiss(toast.id)
  }, [])
  const close = React.useCallback(
    (toast: ToastT) => {
      toast.onDismiss?.(toast)
      dismiss(toast)
    },
    [dismiss],
  )

  const counting = React.useMemo(() => countingDownIds(toasts, duration), [toasts, duration])
  React.useEffect(() => {
    if (interacting || pageHidden) return
    const stops: Array<() => void> = []
    for (const toast of toasts) {
      if (!counting.includes(toast.id)) continue
      // A loading toast that turns into success starts a fresh countdown.
      const key = `${toast.type ?? ""}:${toast.duration ?? ""}`
      let entry = remaining.current.get(toast.id)
      if (!entry || entry.key !== key) {
        entry = { ms: toastLifetime(toast, duration), key }
        remaining.current.set(toast.id, entry)
      }
      if (entry.ms === Infinity) continue
      const current = entry
      const startedAt = Date.now()
      const timer = window.setTimeout(() => {
        toast.onAutoClose?.(toast)
        dismiss(toast)
      }, current.ms)
      stops.push(() => {
        window.clearTimeout(timer)
        current.ms = Math.max(0, current.ms - (Date.now() - startedAt))
      })
    }
    return () => stops.forEach((stop) => stop())
  }, [toasts, counting, interacting, pageHidden, duration, dismiss])

  const showNext = React.useCallback(() => {
    setDeck((current) => ({ ...current, index: nextDeckIndex(current.index, current.ids.length) }))
  }, [])

  const vertical = position.startsWith("bottom") ? "bottom" : "top"
  const horizontal = position.endsWith("left") ? "left" : position.endsWith("center") ? "center" : "right"

  return (
    <section
      aria-label="Notifications"
      aria-live="polite"
      aria-relevant="additions text"
      className={cn(
        "pointer-events-none fixed z-[999999999] flex left-[var(--toast-deck-left)] right-[var(--toast-deck-right)]",
        horizontal === "right" && "sm:left-auto",
        horizontal === "left" && "sm:right-auto",
        horizontal === "center" && "sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
      )}
      style={
        {
          [vertical]: offset[vertical] ?? "1rem",
          "--toast-deck-left": offset.left ?? "1rem",
          "--toast-deck-right": offset.right ?? "1rem",
        } as React.CSSProperties
      }
    >
      {shown ? (
        <div
          key={shown.id}
          ref={resetInteraction}
          className="pointer-events-auto w-full sm:w-[356px]"
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") setHovered(true)
          }}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
          }}
        >
          <DeckCard
            key={shown.id}
            toast={shown}
            icons={icons}
            closeButton={closeButton}
            index={index}
            count={count}
            onNext={showNext}
            onClose={close}
            onAct={dismiss}
          />
        </div>
      ) : null}
    </section>
  )
}

function DeckCard({
  toast,
  icons,
  closeButton,
  index,
  count,
  onNext,
  onClose,
  onAct,
}: {
  toast: ToastT
  icons: DeckIcons
  closeButton: boolean
  index: number
  count: number
  onNext: () => void
  onClose: (toast: ToastT) => void
  onAct: (toast: ToastT) => void
}) {
  // Swipe sideways to dismiss, as before.
  const [dragX, setDragX] = React.useState(0)
  const dragStart = React.useRef<number | null>(null)
  const swipeable = toast.dismissible !== false

  const switchButton =
    count > 1 ? (
      <button
        type="button"
        onClick={onNext}
        aria-label={deckSwitchLabel(index, count)}
        title="Show the next message"
        className={cn(
          "flex shrink-0 flex-col items-center justify-center gap-0.5 px-2.5 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          toast.jsx
            ? "min-h-11 rounded-[var(--radius)] border border-border bg-popover shadow-lg"
            : "-my-4 -mr-4 ml-1 self-stretch rounded-r-[calc(var(--radius)-1px)] border-l border-border",
        )}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
        <span aria-hidden="true">{deckPositionLabel(index, count)}</span>
      </button>
    ) : null

  const swipe = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!swipeable) return
      if ((event.target as HTMLElement).closest("button, a, input, textarea, select, [role='button']")) return
      dragStart.current = event.clientX
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (dragStart.current === null) return
      setDragX(event.clientX - dragStart.current)
    },
    onPointerUp: () => {
      if (dragStart.current === null) return
      dragStart.current = null
      const distance = dragX
      setDragX(0)
      if (Math.abs(distance) >= SWIPE_DISMISS_DISTANCE) onClose(toast)
    },
    onPointerCancel: () => {
      dragStart.current = null
      setDragX(0)
    },
  }
  const dragStyle: React.CSSProperties = dragX
    ? { transform: `translateX(${dragX}px)`, opacity: Math.max(0.3, 1 - Math.abs(dragX) / 200) }
    : {}

  // A fully custom toast keeps its own look; the switch sits beside it.
  if (toast.jsx) {
    return (
      <div className="flex w-full items-stretch gap-2 animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
        <div className="min-w-0 flex-1">{toast.jsx}</div>
        {switchButton}
      </div>
    )
  }

  const type = toast.type ?? "default"
  const icon =
    toast.icon !== undefined
      ? toast.icon
      : type === "success" || type === "info" || type === "warning" || type === "error" || type === "loading"
        ? icons[type]
        : null
  const showClose = (toast.closeButton ?? closeButton) && toast.dismissible !== false && type !== "loading"
  const title = show(toast.title)
  const description = show(toast.description)

  return (
    <div
      data-type={type}
      className={cn(
        "relative flex w-full touch-pan-y items-center gap-1.5 rounded-[var(--radius)] border border-border bg-popover p-4 text-[13px] text-popover-foreground shadow-lg [overflow-wrap:anywhere]",
        "animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none",
        dragX === 0 && "transition-[transform,opacity] duration-200",
        toast.className,
        toast.classNames?.toast,
      )}
      style={{ ...toast.style, ...dragStyle }}
      {...swipe}
    >
      {showClose ? (
        <button
          type="button"
          aria-label="Close"
          onClick={() => onClose(toast)}
          className={cn(
            "absolute left-0 top-0 z-10 flex size-5 -translate-x-[35%] -translate-y-[35%] items-center justify-center rounded-full border border-border bg-popover text-popover-foreground transition-colors hover:bg-muted",
            toast.classNames?.closeButton,
          )}
        >
          <XIcon className="size-3" aria-hidden="true" />
        </button>
      ) : null}

      {icon ? (
        <span
          className={cn("-ml-[3px] mr-1 flex size-4 shrink-0 items-center justify-start", toast.classNames?.icon)}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}

      <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", toast.classNames?.content)}>
        {title ? <div className={cn("font-medium leading-normal text-foreground", toast.classNames?.title)}>{title}</div> : null}
        {description ? (
          <div className={cn("leading-[1.4] text-foreground/90", toast.descriptionClassName, toast.classNames?.description)}>
            {description}
          </div>
        ) : null}
      </div>

      {React.isValidElement(toast.cancel) ? (
        toast.cancel
      ) : isAction(toast.cancel) ? (
        <button
          type="button"
          style={toast.cancelButtonStyle}
          onClick={(event) => {
            ;(toast.cancel as Action).onClick?.(event)
            onAct(toast)
          }}
          className={cn(
            "ml-auto flex h-6 shrink-0 items-center rounded-[4px] bg-muted px-2 text-xs font-medium text-foreground",
            toast.classNames?.cancelButton,
          )}
        >
          {toast.cancel.label}
        </button>
      ) : null}

      {React.isValidElement(toast.action) ? (
        toast.action
      ) : isAction(toast.action) ? (
        <button
          type="button"
          style={toast.actionButtonStyle}
          onClick={(event) => {
            ;(toast.action as Action).onClick(event)
            if (!event.defaultPrevented) onAct(toast)
          }}
          className={cn(
            "ml-auto flex h-6 shrink-0 items-center rounded-[4px] bg-primary px-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90",
            toast.classNames?.actionButton,
          )}
        >
          {toast.action.label}
        </button>
      ) : null}

      {switchButton}
    </div>
  )
}
