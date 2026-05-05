'use client'

/**
 * /crm/supra-leo/page.tsx
 * Full-screen Autrix AI chat page — redesigned to match SupraLeoPanel theme.
 * Green-accent automotive intelligence dashboard. Dark + Light mode support.
 */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Send, Square, Trash2,
  Loader2, Calendar, Clock, MessageSquare,
  Fingerprint, Rss, User, Zap,
  ChevronRight, RefreshCw,
} from 'lucide-react'
import { SupraLeoAvatar } from '@/components/supra-leo-ai/SupraLeoAvatar'
import { useSupraLeoChat, ChatModule, ChatMessage } from '@/hooks/useSupraLeoChat'
import { apiClient } from '@/lib/api-client'

// ─── Inject Styles ────────────────────────────────────────────────────────────
const PAGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

/* ── Dark tokens (default) ── */
[data-axp-page] {
  --p-bg:       #030a05;
  --p-bg2:      #061009;
  --p-surf:     #091810;
  --p-surf2:    #0d2016;
  --p-surf3:    #11291b;
  --p-bd:       rgba(34,197,94,0.15);
  --p-bd2:      rgba(34,197,94,0.07);
  --p-bd3:      rgba(255,255,255,0.04);
  --p-acc:      #22c55e;
  --p-acc2:     #4ade80;
  --p-acc3:     #86efac;
  --p-acc-dim:  rgba(34,197,94,0.12);
  --p-tx:       rgba(220,255,235,0.95);
  --p-tx2:      rgba(134,203,160,0.72);
  --p-tx3:      rgba(74,163,112,0.42);
  --p-green:    #22c55e;
  --p-red:      #f87171;
  --p-amber:    #fbbf24;
  --p-blue:     #60a5fa;
  --p-purple:   #a78bfa;
  --p-teal:     #34d399;
  --p-sh:       0 4px 24px rgba(0,0,0,0.7), 0 1px 0 rgba(34,197,94,0.1);
  --p-glow:     0 0 60px rgba(34,197,94,0.06);
  --p-glass:    rgba(6,16,9,0.94);
  --p-grad:     linear-gradient(135deg, #091810 0%, #061009 100%);
  font-family: 'Space Grotesk', sans-serif;
  -webkit-font-smoothing: antialiased;
  color-scheme: dark;
  background: var(--p-bg);
  color: var(--p-tx);
}

/* ── Light mode via media query ── */
@media (prefers-color-scheme: light) {
  [data-axp-page] {
    --p-bg:       #f0faf4;
    --p-bg2:      #e6f7ec;
    --p-surf:     #ffffff;
    --p-surf2:    #f4fcf7;
    --p-surf3:    #edf8f2;
    --p-bd:       rgba(22,163,74,0.18);
    --p-bd2:      rgba(22,163,74,0.09);
    --p-bd3:      rgba(0,0,0,0.06);
    --p-acc:      #16a34a;
    --p-acc2:     #15803d;
    --p-acc3:     #166534;
    --p-acc-dim:  rgba(22,163,74,0.10);
    --p-tx:       #052e16;
    --p-tx2:      rgba(5,46,22,0.68);
    --p-tx3:      rgba(5,46,22,0.38);
    --p-green:    #16a34a;
    --p-red:      #dc2626;
    --p-amber:    #d97706;
    --p-blue:     #2563eb;
    --p-purple:   #7c3aed;
    --p-teal:     #0d9488;
    --p-sh:       0 4px 20px rgba(0,0,0,0.08), 0 1px 0 rgba(22,163,74,0.12);
    --p-glow:     0 0 60px rgba(22,163,74,0.06);
    --p-glass:    rgba(255,255,255,0.97);
    --p-grad:     linear-gradient(135deg, #ffffff 0%, #f4fcf7 100%);
    color-scheme: light;
  }
}

/* ── .dark class override ── */
.dark [data-axp-page] {
  --p-bg:       #030a05;
  --p-bg2:      #061009;
  --p-surf:     #091810;
  --p-surf2:    #0d2016;
  --p-surf3:    #11291b;
  --p-bd:       rgba(34,197,94,0.15);
  --p-bd2:      rgba(34,197,94,0.07);
  --p-bd3:      rgba(255,255,255,0.04);
  --p-acc:      #22c55e;
  --p-acc2:     #4ade80;
  --p-acc3:     #86efac;
  --p-acc-dim:  rgba(34,197,94,0.12);
  --p-tx:       rgba(220,255,235,0.95);
  --p-tx2:      rgba(134,203,160,0.72);
  --p-tx3:      rgba(74,163,112,0.42);
  --p-green:    #22c55e;
  --p-red:      #f87171;
  --p-amber:    #fbbf24;
  --p-sh:       0 4px 24px rgba(0,0,0,0.7), 0 1px 0 rgba(34,197,94,0.1);
  --p-glow:     0 0 60px rgba(34,197,94,0.08);
  --p-glass:    rgba(6,16,9,0.94);
  --p-grad:     linear-gradient(135deg, #091810 0%, #061009 100%);
  color-scheme: dark;
}

/* ── .light class override ── */
.light [data-axp-page] {
  --p-bg:       #f0faf4;
  --p-bg2:      #e6f7ec;
  --p-surf:     #ffffff;
  --p-surf2:    #f4fcf7;
  --p-surf3:    #edf8f2;
  --p-bd:       rgba(22,163,74,0.18);
  --p-bd2:      rgba(22,163,74,0.09);
  --p-bd3:      rgba(0,0,0,0.06);
  --p-acc:      #16a34a;
  --p-acc2:     #15803d;
  --p-acc3:     #166534;
  --p-acc-dim:  rgba(22,163,74,0.10);
  --p-tx:       #052e16;
  --p-tx2:      rgba(5,46,22,0.68);
  --p-tx3:      rgba(5,46,22,0.38);
  --p-green:    #16a34a;
  --p-red:      #dc2626;
  --p-amber:    #d97706;
  --p-blue:     #2563eb;
  --p-sh:       0 4px 20px rgba(0,0,0,0.08), 0 1px 0 rgba(22,163,74,0.12);
  --p-glow:     0 0 60px rgba(22,163,74,0.06);
  --p-glass:    rgba(255,255,255,0.97);
  --p-grad:     linear-gradient(135deg, #ffffff 0%, #f4fcf7 100%);
  color-scheme: light;
}

/* ── Animations ── */
@keyframes axpg-in      { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes axpg-dot     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.2;transform:scale(.6)} }
@keyframes axpg-spin    { to{transform:rotate(360deg)} }
@keyframes axpg-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes axpg-blink   { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes axpg-msg     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes axpg-scan    { 0%{transform:translateY(-100%);opacity:.35} 100%{transform:translateY(600%);opacity:0} }
@keyframes axpg-wave    { 0%,100%{transform:scaleY(.12)} 50%{transform:scaleY(1)} }
@keyframes axpg-pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes axpg-slide-r { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }

[data-axp-page] *, [data-axp-page] *::before, [data-axp-page] *::after { box-sizing: border-box; }

/* ── Layout shell ── */
.apg-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  position: relative;
}

/* ── Background grid ── */
.apg-grid-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
  opacity: 0.022;
}

/* ── Shimmer bar ── */
.apg-shimmer {
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(34,197,94,0.4) 25%,
    rgba(134,239,172,0.9) 50%,
    rgba(34,197,94,0.4) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: axpg-shimmer 3.5s linear infinite;
  flex-shrink: 0;
}

/* ── Top bar ── */
.apg-topbar {
  background: var(--p-glass);
  border-bottom: 1px solid var(--p-bd);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.apg-topbar-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  position: relative;
}

/* Diagonal accent */
.apg-topbar-inner::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 240px;
  background: linear-gradient(270deg, var(--p-acc-dim) 0%, transparent 100%);
  pointer-events: none;
}

.apg-back-btn {
  width: 34px; height: 34px;
  border: 1px solid var(--p-bd2);
  border-radius: 10px;
  background: none;
  cursor: pointer;
  color: var(--p-tx3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all .18s;
  padding: 0;
  position: relative;
  z-index: 1;
}
.apg-back-btn:hover {
  border-color: var(--p-bd);
  background: var(--p-acc-dim);
  color: var(--p-acc2);
}

.apg-brand {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.apg-brand-name {
  font-family: 'Exo 2', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: var(--p-acc2);
  letter-spacing: .07em;
  line-height: 1;
  text-transform: uppercase;
}

.apg-brand-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--p-tx3);
  margin-top: 3px;
  display: block;
}

.apg-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--p-bd2);
  border-radius: 6px;
  background: var(--p-acc-dim);
  position: relative;
  z-index: 1;
}

