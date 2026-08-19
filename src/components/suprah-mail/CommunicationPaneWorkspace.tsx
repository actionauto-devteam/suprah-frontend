"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";

export type PaneDropZone = "left" | "right" | "top" | "bottom";
export type PaneRows = string[][];

type DropHint = {
  targetPaneId: string;
  zone: PaneDropZone;
} | null;

type ResizeAxis = "horizontal" | "vertical";

type ResizeState =
  | {
      axis: "horizontal";
      pointerId: number;
      startClient: number;
      firstKey: string;
      secondKey: string;
      firstWeight: number;
      secondWeight: number;
      totalWeight: number;
      totalPixels: number;
      minPixels: number;
    }
  | {
      axis: "vertical";
      pointerId: number;
      startClient: number;
      firstKey: string;
      secondKey: string;
      firstWeight: number;
      secondWeight: number;
      totalWeight: number;
      totalPixels: number;
      minPixels: number;
    };

const GRID_COLUMNS = 240;
const COMPACT_PANE_WIDTH = 340;
const MIN_RESIZED_PANE_WIDTH = 280;
const MIN_RESIZED_ROW_HEIGHT = 160;

function normalizeRows(rows: PaneRows): PaneRows {
  return rows
    .map((row) => row.filter(Boolean))
    .filter((row) => row.length > 0);
}

export function movePaneInRows(
  rows: PaneRows,
  sourcePaneId: string,
  targetPaneId: string,
  zone: PaneDropZone,
): PaneRows {
  if (
    !sourcePaneId ||
    !targetPaneId ||
    sourcePaneId === targetPaneId
  ) {
    return rows;
  }

  const sourceExists = rows.some((row) => row.includes(sourcePaneId));
  const targetExists = rows.some((row) => row.includes(targetPaneId));
  if (!sourceExists || !targetExists) return rows;

  const withoutSource = normalizeRows(
    rows.map((row) => row.filter((paneId) => paneId !== sourcePaneId)),
  );

  const targetRowIndex = withoutSource.findIndex((row) =>
    row.includes(targetPaneId),
  );
  if (targetRowIndex < 0) return rows;

  const next = withoutSource.map((row) => [...row]);

  if (zone === "top" || zone === "bottom") {
    const insertAt =
      zone === "top" ? targetRowIndex : targetRowIndex + 1;
    next.splice(insertAt, 0, [sourcePaneId]);
    return normalizeRows(next);
  }

  const targetRow = next[targetRowIndex];
  const targetIndex = targetRow.indexOf(targetPaneId);
  const insertAt =
    zone === "left" ? targetIndex : targetIndex + 1;

  targetRow.splice(insertAt, 0, sourcePaneId);
  return normalizeRows(next);
}

function sameRows(a: PaneRows, b: PaneRows) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getDropZone(
  event: React.DragEvent<HTMLElement>,
  compactMode: boolean,
): PaneDropZone {
  const rect = event.currentTarget.getBoundingClientRect();
  const xRatio =
    rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5;
  const yRatio =
    rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;

  if (compactMode) {
    return yRatio < 0.5 ? "top" : "bottom";
  }

  if (yRatio <= 0.22) return "top";
  if (yRatio >= 0.78) return "bottom";
  return xRatio < 0.5 ? "left" : "right";
}

function DropPreview({ zone }: { zone: PaneDropZone }) {
  const position =
    zone === "left"
      ? "left-1 top-1 bottom-1 w-[48%]"
      : zone === "right"
        ? "right-1 top-1 bottom-1 w-[48%]"
        : zone === "top"
          ? "left-1 right-1 top-1 h-[30%]"
          : "left-1 right-1 bottom-1 h-[30%]";

  return (
    <div
      className={`pointer-events-none absolute z-40 rounded-xl border-2 border-emerald-400 bg-emerald-500/15 ${position}`}
      aria-hidden="true"
    />
  );
}

function safeWeight(value: number | undefined) {
  return Number.isFinite(value) && Number(value) > 0
    ? Number(value)
    : 1;
}

function rowKey(row: string[]) {
  // Horizontal reordering should not reset the row height.
  return `row:${[...row].sort().join("|")}`;
}

