"use client";

import * as React from "react";

type Anchor = { ax: "left" | "right"; ay: "top" | "bottom"; ox: number; oy: number };
type Live = { x: number; y: number };

const MARGIN = 8;
const THRESHOLD = 4;

const readStored = (key: string): Anchor | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { ax, ay, ox, oy } = parsed as Partial<Anchor>;
    if (ax !== "left" && ax !== "right") return null;
    if (ay !== "top" && ay !== "bottom") return null;
    if (!Number.isFinite(ox) || !Number.isFinite(oy)) return null;
    return { ax, ay, ox: ox as number, oy: oy as number };
  } catch {
    return null;
  }
};

export function useDraggableWidget<T extends HTMLElement = HTMLDivElement>(storageKey: string) {
  const nodeRef = React.useRef<T | null>(null);
  const anchorRef = React.useRef<Anchor | null>(null);
  const liveRef = React.useRef<Live | null>(null);
  const roRef = React.useRef<ResizeObserver | null>(null);
  const drag = React.useRef({ px: 0, py: 0, ox: 0, oy: 0, moved: false, active: false });

  const [anchor, setAnchor] = React.useState<Anchor | null>(null);
  const [live, setLive] = React.useState<Live | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const size = React.useCallback(() => ({
    w: nodeRef.current?.offsetWidth ?? 0,
    h: nodeRef.current?.offsetHeight ?? 0,
  }), []);

  const clampAnchor = React.useCallback((a: Anchor): Anchor => {
    const { w, h } = size();
    return {
      ...a,
      ox: Math.min(Math.max(a.ox, MARGIN), Math.max(MARGIN, window.innerWidth - w - MARGIN)),
      oy: Math.min(Math.max(a.oy, MARGIN), Math.max(MARGIN, window.innerHeight - h - MARGIN)),
    };
  }, [size]);

  const toAnchor = React.useCallback((p: Live): Anchor => {
    const { w, h } = size();
    const ax = p.x + w / 2 > window.innerWidth / 2 ? "right" : "left";
    const ay = p.y + h / 2 > window.innerHeight / 2 ? "bottom" : "top";
    return clampAnchor({
      ax,
      ay,
      ox: ax === "left" ? p.x : window.innerWidth - (p.x + w),
      oy: ay === "top" ? p.y : window.innerHeight - (p.y + h),
    });
  }, [size, clampAnchor]);

  const commit = React.useCallback((a: Anchor) => {
    anchorRef.current = a;
    setAnchor(a);
  }, []);

  const putLive = React.useCallback((p: Live | null) => {
    liveRef.current = p;
    setLive(p);
  }, []);

  const refit = React.useCallback(() => {
    if (anchorRef.current && !drag.current.active) commit(clampAnchor(anchorRef.current));
  }, [commit, clampAnchor]);

  React.useEffect(() => {
    const stored = readStored(storageKey);
    if (stored) commit(clampAnchor(stored));
  }, [storageKey, commit, clampAnchor]);

  React.useEffect(() => {
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    return () => {
      window.removeEventListener("resize", refit);
      window.removeEventListener("orientationchange", refit);
    };
  }, [refit]);

  const setNode = React.useCallback((el: T | null) => {
    nodeRef.current = el;
    roRef.current?.disconnect();
    roRef.current = null;
    if (el && typeof ResizeObserver !== "undefined") {
      roRef.current = new ResizeObserver(refit);
      roRef.current.observe(el);
    }
  }, [refit]);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = nodeRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      ox: r.left,
      oy: r.top,
      moved: false,
      active: true,
    };

    const onMove = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = ev.clientX - d.px;
      const dy = ev.clientY - d.py;
      if (!d.moved && Math.hypot(dx, dy) < THRESHOLD) return;
      if (!d.moved) {
        d.moved = true;
        setDragging(true);
      }
      const { w, h } = size();
      putLive({
        x: Math.min(Math.max(d.ox + dx, MARGIN), Math.max(MARGIN, window.innerWidth - w - MARGIN)),
        y: Math.min(Math.max(d.oy + dy, MARGIN), Math.max(MARGIN, window.innerHeight - h - MARGIN)),
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      drag.current.active = false;
      setDragging(false);

      const dropped = liveRef.current;
      putLive(null);
      if (!drag.current.moved || !dropped) return;

      const next = toAnchor(dropped);
      commit(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage unavailable — position holds for this session only */
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!drag.current.moved) return;
    drag.current.moved = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const style: React.CSSProperties = live
    ? { position: "fixed", left: live.x, top: live.y, right: "auto", bottom: "auto" }
    : anchor
      ? {
          position: "fixed",
          left: anchor.ax === "left" ? anchor.ox : "auto",
          right: anchor.ax === "right" ? anchor.ox : "auto",
          top: anchor.ay === "top" ? anchor.oy : "auto",
          bottom: anchor.ay === "bottom" ? anchor.oy : "auto",
        }
      : {};

  return {
    setNode,
    nodeRef,
    dragging,
    positioned: anchor !== null || live !== null,
    style,
    handleProps: {
      onPointerDown,
      onClickCapture,
      style: {
        touchAction: "none",
        userSelect: "none",
        cursor: dragging ? "grabbing" : "grab",
      } as React.CSSProperties,
    },
  };
}

export default useDraggableWidget;