.apg-status-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--p-green);
  box-shadow: 0 0 6px rgba(34,197,94,.7);
  animation: axpg-pulse 2s ease-in-out infinite;
}

.apg-status-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--p-acc2);
}

.apg-msg-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px;
  letter-spacing: .1em;
  color: var(--p-tx3);
  position: relative;
  z-index: 1;
}

.apg-icon-btn {
  width: 34px; height: 34px;
  border: 1px solid var(--p-bd2);
  border-radius: 10px;
  background: none;
  cursor: pointer;
  color: var(--p-tx3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all .18s;
  padding: 0;
  position: relative;
  z-index: 1;
}
.apg-icon-btn:hover {
  border-color: var(--p-bd);
  background: var(--p-acc-dim);
  color: var(--p-acc2);
}
.apg-icon-btn.dng:hover {
  border-color: rgba(248,113,113,.3);
  background: rgba(248,113,113,.07);
  color: var(--p-red);
}

/* ── Module pills row ── */
.apg-modules {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px 12px;
  overflow-x: auto;
  scrollbar-width: none;
}
.apg-modules::-webkit-scrollbar { display: none; }

.apg-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  height: 28px;
  border-radius: 99px;
  border: 1px solid var(--p-bd2);
  background: transparent;
  cursor: pointer;
  transition: all .18s;
  color: var(--p-tx3);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: .03em;
}
.apg-pill:hover {
  border-color: var(--p-bd);
  color: var(--p-tx2);
  background: var(--p-surf2);
}
.apg-pill.active {
  border-color: rgba(34,197,94,.35);
  color: var(--p-acc2);
  background: rgba(34,197,94,.1);
  font-weight: 600;
}

