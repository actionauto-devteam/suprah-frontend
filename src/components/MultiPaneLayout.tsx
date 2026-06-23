"use client"

import * as React from "react"
import { useFullscreen, TabOption } from "@/components/FullscreenProvider"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Maximize2, Minimize2, Plus,
  GripVertical, X, ChevronDown, PanelRightClose,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ─── Resizable Divider ──────────────────────────────────────────────────────

function ResizeDivider({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const [isDragging, setIsDragging] = React.useState(false)

  React.useEffect(() => {
    if (!isDragging) return
    const move = (e: MouseEvent) => { e.preventDefault(); onDrag(e.movementX) }
    const up = () => setIsDragging(false)
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
  }, [isDragging, onDrag])

  const lastTouchX = React.useRef(0)
  React.useEffect(() => {
    if (!isDragging) return
    const move = (e: TouchEvent) => {
      e.preventDefault()
      const delta = e.touches[0].clientX - lastTouchX.current
      lastTouchX.current = e.touches[0].clientX
      onDrag(delta)
    }
    const end = () => setIsDragging(false)
    window.addEventListener("touchmove", move, { passive: false })
    window.addEventListener("touchend", end)
    return () => { window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end) }
  }, [isDragging, onDrag])

  return (
    <div
      onMouseDown={(e) => { e.preventDefault(); setIsDragging(true) }}
      onTouchStart={(e) => { lastTouchX.current = e.touches[0].clientX; setIsDragging(true) }}
      className={`
        relative shrink-0 w-1.5 cursor-col-resize
        flex items-center justify-center group/divider z-10
        transition-colors duration-150
        ${isDragging ? "bg-emerald-500/20" : "hover:bg-muted/60"}
      `}
    >
      <div className={`
        flex flex-col items-center gap-0.5 rounded-full px-0.75 py-2 transition-all duration-150
        ${isDragging
          ? "bg-emerald-500 text-white shadow-sm"
          : "bg-border/60 text-muted-foreground/40 group-hover/divider:bg-emerald-500/60 group-hover/divider:text-white"
        }
      `}>
        <GripVertical className="h-3 w-3" />
      </div>
      <div className="absolute inset-y-0 -left-2.5 -right-2.5" />
    </div>
  )
}

// ─── Toolbar (header buttons) ────────────────────────────────────────────────

export function PaneToolbar({ tabOptions }: { tabOptions: TabOption[] }) {
  const {
    isFullscreen, toggleFullscreen,
    isMultiPane, panes, addPane, resetToSinglePane,
  } = useFullscreen()
  const isMobile = useIsMobile()

  return (
    <div className="flex items-center gap-1.5">
      {/* Fullscreen toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className={`h-9 w-9 p-0 rounded-lg transition-all ${isFullscreen
                ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white"
                : "border-border/50 hover:border-emerald-500/40"
              }`}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
        </TooltipContent>
      </Tooltip>

      {/* Add Pane / split-screen — too cramped to be usable on phone screens, tablet+ only */}
      {isFullscreen && !isMobile && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2.5 rounded-lg gap-1.5 text-xs border-border/50 hover:border-emerald-500/40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Pane</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl z-200">
              <div className="px-2 py-1.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
                  Open in new pane
                </p>
              </div>
              {tabOptions.map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => addPane(tab.id)}
                  className="text-xs gap-2 cursor-pointer"
                >
                  {tab.icon}
                  {tab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Single View reset — only when multi-pane */}
          {isMultiPane && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToSinglePane}
                  className="h-9 px-2.5 rounded-lg gap-1.5 text-xs border-border/50 hover:border-emerald-500/40"
                >
                  <PanelRightClose className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Single View</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs z-200">
                Close all extra panes
              </TooltipContent>
            </Tooltip>
          )}

          {isMultiPane && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold rounded-full">
              {panes.length} panes
            </Badge>
          )}
        </>
      )}
    </div>
  )
}

// ─── Multi-Pane Container ────────────────────────────────────────────────────