function allocateSpans(
  row: string[],
  paneWeights: Record<string, number>,
) {
  const weights = row.map((paneId) => safeWeight(paneWeights[paneId]));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const raw = weights.map(
    (weight) => (weight / totalWeight) * GRID_COLUMNS,
  );

  const spans = raw.map((value) => Math.max(1, Math.floor(value)));
  let used = spans.reduce((sum, span) => sum + span, 0);

  const fractions = raw
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
    }))
    .sort((a, b) => b.fraction - a.fraction);

  let cursor = 0;
  while (used < GRID_COLUMNS) {
    spans[fractions[cursor % fractions.length].index] += 1;
    cursor += 1;
    used += 1;
  }

  cursor = 0;
  while (used > GRID_COLUMNS) {
    const index =
      fractions[fractions.length - 1 - (cursor % fractions.length)].index;
    if (spans[index] > 1) {
      spans[index] -= 1;
      used -= 1;
    }
    cursor += 1;
  }

  return spans;
}

function clampPair(
  first: number,
  second: number,
  delta: number,
  minWeight: number,
) {
  const pairTotal = first + second;

  const nextFirst = Math.min(
    pairTotal - minWeight,
    Math.max(minWeight, first + delta),
  );

  return {
    first: nextFirst,
    second: pairTotal - nextFirst,
  };
}