/* ── Messages scroll area ── */
.apg-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 0;
  min-height: 0;
  position: relative;
  z-index: 1;
}
.apg-messages::-webkit-scrollbar { width: 3px; }
.apg-messages::-webkit-scrollbar-track { background: transparent; }
.apg-messages::-webkit-scrollbar-thumb { background: var(--p-bd); border-radius: 2px; }

/* ── Message rows ── */
.apg-msg-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 0 20px;
  animation: axpg-msg .22s cubic-bezier(.16,1,.3,1) forwards;
}
.apg-msg-row.user { flex-direction: row-reverse; }

.apg-avatar-wrap { flex-shrink: 0; margin-bottom: 2px; }

.apg-user-avatar {
  width: 30px; height: 30px;
  border-radius: 9px;
  border: 1px solid rgba(34,197,94,.22);
  background: rgba(34,197,94,.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.apg-bubble-user {
  max-width: min(72%, 540px);
  background: rgba(34,197,94,.1);
  border: 1px solid rgba(34,197,94,.22);
  border-radius: 14px 14px 4px 14px;
  padding: 11px 15px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13.5px;
  font-weight: 400;
  color: var(--p-tx);
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  position: relative;
  overflow: hidden;
}

.apg-bubble-ai {
  max-width: min(82%, 680px);
  background: var(--p-surf);
  border: 1px solid var(--p-bd2);
  border-radius: 4px 14px 14px 14px;
  padding: 13px 17px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13.5px;
  font-weight: 300;
  color: var(--p-tx2);
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
  position: relative;
  overflow: hidden;
}

/* AI bubble top shimmer */
.apg-bubble-ai::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 10%,
    rgba(34,197,94,.25) 50%,
    transparent 90%
  );
}