export function MultiPaneContainer({
  tabOptions,
  renderTab,
}: {
  tabOptions: TabOption[]
  renderTab: (tabId: string) => React.ReactNode
}) {
  const { panes, setPaneTab, removePane, resizePane, isMultiPane, resetToSinglePane } = useFullscreen()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  // A multi-pane layout persisted from a prior desktop session is unusable on
  // a phone — collapse it back to a single pane the moment we detect mobile.
  React.useEffect(() => {
    if (isMobile && isMultiPane) resetToSinglePane()
  }, [isMobile, isMultiPane, resetToSinglePane])

  const totalSize = panes.reduce((s, p) => s + p.size, 0)

  const handleDrag = React.useCallback(
    (leftId: string, rightId: string, deltaX: number) => {
      if (!containerRef.current) return
      const w = containerRef.current.getBoundingClientRect().width
      const deltaPct = (deltaX / w) * 100

      const left = panes.find((p) => p.id === leftId)
      const right = panes.find((p) => p.id === rightId)
      if (!left || !right) return

      const lNorm = (left.size / totalSize) * 100
      const rNorm = (right.size / totalSize) * 100
      const newL = lNorm + deltaPct
      const newR = rNorm - deltaPct

      if (newL >= 15 && newR >= 15) {
        resizePane(leftId, (newL / 100) * totalSize)
        resizePane(rightId, (newR / 100) * totalSize)
      }
    },
    [panes, totalSize, resizePane]
  )

  // ── Single pane: show tab bar so user can navigate ──
  if (!isMultiPane) {
    const singlePane = panes[0]
    if (!singlePane) return null

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/40 bg-muted/20 shrink-0 overflow-x-auto">
          {tabOptions.map((tab) => {
            const isActive = tab.id === singlePane.selectedTab
            return (
              <button
                key={tab.id}
                onClick={() => setPaneTab(singlePane.id, tab.id)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all whitespace-nowrap
                  ${isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderTab(singlePane.selectedTab)}
        </div>
      </div>
    )
  }

  // ── Multi-pane: side by side, each with own tab selector ──
  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden rounded-xl border border-border/50"
    >
      {panes.map((pane, idx) => {
        const normalizedSize = (pane.size / totalSize) * 100
        const currentTab = tabOptions.find((t) => t.id === pane.selectedTab)

        return (
          <React.Fragment key={pane.id}>
            <div
              className="flex flex-col overflow-hidden min-w-0"
              style={{ flexBasis: `${normalizedSize}%`, flexGrow: 0, flexShrink: 0 }}
            >
              {/* Pane header with tab selector */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/20 shrink-0 gap-2">
                {/* Tab selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted/40 transition-colors text-left min-w-0">
                      {currentTab?.icon}
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/70 truncate">
                        {currentTab?.label || pane.selectedTab}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 rounded-xl z-200">
                    <div className="px-2 py-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
                        Switch tab
                      </p>
                    </div>
                    {tabOptions.map((tab) => (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => setPaneTab(pane.id, tab.id)}
                        className={`text-xs gap-2 cursor-pointer ${tab.id === pane.selectedTab ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : ""
                          }`}
                      >
                        {tab.icon}
                        {tab.label}
                        {tab.id === pane.selectedTab && (
                          <span className="ml-auto text-[9px] font-bold text-emerald-600">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] tabular-nums text-muted-foreground/30 font-mono">
                    {Math.round(normalizedSize)}%
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => removePane(pane.id)}
                        className="p-1 rounded-md hover:bg-rose-500/10 hover:text-rose-600 transition-colors text-muted-foreground/40"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs z-200">
                      Close pane
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Pane content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {renderTab(pane.selectedTab)}
              </div>
            </div>

            {/* Divider */}
            {idx < panes.length - 1 && (
              <ResizeDivider
                onDrag={(deltaX) => handleDrag(pane.id, panes[idx + 1].id, deltaX)}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Fullscreen Wrapper ──────────────────────────────────────────────────────
//
// IMPORTANT: z-40 (not z-[100])
// Radix UI portals (dropdowns, tooltips, dialogs) render on document.body
// with z-50. If this wrapper uses z-[100], those portals appear BEHIND it
// and are invisible / unclickable. z-40 keeps fullscreen above normal
// content while letting Radix portals render on top.

export function FullscreenWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  const { isFullscreen } = useFullscreen()

  if (!isFullscreen) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      className={`
        fixed inset-0 z-40 bg-background
        flex flex-col overflow-hidden
        animate-in fade-in zoom-in-[0.98] duration-200
        ${className}
      `}
    >
      {children}
    </div>
  )
}
