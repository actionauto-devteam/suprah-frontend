"use client";

/**
 * Full-viewport snowfall on a single <canvas>.
 *
 * - pointer-events: none → never blocks clicks, scrolling, or drag.
 * - z-[45]: above page content + sidebar, BELOW Radix dialogs/sheets/
 *   dropdowns (z-50), so modals stay clean.
 * - Flake count scales with viewport area (35–140), DPR capped at 2.
 * - Pauses entirely while the tab is hidden; off for prefers-reduced-motion.
 * - Icy blue flakes in light mode, white in dark mode (watches <html class>).
 */

import * as React from "react";
import { useChristmasEffects, usePrefersReducedMotion } from "./christmas-store";

type Flake = {
  x: number;
  y: number;
  r: number;      // radius px
  vy: number;     // fall speed px/s
  phase: number;  // sway phase
  sway: number;   // sway amplitude px
  swaySpeed: number;
  alpha: number;
};

export function ChristmasSnow({ className = "" }: { className?: string }) {
  const { enabled } = useChristmasEffects();
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const active = enabled && !reducedMotion;

  React.useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    const html = document.documentElement;
    let dark = html.classList.contains("dark");
    const themeObserver = new MutationObserver(() => {
      dark = html.classList.contains("dark");
    });
    themeObserver.observe(html, { attributes: true, attributeFilter: ["class"] });

    const makeFlake = (anywhere: boolean): Flake => {
      // Squared random → mostly small flakes, a few big foreground ones.
      const r = Math.random() ** 2 * 2.6 + 0.6;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -8 - Math.random() * 40,
        r,
        vy: 16 + r * 14 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        sway: 6 + Math.random() * 18,
        swaySpeed: 0.4 + Math.random() * 0.8,
        alpha: 0.35 + Math.random() * 0.55,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.round(Math.min(140, Math.max(35, (w * h) / 14000)));
      if (flakes.length > target) flakes = flakes.slice(0, target);
      while (flakes.length < target) flakes.push(makeFlake(true));
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // clamp after tab switches
      last = now;
      elapsed += dt;

      // Slow, layered gusts so the whole field drifts together.
      const wind = Math.sin(elapsed * 0.07) * 14 + Math.sin(elapsed * 0.23) * 5;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dark ? "#ffffff" : "#7fa6cf";

      for (const f of flakes) {
        f.y += f.vy * dt;
        f.x += wind * dt * (0.4 + f.r / 3); // bigger = closer = more drift
        f.phase += f.swaySpeed * dt;

        if (f.y - f.r > h) Object.assign(f, makeFlake(false));
        if (f.x < -30) f.x += w + 60;
        else if (f.x > w + 30) f.x -= w + 60;

        ctx.globalAlpha = dark ? f.alpha : f.alpha * 0.75;
        ctx.beginPath();
        ctx.arc(f.x + Math.sin(f.phase) * f.sway, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[45] print:hidden ${className}`}
    />
  );
}