/* Left accent bar */
.apg-bubble-ai::after {
  content: '';
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, var(--p-acc) 0%, transparent 100%);
  border-radius: 4px 0 0 4px;
}

/* Markdown styles inside AI bubble */
.apg-bubble-ai strong { color: var(--p-acc2); font-weight: 600; }
.apg-bubble-ai em { color: var(--p-tx); font-style: italic; }
.apg-bubble-ai h1, .apg-bubble-ai h2, .apg-bubble-ai h3 {
  font-family: 'Exo 2', sans-serif;
  color: var(--p-acc2);
  font-weight: 700;
  letter-spacing: .05em;
  margin: 10px 0 5px;
}
.apg-bubble-ai h1 { font-size: 15px; }
.apg-bubble-ai h2 { font-size: 13.5px; }
.apg-bubble-ai h3 { font-size: 12.5px; }
.apg-bubble-ai code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  background: var(--p-surf3);
  border: 1px solid var(--p-bd2);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--p-acc3);
}
.apg-bubble-ai pre {
  background: var(--p-bg);
  border: 1px solid var(--p-bd);
  border-radius: 9px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 9px 0;
}
.apg-bubble-ai pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
}
.apg-bubble-ai ul, .apg-bubble-ai ol { padding-left: 18px; margin: 6px 0; }
.apg-bubble-ai li { margin-bottom: 4px; }

/* ── Typing indicator ── */
.apg-typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 3px 0;
}
.apg-typing-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--p-acc);
  animation: axpg-dot 1.1s ease-in-out infinite;
}

/* ── Cursor blink ── */
.apg-cursor {
  display: inline-block;
  width: 2px; height: .85em;
  background: var(--p-acc);
  margin-left: 2px;
  vertical-align: text-bottom;
  border-radius: 1px;
  animation: axpg-blink .85s step-end infinite;
}

/* ── Date separator ── */
.apg-date-sep {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}
.apg-date-line {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, var(--p-bd), transparent);
}
.apg-date-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--p-tx3);
  white-space: nowrap;
}

/* ── Empty state ── */
.apg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 55vh;
  gap: 28px;
  padding: 0 24px;
  text-align: center;
  animation: axpg-in .4s cubic-bezier(.16,1,.3,1) forwards;
}

.apg-empty-title {
  font-family: 'Exo 2', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: var(--p-acc2);
  letter-spacing: .07em;
  text-transform: uppercase;
  line-height: 1;
  margin-bottom: 6px;
}

.apg-empty-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--p-tx3);
  max-width: 300px;
}

.apg-prompts {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  max-width: 460px;
}

.apg-prompt-lbl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  letter-spacing: .24em;
  text-transform: uppercase;
  color: var(--p-tx3);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.apg-prompt-lbl::before { content: '◈'; color: var(--p-acc); font-size: 9px; opacity: .7; }
.apg-prompt-lbl::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--p-bd), transparent); }

.apg-quick-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 38px;
  padding: 0 14px;
  border: 1px solid var(--p-bd2);
  border-radius: 11px;
  background: var(--p-surf2);
  color: var(--p-tx3);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12.5px;
  font-weight: 400;
  cursor: pointer;
  transition: all .18s;
  text-align: left;
}
.apg-quick-btn:hover {
  border-color: var(--p-bd);
  color: var(--p-acc2);
  background: var(--p-acc-dim);
  transform: translateX(3px);
}

/* ── Load more / error ── */
.apg-load-more {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}
.apg-load-more-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--p-tx3);
  background: none;
  border: none;
  cursor: pointer;
  transition: color .16s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.apg-load-more-btn:hover { color: var(--p-acc2); }