export function CommunicationPaneWorkspace({
  rows,
  focusedPaneId,
  onFocusPane,
  onMovePane,
  renderHeader,
  renderContent,
}: {
  rows: PaneRows;
  focusedPaneId: string;
  onFocusPane: (paneId: string) => void;
  onMovePane: (
    sourcePaneId: string,
    targetPaneId: string,
    zone: PaneDropZone,
  ) => void;
  renderHeader: (
    paneId: string,
    options: { focused: boolean },
  ) => React.ReactNode;
  renderContent: (paneId: string) => React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const activeResizeRef = React.useRef<ResizeState | null>(null);

  const [workspaceWidth, setWorkspaceWidth] = React.useState(0);
  const [workspaceHeight, setWorkspaceHeight] = React.useState(0);
  const [draggingPaneId, setDraggingPaneId] = React.useState<string | null>(
    null,
  );
  const [dropHint, setDropHint] = React.useState<DropHint>(null);
  const [resizeAxis, setResizeAxis] =
    React.useState<ResizeAxis | null>(null);

  // Pane width weights are keyed by pane id so horizontal drag/drop relocation
  // does not erase the user's preferred relative pane width.
  const [paneWidthWeights, setPaneWidthWeights] = React.useState<
    Record<string, number>
  >({});

  // Row heights are keyed by the set of panes in the row. Moving a pane into
  // a different row intentionally creates a fresh default height for that row.
  const [rowHeightWeights, setRowHeightWeights] = React.useState<
    Record<string, number>
  >({});

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setWorkspaceWidth(rect.width);
      setWorkspaceHeight(rect.height);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const normalizedRows = React.useMemo(
    () => normalizeRows(rows),
    [rows],
  );

  const maxColumns = Math.max(
    1,
    ...normalizedRows.map((row) => row.length),
  );

  const compactMode =
    maxColumns > 1 &&
    workspaceWidth > 0 &&
    workspaceWidth / maxColumns < COMPACT_PANE_WIDTH;

  const visualRows = React.useMemo<PaneRows>(() => {
    if (!compactMode) return normalizedRows;

    return normalizedRows.flatMap((row) =>
      row.map((paneId) => [paneId]),
    );
  }, [compactMode, normalizedRows]);

  const visualRowKeys = React.useMemo(
    () => visualRows.map(rowKey),
    [visualRows],
  );

  const handleDrop = (
    targetPaneId: string,
    zone: PaneDropZone,
  ) => {
    if (!draggingPaneId || draggingPaneId === targetPaneId) {
      setDropHint(null);
      return;
    }

    const preview = movePaneInRows(
      normalizedRows,
      draggingPaneId,
      targetPaneId,
      zone,
    );

    if (!sameRows(preview, normalizedRows)) {
      onMovePane(draggingPaneId, targetPaneId, zone);
    }

    setDropHint(null);
    setDraggingPaneId(null);
  };

  const placements = React.useMemo(() => {
    return visualRows.flatMap((row, rowIndex) => {
      const spans = allocateSpans(row, paneWidthWeights);

      let columnStart = 1;
      return row.map((paneId, columnIndex) => {
        const placement = {
          paneId,
          rowIndex,
          columnIndex,
          columnStart,
          columnSpan: spans[columnIndex],
        };

        columnStart += spans[columnIndex];
        return placement;
      });
    });
  }, [paneWidthWeights, visualRows]);

  const gridTemplateRows = React.useMemo(
    () =>
      visualRowKeys
        .map(
          (key) =>
            `minmax(0, ${safeWeight(rowHeightWeights[key])}fr)`,
        )
        .join(" "),
    [rowHeightWeights, visualRowKeys],
  );

  const beginHorizontalResize = (
    event: React.PointerEvent<HTMLDivElement>,
    rowIndex: number,
    firstPaneId: string,
    secondPaneId: string,
  ) => {
    if (compactMode) return;

    const row = visualRows[rowIndex];
    const totalPixels = workspaceWidth;
    if (!row || totalPixels <= 0) return;

    const totalWeight = row.reduce(
      (sum, paneId) =>
        sum + safeWeight(paneWidthWeights[paneId]),
      0,
    );

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    activeResizeRef.current = {
      axis: "horizontal",
      pointerId: event.pointerId,
      startClient: event.clientX,
      firstKey: firstPaneId,
      secondKey: secondPaneId,
      firstWeight: safeWeight(paneWidthWeights[firstPaneId]),
      secondWeight: safeWeight(paneWidthWeights[secondPaneId]),
      totalWeight,
      totalPixels,
      minPixels: MIN_RESIZED_PANE_WIDTH,
    };

    setResizeAxis("horizontal");
  };

  const beginVerticalResize = (
    event: React.PointerEvent<HTMLDivElement>,
    firstRowKey: string,
    secondRowKey: string,
  ) => {
    const totalPixels = workspaceHeight;
    if (totalPixels <= 0) return;

    const totalWeight = visualRowKeys.reduce(
      (sum, key) =>
        sum + safeWeight(rowHeightWeights[key]),
      0,
    );

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    activeResizeRef.current = {
      axis: "vertical",
      pointerId: event.pointerId,
      startClient: event.clientY,
      firstKey: firstRowKey,
      secondKey: secondRowKey,
      firstWeight: safeWeight(rowHeightWeights[firstRowKey]),
      secondWeight: safeWeight(rowHeightWeights[secondRowKey]),
      totalWeight,
      totalPixels,
      minPixels: MIN_RESIZED_ROW_HEIGHT,
    };

    setResizeAxis("vertical");
  };

  const handleResizeMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const state = activeResizeRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const deltaPixels =
      state.axis === "horizontal"
        ? event.clientX - state.startClient
        : event.clientY - state.startClient;

    const deltaWeight =
      (deltaPixels / Math.max(1, state.totalPixels)) *
      state.totalWeight;

    const minWeight =
      (state.minPixels / Math.max(1, state.totalPixels)) *
      state.totalWeight;

    const pair = clampPair(
      state.firstWeight,
      state.secondWeight,
      deltaWeight,
      Math.min(
        minWeight,
        (state.firstWeight + state.secondWeight) / 2 - 0.001,
      ),
    );

    if (state.axis === "horizontal") {
      setPaneWidthWeights((current) => ({
        ...current,
        [state.firstKey]: pair.first,
        [state.secondKey]: pair.second,
      }));
      return;
    }

    setRowHeightWeights((current) => ({
      ...current,
      [state.firstKey]: pair.first,
      [state.secondKey]: pair.second,
    }));
  };

  const endResize = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const state = activeResizeRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activeResizeRef.current = null;
    setResizeAxis(null);
  };

  const rowBoundaryPositions = React.useMemo(() => {
    if (visualRowKeys.length <= 1) return [];

    const weights = visualRowKeys.map((key) =>
      safeWeight(rowHeightWeights[key]),
    );
    const total = weights.reduce((sum, weight) => sum + weight, 0);

    let running = 0;
    return weights.slice(0, -1).map((weight) => {
      running += weight;
      return (running / total) * 100;
    });
  }, [rowHeightWeights, visualRowKeys]);

  return (
    <div
      ref={containerRef}
      className={`relative grid min-h-0 min-w-0 flex-1 gap-1 overflow-hidden bg-[var(--border-1)] ${
        resizeAxis === "horizontal"
          ? "cursor-col-resize"
          : resizeAxis === "vertical"
            ? "cursor-row-resize"
            : ""
      }`}
      style={{
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
        gridTemplateRows:
          gridTemplateRows ||
          "minmax(0, 1fr)",
      }}
      data-pane-layout={compactMode ? "compact" : "desktop"}
    >
      {placements.map(
        ({
          paneId,
          rowIndex,
          columnIndex,
          columnStart,
          columnSpan,
        }) => {
          const focused = paneId === focusedPaneId;
          const hint =
            dropHint?.targetPaneId === paneId
              ? dropHint.zone
              : null;
          const row = visualRows[rowIndex];
          const nextPaneId = row?.[columnIndex + 1];

          return (
            <section
              key={paneId}
              className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--bg-base)]"
              style={{
                gridRowStart: rowIndex + 1,
                gridColumnStart: columnStart,
                gridColumnEnd: `span ${columnSpan}`,
                boxShadow: focused
                  ? "inset 0 0 0 1px rgba(52,201,125,0.34)"
                  : "inset 0 0 0 1px var(--border-1)",
              }}
              onClick={() => onFocusPane(paneId)}
              onDragEnter={(event) => {
                if (
                  resizeAxis ||
                  !draggingPaneId ||
                  draggingPaneId === paneId
                ) {
                  return;
                }

                event.preventDefault();
                setDropHint({
                  targetPaneId: paneId,
                  zone: getDropZone(event, compactMode),
                });
              }}
              onDragOver={(event) => {
                if (
                  resizeAxis ||
                  !draggingPaneId ||
                  draggingPaneId === paneId
                ) {
                  return;
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropHint({
                  targetPaneId: paneId,
                  zone: getDropZone(event, compactMode),
                });
              }}
              onDrop={(event) => {
                if (resizeAxis) return;

                event.preventDefault();
                const zone =
                  dropHint?.targetPaneId === paneId
                    ? dropHint.zone
                    : getDropZone(event, compactMode);

                handleDrop(paneId, zone);
              }}
            >
              <div
                draggable={!resizeAxis}
                onDragStart={(event) => {
                  if (resizeAxis) {
                    event.preventDefault();
                    return;
                  }

                  setDraggingPaneId(paneId);
                  onFocusPane(paneId);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", paneId);
                }}
                onDragEnd={() => {
                  setDraggingPaneId(null);
                  setDropHint(null);
                }}
                className={`flex h-10 shrink-0 cursor-grab select-none items-center gap-1.5 border-b px-2.5 active:cursor-grabbing ${
                  focused
                    ? "border-emerald-500/30 bg-emerald-500/[0.09]"
                    : "border-border/60 bg-[var(--bg-elevated)]"
                }`}
                title="Hold and drag this pane header to relocate it"
              >
                <GripVertical
                  className={`size-3.5 shrink-0 ${
                    focused
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  {renderHeader(paneId, { focused })}
                </div>
              </div>

              <div
                className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
                style={{ containerType: "inline-size" }}
              >
                {renderContent(paneId)}
              </div>

              {!compactMode && nextPaneId && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize adjacent panes"
                  title="Drag to resize panes"
                  className="group absolute -right-[4px] top-0 bottom-0 z-50 w-[9px] cursor-col-resize touch-none"
                  onPointerDown={(event) =>
                    beginHorizontalResize(
                      event,
                      rowIndex,
                      paneId,
                      nextPaneId,
                    )
                  }
                  onPointerMove={handleResizeMove}
                  onPointerUp={endResize}
                  onPointerCancel={endResize}
                >
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-emerald-500/70" />
                </div>
              )}

              {hint && <DropPreview zone={hint} />}
            </section>
          );
        },
      )}

      {rowBoundaryPositions.map((topPercent, index) => (
        <div
          key={`row-resizer-${visualRowKeys[index]}-${visualRowKeys[index + 1]}`}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize pane rows"
          title="Drag to resize pane rows"
          className="group absolute left-0 right-0 z-[60] h-[9px] -translate-y-1/2 cursor-row-resize touch-none"
          style={{ top: `${topPercent}%` }}
          onPointerDown={(event) =>
            beginVerticalResize(
              event,
              visualRowKeys[index],
              visualRowKeys[index + 1],
            )
          }
          onPointerMove={handleResizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-transparent transition-colors group-hover:bg-emerald-500/70" />
        </div>
      ))}
    </div>
  );
}