"use client";

import * as React from "react";

type Point = { x: number; y: number };

const MARGIN = 8;
const THRESHOLD = 4;

const readStored = (key: string): Point | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { x, y } = parsed as Partial<Point>;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x: x as number, y: y as number };
  } catch {
    return null;
  }
};

export function useDraggableWidget<T extends HTMLElement = HTMLDivElement>(storageKey: string) {
  const nodeRef = React.useRef<T | null>(null);
  const posRef = React.useRef<Point | null>(null);
  const drag = React.useRef({ px: 0, py: 0, ox: 0, oy: 0, moved: false });
  const [pos, setPos] = React.useState<Point | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const apply = React.useCallback((p: Point | null) => {
    posRef.current = p;
    setPos(p);
  }, []);

  const clamp = React.useCallback((p: Point): Point => {
    const el = nodeRef.current;
    const maxX = Math.max(MARGIN, window.innerWidth - (el?.offsetWidth ?? 0) - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - (el?.offsetHeight ?? 0) - MARGIN);
    return {
      x: Math.min(Math.max(p.x, MARGIN), maxX),
      y: Math.min(Math.max(p.y, MARGIN), maxY),
    };
  }, []);

  React.useEffect(() => {
    const stored = readStored(storageKey);
    if (stored) apply(clamp(stored));
  }, [storageKey, apply, clamp]);

  React.useEffect(() => {
    const refit = () => {
      if (posRef.current) apply(clamp(posRef.current));
    };
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    const ro = nodeRef.current ? new ResizeObserver(refit) : null;
    if (ro && nodeRef.current) ro.observe(nodeRef.current);
    return () => {
      window.removeEventListener("resize", refit);
      window.removeEventListener("orientationchange", refit);
      ro?.disconnect();
    };
  }, [apply, clamp]);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = nodeRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { px: e.clientX, py: e.clientY, ox: r.left, oy: r.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    apply({ x: r.left, y: r.top });
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragging) return;
    const d = drag.current;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < THRESHOLD) return;
    d.moved = true;
    apply(clamp({ x: d.ox + dx, y: d.oy + dy }));
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!drag.current.moved || !posRef.current) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(posRef.current));
    } catch {
      /* storage unavailable — position stays for this session only */
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!drag.current.moved) return;
    drag.current.moved = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const style: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : {};

  return {
    nodeRef,
    dragging,
    positioned: pos !== null,
    style,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
      style: {
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
      } as React.CSSProperties,
    },
  };
}

export default useDraggableWidget;