.apg-error-msg {
  display: flex;
  justify-content: center;
  padding: 0 20px;
}
.apg-error-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px solid rgba(248,113,113,.22);
  background: rgba(248,113,113,.05);
  font-size: 12px;
  color: var(--p-red);
}

/* ── Input bar ── */
.apg-input-bar {
  flex-shrink: 0;
  border-top: 1px solid var(--p-bd);
  background: var(--p-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  position: relative;
  z-index: 10;
}

.apg-input-inner {
  padding: 12px 20px calc(14px + env(safe-area-inset-bottom, 0px));
}

.apg-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: var(--p-surf);
  border: 1px solid var(--p-bd2);
  border-radius: 14px;
  padding: 10px 10px 10px 16px;
  transition: border-color .18s, box-shadow .18s;
}
.apg-input-wrap:focus-within {
  border-color: rgba(34,197,94,.35);
  box-shadow: 0 0 0 3px rgba(34,197,94,.06);
}

.apg-textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13.5px;
  font-weight: 300;
  color: var(--p-tx);
  line-height: 1.55;
  min-height: 24px;
  max-height: 140px;
  overflow-y: auto;
  padding: 0; margin: 0;
  -webkit-user-select: text;
  user-select: text;
}
.apg-textarea::placeholder { color: var(--p-tx3); }
.apg-textarea:disabled { opacity: .4; cursor: not-allowed; }
.apg-textarea::-webkit-scrollbar { width: 2px; }
.apg-textarea::-webkit-scrollbar-thumb { background: var(--p-bd); }

.apg-send-btn {
  width: 36px; height: 36px;
  border-radius: 10px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all .18s;
  padding: 0;
}
.apg-send-btn.active {
  background: linear-gradient(135deg, var(--p-acc) 0%, #16a34a 100%);
  color: #fff;
  box-shadow: 0 2px 12px rgba(34,197,94,.3);
}
.apg-send-btn.active:hover {
  background: linear-gradient(135deg, var(--p-acc2) 0%, var(--p-acc) 100%);
  box-shadow: 0 3px 18px rgba(34,197,94,.4);
  transform: translateY(-1px);
}
.apg-send-btn.stop {
  background: rgba(248,113,113,.1);
  border: 1px solid rgba(248,113,113,.25);
  color: var(--p-red);
}
.apg-send-btn.stop:hover {
  background: rgba(248,113,113,.18);
  border-color: rgba(248,113,113,.4);
}
.apg-send-btn.inactive {
  background: var(--p-surf2);
  border: 1px solid var(--p-bd2);
  color: var(--p-tx3);
  cursor: default;
}

.apg-input-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  text-align: center;
  color: var(--p-tx3);
  letter-spacing: .16em;
  text-transform: uppercase;
  margin-top: 8px;
}

/* ── Confirm modal ── */
.apg-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(10px);
  padding: 20px;
}

.apg-modal {
  background: var(--p-surf);
  border: 1px solid var(--p-bd);
  border-radius: 18px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  box-shadow: var(--p-sh);
  position: relative;
  overflow: hidden;
  animation: axpg-in .22s cubic-bezier(.16,1,.3,1) forwards;
}

.apg-modal-title {
  font-family: 'Exo 2', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: var(--p-acc2);
  letter-spacing: .07em;
  text-transform: uppercase;
  margin: 10px 0 8px;
}

.apg-modal-body {
  font-size: 13px;
  font-weight: 300;
  color: var(--p-tx2);
  line-height: 1.65;
  margin-bottom: 20px;
}

.apg-modal-btns { display: flex; gap: 10px; }

.apg-modal-cancel {
  flex: 1; height: 40px; border-radius: 11px;
  border: 1px solid var(--p-bd2);
  background: transparent;
  color: var(--p-tx2);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px; cursor: pointer;
  transition: all .16s;
}
.apg-modal-cancel:hover { background: var(--p-surf2); border-color: var(--p-bd); }

.apg-modal-confirm {
  flex: 1; height: 40px; border-radius: 11px;
  background: var(--p-red);
  border: 1px solid rgba(248,113,113,.4);
  color: #fff;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all .16s;
}
.apg-modal-confirm:hover { background: #f87171; }

/* ── Loading spinner ── */
.apg-center-loader {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .apg-topbar-inner { padding: 10px 14px; }
  .apg-modules { padding: 0 14px 10px; }
  .apg-msg-row { padding: 0 14px; }
  .apg-date-sep { padding: 0 14px; }
  .apg-input-inner { padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px)); }
  .apg-empty { min-height: 48vh; }
  .apg-bubble-user, .apg-bubble-ai { max-width: 92%; font-size: 13px; }
  .apg-status-badge { display: none !important; }
  .apg-msg-count { display: none !important; }
  .apg-brand-name { font-size: 15px; }
}
`

function injectPageCSS() {
  if (typeof document === 'undefined') return
  if (document.getElementById('ax-page-v2')) return
  const el = document.createElement('style')
  el.id = 'ax-page-v2'
  el.textContent = PAGE_CSS
  document.head.appendChild(el)
}

// ─── Modules ──────────────────────────────────────────────────────────────────
const MODULES: { id: ChatModule; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'general',      label: 'General',      icon: <Zap className="h-3 w-3" />,          hint: 'Ask anything about the CRM' },
  { id: 'appointments', label: 'Appointments',  icon: <Calendar className="h-3 w-3" />,      hint: 'Leads, bookings & scheduling' },
  { id: 'timeproof',    label: 'Timeproof',     icon: <Clock className="h-3 w-3" />,         hint: 'Attendance & work hours' },
  { id: 'supraspace',   label: 'Supra Space',   icon: <MessageSquare className="h-3 w-3" />, hint: 'Team messaging insights' },
  { id: 'biometrics',   label: 'Biometrics',    icon: <Fingerprint className="h-3 w-3" />,   hint: 'Security & credentials' },
  { id: 'feeds',        label: 'Feeds',         icon: <Rss className="h-3 w-3" />,           hint: 'Team activity & posts' },
]

const QUICK_PROMPTS: Record<ChatModule, string[]> = {
  general:      ["Quick summary of today's CRM activity", 'What should I prioritize today?', 'Help me draft a follow-up for a hot lead'],
  appointments: ['Summarize my upcoming appointments', 'What leads need follow-up today?', 'Draft an appointment confirmation email'],
  timeproof:    ['How many hours have I worked this week?', 'Am I on track with attendance?', 'Generate a timeproof report summary'],
  supraspace:   ['What conversations have unread messages?', 'Draft a team Q1 performance announcement', 'Summarize recent team activity'],
  biometrics:   ['Explain how biometric login works', 'What are SSH key security best practices?', 'Help me understand my credentials'],
  feeds:        ['What did the team post today?', 'Write an engaging team motivation post', 'Summarize recent feed activity'],
}

interface SupraLeoStatus {
  context?: { chatMessages?: number }
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

// ─── HUD background grid ──────────────────────────────────────────────────────
function HUDGrid() {
  return (
    <div className="apg-grid-bg" aria-hidden>
      <svg width="100%" height="100%">
        <defs>
          <pattern id="apg-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--p-acc)" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#apg-grid)" />
      </svg>
      {/* Scan line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 80,
        background: 'linear-gradient(180deg, rgba(34,197,94,.05) 0%, transparent 100%)',
        animation: 'axpg-scan 9s linear infinite',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const isStreaming = msg.streaming
  const isEmpty = !msg.content && isStreaming

  if (isUser) {
    return (
      <div className="apg-msg-row user">
        <div className="apg-user-avatar">
          <User size={13} style={{ color: 'var(--p-acc2)' }} />
        </div>
        <div className="apg-bubble-user">{msg.content}</div>
      </div>
    )
  }

  return (
    <div className="apg-msg-row">
      <div className="apg-avatar-wrap">
        <SupraLeoAvatar
          state={isStreaming ? 'speaking' : 'idle'}
          size={30}
          animate={!!isStreaming}
        />
      </div>
      <div className="apg-bubble-ai">
        {isEmpty ? (
          <div className="apg-typing">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="apg-typing-dot"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        ) : (
          <>
            <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
            {isStreaming && msg.content && <span className="apg-cursor" />}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Date separator ───────────────────────────────────────────────────────────
function DateSep({ date }: { date: string | Date }) {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  const label =
    diff === 0 ? 'Today' :
    diff === 1 ? 'Yesterday' :
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="apg-date-sep">
      <div className="apg-date-line" />
      <span className="apg-date-label">{label}</span>
      <div className="apg-date-line" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SupraLeoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeModule, setActiveModule] = React.useState<ChatModule>('general')
  const [inputText, setInputText] = React.useState('')
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)
  const [status, setStatus] = React.useState<SupraLeoStatus | null>(null)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const {
    messages, isLoading, isLoadingHistory, hasMore, error,
    sendMessage, stopGeneration, clearHistory, loadMoreHistory,
  } = useSupraLeoChat({ module: activeModule, autoLoadHistory: true })

  const fromPath = searchParams.get('from') || '/crm/dashboard'
  const lastMessageContent = messages[messages.length - 1]?.content

  // Inject CSS once
  React.useEffect(() => { injectPageCSS() }, [])

  // Module from URL
  React.useEffect(() => {
    const requestedModule = searchParams.get('module')
    if (!requestedModule) return
    const isValid = MODULES.some(m => m.id === requestedModule)
    if (isValid) setActiveModule(requestedModule as ChatModule)
  }, [searchParams])

  // Auth check + status
  React.useEffect(() => {
    const token = localStorage.getItem('crm_token')
    if (!token) { router.replace('/crm'); return }
    apiClient.get('/api/supraleo/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStatus(r.data?.data))
      .catch(() => {})
  }, [router])

  // Auto-scroll
  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, lastMessageContent])

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [inputText])

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return
    const text = inputText.trim()
    setInputText('')
    await sendMessage(text)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleClear = async () => {
    await clearHistory()
    setShowClearConfirm(false)
  }

  const handleBack = React.useCallback(() => {
    router.push(fromPath.startsWith('/crm/') ? fromPath : '/crm/dashboard')
  }, [fromPath, router])

  const quickPrompts = QUICK_PROMPTS[activeModule]
  const showEmpty = messages.length === 0 && !isLoadingHistory

  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = []
    let currentDate = ''
    messages.forEach(msg => {
      const dateStr = new Date(msg.createdAt).toDateString()
      if (dateStr !== currentDate) {
        currentDate = dateStr
        groups.push({ date: msg.createdAt as string, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    })
    return groups
  }, [messages])

  const activeModuleData = MODULES.find(m => m.id === activeModule)

  return (
    <div data-axp-page>
      <div className="apg-shell">
        <HUDGrid />

        {/* ── Top Bar ── */}
        <div className="apg-topbar">
          <div className="apg-shimmer" />

          <div className="apg-topbar-inner">
            {/* Back */}
            <button className="apg-back-btn" onClick={handleBack} title="Go back">
              <ArrowLeft size={15} />
            </button>

            {/* Brand */}
            <div className="apg-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SupraLeoAvatar
                  state={isLoading ? 'speaking' : 'idle'}
                  size={38}
                  animate={isLoading}
                />
                <div>
                  <div className="apg-brand-name">Suprah Autrix AI</div>
                  <span className="apg-brand-sub">Dealership Intelligence System</span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            {status && (
              <div className="apg-status-badge">
                <div className="apg-status-dot" />
                <span className="apg-status-label">Online</span>
              </div>
            )}

            {/* Message count */}
            {status?.context?.chatMessages != null && (
              <span className="apg-msg-count">
                {status.context.chatMessages} msgs
              </span>
            )}

            {/* Clear history */}
            {messages.length > 0 && (
              <button
                className="apg-icon-btn dng"
                title="Clear chat history"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Module pills */}
          <div className="apg-modules">
            {MODULES.map(mod => (
              <button
                key={mod.id}
                className={`apg-pill ${activeModule === mod.id ? 'active' : ''}`}
                onClick={() => setActiveModule(mod.id)}
              >
                {mod.icon}
                <span>{mod.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Messages area ── */}
        <div ref={scrollRef} className="apg-messages">

          {/* Load more */}
          {hasMore && !isLoadingHistory && (
            <div className="apg-load-more">
              <button className="apg-load-more-btn" onClick={loadMoreHistory}>
                <RefreshCw size={9} />
                Load earlier messages
              </button>
            </div>
          )}

          {/* History loading */}
          {isLoadingHistory && (
            <div className="apg-center-loader">
              <Loader2
                size={20}
                style={{ animation: 'axpg-spin .9s linear infinite', color: 'var(--p-acc)', opacity: .5 }}
              />
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="apg-empty">
              <div>
                <SupraLeoAvatar state="idle" size={68} animate style={{ margin: '0 auto 16px' }} />
                <div className="apg-empty-title">How can I assist?</div>
                <div className="apg-empty-sub">
                  Driven by Intelligence · {activeModuleData?.hint}
                </div>
              </div>

              <div className="apg-prompts">
                <div className="apg-prompt-lbl">Quick starts</div>
                {quickPrompts.map(p => (
                  <button
                    key={p}
                    className="apg-quick-btn"
                    onClick={() => { setInputText(p); textareaRef.current?.focus() }}
                  >
                    <span>{p}</span>
                    <ChevronRight size={12} style={{ opacity: .4, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message groups */}
          {groupedMessages.map((group, gi) => (
            <React.Fragment key={gi}>
              <DateSep date={group.date} />
              {group.messages.map((msg, mi) => (
                <MessageBubble key={msg._id || `${gi}-${mi}`} msg={msg} />
              ))}
            </React.Fragment>
          ))}

          {/* Error */}
          {error && (
            <div className="apg-error-msg">
              <div className="apg-error-inner">{error}</div>
            </div>
          )}

          <div style={{ height: 8 }} />
        </div>

        {/* ── Input Bar ── */}
        <div className="apg-input-bar">
          <div className="apg-shimmer" />
          <div className="apg-input-inner">
            <div className="apg-input-wrap">
              <textarea
                ref={textareaRef}
                className="apg-textarea"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Ask Autrix AI about ${activeModuleData?.label.toLowerCase()}…`}
                rows={1}
                disabled={isLoading}
              />
              <div style={{ paddingBottom: 2 }}>
                {isLoading ? (
                  <button className="apg-send-btn stop" onClick={stopGeneration}>
                    <Square size={13} />
                  </button>
                ) : (
                  <button
                    className={`apg-send-btn ${inputText.trim() ? 'active' : 'inactive'}`}
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                  >
                    <Send size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="apg-input-hint">
              Enter to send · Shift+Enter for newline
            </div>
          </div>
        </div>

        {/* ── Clear confirm modal ── */}
        {showClearConfirm && (
          <div className="apg-overlay" onClick={() => setShowClearConfirm(false)}>
            <div className="apg-modal" onClick={e => e.stopPropagation()}>
              <div className="apg-shimmer" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
              <div className="apg-modal-title">Clear History?</div>
              <div className="apg-modal-body">
                This will permanently delete all {messages.length} message{messages.length !== 1 ? 's' : ''}. This action cannot be undone.
              </div>
              <div className="apg-modal-btns">
                <button className="apg-modal-cancel" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </button>
                <button className="apg-modal-confirm" onClick={handleClear}>
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}