'use client'

import * as React from 'react'
import {
  X, Square, Pause, Play, Volume2, Mic, Send, Edit3,
  RotateCcw, Loader2, CheckCircle2, AlertCircle, MessageSquare,
  ChevronRight, Calendar, Clock, Fingerprint, Rss, Maximize2,
  RefreshCw, AlertTriangle, Zap, BookOpen, FileText, CalendarPlus,
  Star, Sparkles, Mail, Phone, User, Tag, TrendingUp, ChevronDown,
  Car, Gauge, Shield, Wrench,
} from 'lucide-react'
import { SupraLeoAvatar, type LeoState } from './SupraLeoAvatar'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

// ─── Types ─────────────────────────────────────────────────────────────────────
export type SpeakState =
  | 'idle' | 'fetching' | 'speaking' | 'paused'
  | 'waiting-command' | 'listening' | 'listening-reply'
  | 'sending' | 'done' | 'error'

export type ChatModule = 'appointments' | 'timeproof' | 'supraspace' | 'biometrics' | 'feeds' | 'general'

export interface SupraLeoEmail { from?: string; subject?: string; snippet?: string }
export interface SupraLeoMessage {
  sender?: string; senderEmail?: string; subject?: string
  snippet?: string; status?: string; canReply?: boolean
  leadId?: string
}

interface PanelProps {
  state: SpeakState
  module: string
  fromPath: string
  email: SupraLeoEmail | null
  message: SupraLeoMessage | null
  errorMsg: string | null
  voiceName: string | null
  transcript: string
  onStop: () => void
  onPause: () => void
  onResume: () => void
  onClose: () => void
  onReplay: () => void
  onStartListeningForCommand: () => void
  onStartReplyListening: () => void
  onSetTranscript: (t: string) => void
  onSendReply: () => Promise<void>
}

// ─── Panel CSS ─────────────────────────────────────────────────────────────────
export const UPDATED_PANEL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

/* ── Dark tokens (default) ── */
[data-axp] {
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
  --p-silver:   #6b9e80;
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
  --p-glow:     0 0 40px rgba(34,197,94,0.08);
  --p-glass:    rgba(6,16,9,0.94);
  --p-grad:     linear-gradient(135deg, #091810 0%, #061009 100%);
  font-family: 'Space Grotesk', sans-serif;
  -webkit-font-smoothing: antialiased;
  color-scheme: dark;
}

/* ── Light mode ── */
@media (prefers-color-scheme: light) {
  [data-axp] {
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
    --p-silver:   #4b8b63;
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
    --p-glow:     0 0 40px rgba(22,163,74,0.06);
    --p-glass:    rgba(255,255,255,0.97);
    --p-grad:     linear-gradient(135deg, #ffffff 0%, #f4fcf7 100%);
    color-scheme: light;
  }
}

/* ── .dark class override ── */
.dark [data-axp] {
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
  --p-glow:     0 0 40px rgba(34,197,94,0.08);
  --p-glass:    rgba(6,16,9,0.94);
  --p-grad:     linear-gradient(135deg, #091810 0%, #061009 100%);
  color-scheme: dark;
}

/* ── .light class override ── */
.light [data-axp] {
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
  --p-glow:     0 0 40px rgba(22,163,74,0.06);
  --p-glass:    rgba(255,255,255,0.97);
  --p-grad:     linear-gradient(135deg, #ffffff 0%, #f4fcf7 100%);
  color-scheme: light;
}

/* ── Animations ── */
@keyframes axp-in      { from{opacity:0;transform:translateY(10px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes axp-dot     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.2;transform:scale(.6)} }
@keyframes axp-spin    { to{transform:rotate(360deg)} }
@keyframes axp-wave    { 0%,100%{transform:scaleY(.1)} 50%{transform:scaleY(1)} }
@keyframes axp-cur     { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes axp-msg     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes axp-scan    { 0%{transform:translateY(-150%);opacity:.7} 100%{transform:translateY(200%);opacity:0} }
@keyframes axp-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes axp-slide   { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
@keyframes axp-pop     { 0%{transform:scale(0.88);opacity:0} 60%{transform:scale(1.02)} 100%{transform:scale(1);opacity:1} }
@keyframes axp-glow-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} 50%{box-shadow:0 0 0 4px rgba(34,197,94,0.12)} }
@keyframes axp-track   { 0%{stroke-dashoffset:283} 100%{stroke-dashoffset:0} }

[data-axp] { color: var(--p-tx); box-sizing: border-box; }
[data-axp] *, [data-axp] *::before, [data-axp] *::after { box-sizing: border-box; }

/* ── Panel shell ── */
.axp-panel {
  width: min(400px, calc(100vw - 28px));
  background: var(--p-glass);
  border: 1px solid var(--p-bd);
  border-radius: 18px;
  box-shadow: var(--p-sh), var(--p-glow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  max-height: min(640px, calc(100vh - 100px));
  max-height: min(640px, calc(100dvh - 100px));
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  animation: axp-in .3s cubic-bezier(.16,1,.3,1) forwards;
}

/* Shimmer top line */
.axp-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  z-index: 5;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(34,197,94,0.4) 25%,
    rgba(134,239,172,0.9) 50%,
    rgba(34,197,94,0.4) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: axp-shimmer 3.5s linear infinite;
}

/* Scan line effect */
.axp-panel::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 60px;
  background: linear-gradient(180deg, rgba(34,197,94,.04) 0%, transparent 100%);
  animation: axp-scan 7s linear infinite;
  pointer-events: none;
  z-index: 1;
}

/* ── Header ── */
.axp-hdr {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--p-surf);
  border-bottom: 1px solid var(--p-bd2);
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

/* Diagonal accent in header */
.axp-hdr::before {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 180px;
  background: linear-gradient(270deg, var(--p-acc-dim) 0%, transparent 100%);
  pointer-events: none;
}

.axp-hdr-text { flex: 1; min-width: 0; position: relative; z-index: 1; }

.axp-name {
  font-family: 'Exo 2', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: var(--p-acc2);
  letter-spacing: .06em;
  line-height: 1;
  margin-bottom: 3px;
  text-transform: uppercase;
}

.axp-slogan {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: .20em;
  text-transform: uppercase;
  color: var(--p-tx3);
  display: block;
  margin-bottom: 4px;
}

.axp-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--p-tx3);
}

.axp-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

.axp-icon-btn {
  width: 30px; height: 30px;
  border-radius: 9px;
  border: 1px solid var(--p-bd2);
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

.axp-icon-btn:hover {
  border-color: var(--p-bd);
  background: var(--p-acc-dim);
  color: var(--p-acc2);
}

.axp-icon-btn.close:hover {
  border-color: rgba(248,113,113,.3);
  background: rgba(248,113,113,.07);
  color: var(--p-red);
}

/* ── Tabs ── */
.axp-tabs {
  display: flex;
  background: var(--p-surf);
  border-bottom: 1px solid var(--p-bd2);
  flex-shrink: 0;
  gap: 0;
}

.axp-tab {
  flex: 1;
  height: 38px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--p-tx3);
  border-bottom: 2px solid transparent;
  transition: all .2s;
  letter-spacing: .04em;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.axp-tab.on {
  color: var(--p-acc2);
  border-bottom-color: var(--p-acc);
  background: rgba(34,197,94,.04);
}

.axp-tab:not(.on):hover { color: var(--p-tx2); background: rgba(34,197,94,.02); }

.axp-tab-badge {
  min-width: 14px; height: 14px;
  border-radius: 7px;
  background: var(--p-red);
  color: #fff;
  font-size: 7px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

/* ── Body ── */
.axp-body {
  padding: 13px 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
}

.axp-body::-webkit-scrollbar { width: 3px; }
.axp-body::-webkit-scrollbar-track { background: transparent; }
.axp-body::-webkit-scrollbar-thumb { background: var(--p-bd); border-radius: 2px; }

.axp-lbl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--p-tx3);
  margin-bottom: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.axp-lbl::before {
  content: '';
  width: 12px; height: 1px;
  background: var(--p-acc);
  opacity: 0.5;
}

.axp-div {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--p-bd), transparent);
  flex-shrink: 0;
}

/* ── Cards ── */
.axp-card {
  border: 1px solid var(--p-bd2);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--p-surf2);
  position: relative;
  overflow: hidden;
  transition: border-color .2s;
}

.axp-card:hover { border-color: var(--p-bd); }

.axp-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 3px; bottom: 0;
  background: linear-gradient(180deg, var(--p-acc) 0%, transparent 100%);
  border-radius: 12px 0 0 12px;
}

.axp-card-sender { font-size: 12.5px; font-weight: 600; color: var(--p-acc2); margin-bottom: 2px; }
.axp-card-subj { font-size: 11.5px; color: var(--p-tx2); margin-bottom: 5px; }
.axp-card-snip {
  font-size: 11px; color: var(--p-tx3); line-height: 1.6;
  border-top: 1px solid var(--p-bd3); padding-top: 5px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

/* ── Wait state ── */
.axp-wait {
  border: 1px solid rgba(34,197,94,.2);
  background: rgba(34,197,94,.04);
  border-radius: 12px;
  padding: 13px;
}

.axp-wait-title {
  font-size: 11.5px; font-weight: 600; color: var(--p-green);
  margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
}

.axp-wait-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }

.axp-wait-btn {
  height: 32px; border: 1px solid; border-radius: 9px;
  font-family: 'Space Grotesk', sans-serif; font-size: 10.5px; font-weight: 500;
  cursor: pointer; transition: all .18s;
  display: flex; align-items: center; justify-content: center; gap: 5px; padding: 0 8px;
}

.axp-wait-v {
  background: rgba(34,197,94,.08);
  border-color: rgba(34,197,94,.25);
  color: var(--p-green);
}
.axp-wait-v:hover { background: rgba(34,197,94,.15); border-color: rgba(34,197,94,.4); }

.axp-wait-d {
  background: rgba(74,222,128,.06);
  border-color: rgba(74,222,128,.2);
  color: var(--p-acc3);
}
.axp-wait-d:hover { background: rgba(74,222,128,.12); }

.axp-wait-x {
  width: 100%; height: 28px; background: none;
  border: 1px solid var(--p-bd3); border-radius: 9px;
  font-family: 'Space Grotesk', sans-serif; font-size: 10.5px; color: var(--p-tx3);
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;
  transition: all .16s;
}
.axp-wait-x:hover { color: var(--p-tx2); background: var(--p-surf3); border-color: var(--p-bd2); }

/* ── Listening ── */
.axp-listen {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 16px 13px;
  border: 1px solid rgba(34,197,94,.22);
  background: rgba(34,197,94,.04);
  border-radius: 12px;
}

.axp-listen-lbl {
  font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: .18em;
  color: var(--p-green); text-transform: uppercase;
  display: flex; align-items: center; gap: 6px;
}

.axp-listen-hint {
  font-size: 11px; font-weight: 300; color: rgba(34,197,94,.45);
  text-align: center; font-style: italic;
  font-family: 'Space Grotesk', sans-serif;
}

.axp-wavebar {
  width: 2.5px; border-radius: 3px;
  background: linear-gradient(180deg, var(--p-acc2) 0%, var(--p-acc) 100%);
  transform-origin: center;
  animation: axp-wave .5s ease-in-out infinite;
}

.axp-transcript {
  border-left: 2px solid var(--p-acc);
  padding: 8px 11px;
  background: rgba(34,197,94,.06);
  border-radius: 0 9px 9px 0;
  font-size: 12px; font-weight: 300; font-style: italic;
  color: var(--p-tx2);
  line-height: 1.65; max-height: 70px; overflow-y: auto; width: 100%;
  font-family: 'Space Grotesk', sans-serif;
}

/* ── Error / Done ── */
.axp-err {
  display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px;
  border: 1px solid rgba(248,113,113,.22);
  background: rgba(248,113,113,.05);
  border-radius: 12px;
}
.axp-err p { font-size: 12px; color: var(--p-red); line-height: 1.55; margin: 0; }

.axp-done {
  display: flex; align-items: center; gap: 9px; padding: 11px 13px;
  border: 1px solid rgba(34,197,94,.22);
  background: rgba(34,197,94,.05);
  border-radius: 12px;
}
.axp-done p { font-size: 12px; color: var(--p-green); margin: 0; }

.axp-empty { text-align: center; padding: 18px 0 10px; }

/* ── Reply & Input ── */
.axp-reply {
  border-top: 1px solid var(--p-bd2);
  padding: 10px 15px 13px;
  flex-shrink: 0;
  background: var(--p-surf);
}

.axp-input-row {
  display: flex; gap: 7px; align-items: flex-end;
  border: 1px solid var(--p-bd2); border-radius: 11px;
  padding: 7px 8px 7px 12px;
  background: var(--p-bg2);
  transition: border-color .18s, box-shadow .18s;
}

.axp-input-row:focus-within {
  border-color: rgba(34,197,94,.35);
  box-shadow: 0 0 0 3px rgba(34,197,94,.06);
}

.axp-ta {
  flex: 1; background: transparent; border: none; outline: none; resize: none;
  font-family: 'Space Grotesk', sans-serif; font-size: 12.5px; font-weight: 300;
  color: var(--p-tx); line-height: 1.5; min-height: 20px; max-height: 80px;
  overflow-y: auto; padding: 0; margin: 0;
  -webkit-user-select: text; user-select: text;
}
.axp-ta::placeholder { color: var(--p-tx3); }
.axp-ta:disabled { opacity: .45; cursor: not-allowed; }

/* ── Send button ── */
.axp-send {
  width: 30px; height: 30px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--p-acc) 0%, #16a34a 100%);
  color: #fff;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .18s; padding: 0;
  box-shadow: 0 2px 8px rgba(34,197,94,.25);
}
.axp-send:hover {
  background: linear-gradient(135deg, var(--p-acc2) 0%, var(--p-acc) 100%);
  box-shadow: 0 3px 14px rgba(34,197,94,.35);
  transform: translateY(-1px);
}
.axp-send:disabled { opacity: .3; cursor: default; transform: none; box-shadow: none; }

/* ── Action buttons ── */
.axp-actions {
  display: flex; gap: 5px; flex-wrap: wrap; flex-shrink: 0;
  padding: 9px 15px 12px;
  border-top: 1px solid var(--p-bd2);
  background: var(--p-surf);
}

.axp-btn {
  display: inline-flex; align-items: center; gap: 4px;
  height: 29px; padding: 0 10px;
  border: 1px solid var(--p-bd2);
  border-radius: 9px;
  background: none; color: var(--p-tx2);
  font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 500;
  cursor: pointer; transition: all .16s; white-space: nowrap;
}

.axp-btn:hover {
  border-color: var(--p-bd);
  background: var(--p-acc-dim);
  color: var(--p-acc2);
}
.axp-btn:disabled { opacity: .3; cursor: default; }

.axp-btn.pri {
  background: linear-gradient(135deg, var(--p-acc) 0%, #16a34a 100%);
  border-color: transparent;
  color: #fff; font-weight: 600;
  box-shadow: 0 2px 8px rgba(34,197,94,.25);
}
.axp-btn.pri:hover {
  background: linear-gradient(135deg, var(--p-acc2) 0%, var(--p-acc) 100%);
  box-shadow: 0 3px 14px rgba(34,197,94,.35);
}

.axp-btn.dng { border-color: rgba(248,113,113,.18); color: var(--p-red); }
.axp-btn.dng:hover {
  background: rgba(248,113,113,.07);
  border-color: rgba(248,113,113,.32);
}

/* ── Chat ── */
.axp-chat-wrap { display: flex; flex-direction: column; overflow: hidden; flex: 1; min-height: 0; }

.axp-chat-scroll {
  overflow-y: auto; padding: 12px 15px;
  display: flex; flex-direction: column; gap: 10px; flex: 1;
}
.axp-chat-scroll::-webkit-scrollbar { width: 3px; }
.axp-chat-scroll::-webkit-scrollbar-thumb { background: var(--p-bd); border-radius: 2px; }

.axp-msg-row { display: flex; align-items: flex-end; gap: 7px; animation: axp-msg .22s ease forwards; }
.axp-msg-row.usr { flex-direction: row-reverse; }

.axp-bubble {
  max-width: 85%; padding: 9px 13px;
  border-radius: 14px;
  font-size: 12.5px; line-height: 1.65; font-weight: 400;
  white-space: pre-wrap; word-break: break-word;
  font-family: 'Space Grotesk', sans-serif;
}

.axp-bubble.usr {
  background: rgba(34,197,94,.12);
  border: 1px solid rgba(34,197,94,.22);
  color: var(--p-tx);
  border-radius: 14px 14px 4px 14px;
}

.axp-bubble.leo {
  background: var(--p-surf2);
  border: 1px solid var(--p-bd2);
  color: var(--p-tx2);
  border-radius: 4px 14px 14px 14px;
}

.axp-cur {
  display: inline-block; width: 2px; height: .85em;
  background: var(--p-acc); margin-left: 2px;
  vertical-align: text-bottom; border-radius: 1px;
  animation: axp-cur .85s step-end infinite;
}

.axp-typing { display: flex; gap: 4px; align-items: center; padding: 4px 2px; }
.axp-typing-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--p-acc);
  animation: axp-dot 1.1s ease-in-out infinite;
}

.axp-quick-btn {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; height: 34px; padding: 0 12px;
  border: 1px solid var(--p-bd2);
  border-radius: 10px;
  background: var(--p-surf2);
  color: var(--p-tx3);
  font-family: 'Space Grotesk', sans-serif; font-size: 11.5px; font-weight: 400;
  cursor: pointer; transition: all .18s; text-align: left;
}

.axp-quick-btn:hover {
  border-color: var(--p-bd);
  color: var(--p-acc2);
  background: var(--p-acc-dim);
  transform: translateX(3px);
}

/* ── Assistant Tab ── */
.axp-assist-scroll {
  overflow-y: auto; flex: 1;
  display: flex; flex-direction: column;
  padding: 12px 15px; gap: 9px;
}
.axp-assist-scroll::-webkit-scrollbar { width: 3px; }
.axp-assist-scroll::-webkit-scrollbar-thumb { background: var(--p-bd); border-radius: 2px; }

.axp-section-hdr {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; letter-spacing: .24em; text-transform: uppercase;
  color: var(--p-tx3); padding: 4px 0 6px;
  display: flex; align-items: center; gap: 8px;
}
.axp-section-hdr::before {
  content: '◈';
  color: var(--p-acc);
  font-size: 9px;
  opacity: 0.7;
}
.axp-section-hdr::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, var(--p-bd), transparent);
}

/* ── Action cards ── */
.axp-action-card {
  border: 1px solid var(--p-bd2);
  border-radius: 12px;
  background: var(--p-surf2);
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s, transform .2s;
  animation: axp-slide .24s ease forwards;
}

.axp-action-card:hover {
  border-color: var(--p-bd);
  box-shadow: 0 4px 16px rgba(34,197,94,.07);
  transform: translateY(-1px);
}

.axp-action-card-hdr {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 13px; cursor: pointer;
  transition: background .18s;
}
.axp-action-card-hdr:hover { background: var(--p-acc-dim); }

.axp-action-icon {
  width: 30px; height: 30px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; border: 1px solid rgba(34,197,94,.12);
}

.axp-action-title {
  flex: 1;
  font-size: 12.5px; font-weight: 600; color: var(--p-tx);
  line-height: 1.2;
  font-family: 'Space Grotesk', sans-serif;
}

.axp-action-sub {
  font-size: 10px; font-weight: 300; color: var(--p-tx3); margin-top: 1.5px;
  font-family: 'Space Grotesk', sans-serif;
}

.axp-action-body {
  padding: 0 13px 13px;
  border-top: 1px solid var(--p-bd2);
}

.axp-action-result {
  font-size: 12px; font-weight: 300; color: var(--p-tx2);
  line-height: 1.7; white-space: pre-wrap;
  max-height: 200px; overflow-y: auto;
  padding: 9px 0;
  font-family: 'Space Grotesk', sans-serif;
}
.axp-action-result::-webkit-scrollbar { width: 2px; }
.axp-action-result::-webkit-scrollbar-thumb { background: var(--p-bd); }

.axp-gen-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 13px; margin-top: 8px;
  border: 1px solid rgba(34,197,94,.3);
  border-radius: 9px;
  background: rgba(34,197,94,.09);
  color: var(--p-acc2);
  font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 500;
  cursor: pointer; transition: all .18s;
}
.axp-gen-btn:hover {
  background: rgba(34,197,94,.16);
  border-color: rgba(34,197,94,.45);
  transform: translateY(-1px);
}
.axp-gen-btn:disabled { opacity: .35; cursor: default; transform: none; }

.axp-copy-btn {
  display: inline-flex; align-items: center; gap: 4px;
  height: 25px; padding: 0 9px; margin-top: 5px;
  border: 1px solid var(--p-bd2); border-radius: 7px;
  background: transparent; color: var(--p-tx3);
  font-size: 9.5px; cursor: pointer; transition: all .16s;
  font-family: 'Space Grotesk', sans-serif;
}
.axp-copy-btn:hover { color: var(--p-acc2); border-color: var(--p-bd); }

.axp-lead-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 0; border-bottom: 1px solid var(--p-bd3);
  font-size: 11.5px;
}
.axp-lead-row:last-child { border-bottom: none; }
.axp-lead-key { color: var(--p-tx3); min-width: 62px; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: .08em; }
.axp-lead-val { color: var(--p-tx); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

.axp-appt-form { display: flex; flex-direction: column; gap: 8px; padding: 9px 0; }
.axp-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }

.axp-field-lbl {
  font-family: 'JetBrains Mono', monospace; font-size: 7.5px;
  letter-spacing: .16em; text-transform: uppercase; color: var(--p-tx3); margin-bottom: 4px;
}

.axp-field-input {
  width: 100%; height: 32px;
  background: var(--p-bg2);
  border: 1px solid var(--p-bd2); border-radius: 9px;
  padding: 0 10px;
  font-family: 'Space Grotesk', sans-serif; font-size: 12px; color: var(--p-tx);
  outline: none; transition: border-color .16s, box-shadow .16s;
}
.axp-field-input:focus {
  border-color: rgba(34,197,94,.35);
  box-shadow: 0 0 0 3px rgba(34,197,94,.06);
}

.axp-chip {
  display: inline-flex; align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; font-weight: 600; letter-spacing: .1em;
  padding: 3px 9px; border-radius: 99px;
  border: 1px solid; text-transform: uppercase;
}

/* ── Reminder tab ── */
.axp-reminder-wrap { display: flex; flex-direction: column; overflow: hidden; flex: 1; min-height: 0; }
.axp-reminder-body { overflow-y: auto; padding: 12px 15px; flex: 1; }
.axp-reminder-body::-webkit-scrollbar { width: 3px; }
.axp-reminder-body::-webkit-scrollbar-thumb { background: var(--p-bd); border-radius: 2px; }

.axp-mod-sel {
  display: flex; gap: 5px; flex-wrap: wrap; align-items: center;
  padding: 9px 15px; border-bottom: 1px solid var(--p-bd2);
  background: var(--p-surf); flex-shrink: 0;
}

.axp-mod-btn {
  display: inline-flex; align-items: center; gap: 4px;
  height: 26px; padding: 0 9px;
  border: 1px solid var(--p-bd2); border-radius: 99px;
  background: transparent; color: var(--p-tx3);
  font-size: 10.5px; font-weight: 500; cursor: pointer; transition: all .16s;
  font-family: 'Space Grotesk', sans-serif;
}
.axp-mod-btn:hover {
  border-color: var(--p-bd);
  color: var(--p-acc2);
  background: var(--p-acc-dim);
}
.axp-mod-btn.active {
  border-color: rgba(34,197,94,.35);
  color: var(--p-acc2);
  background: rgba(34,197,94,.12);
  font-weight: 600;
}

.axp-reminder-item {
  border: 1px solid var(--p-bd3);
  border-radius: 10px;
  padding: 9px 11px; margin-bottom: 6px;
  transition: border-color .18s, transform .18s;
  background: var(--p-surf2);
}
.axp-reminder-item:hover {
  border-color: var(--p-bd2);
  transform: translateX(3px);
}
.axp-reminder-item.warn {
  border-color: rgba(251,191,36,.22);
  background: rgba(251,191,36,.03);
}
.axp-reminder-item.info {
  border-color: rgba(34,197,94,.18);
  background: rgba(34,197,94,.03);
}
.axp-reminder-item.success {
  border-color: rgba(52,211,153,.2);
  background: rgba(52,211,153,.03);
}

/* ── Stats bar (Reminder tab summary) ── */
.axp-stats-row {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;
  margin-bottom: 12px;
}

.axp-stat-card {
  border: 1px solid var(--p-bd2);
  border-radius: 10px;
  padding: 9px 10px;
  background: var(--p-surf3);
  text-align: center;
}

.axp-stat-num {
  font-family: 'Exo 2', sans-serif;
  font-size: 20px; font-weight: 700;
  color: var(--p-acc2); line-height: 1;
  margin-bottom: 3px;
}

.axp-stat-lbl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--p-tx3);
}

/* ── Chat input at bottom of chat tab ── */
.axp-chat-input-wrap {
  padding: 9px 15px 11px;
  border-top: 1px solid var(--p-bd2);
  background: var(--p-surf);
  flex-shrink: 0;
}

/* ── Progress ring for speaking ── */
.axp-speaking-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 4px;
}

/* Responsive */
@media (max-width: 767px) {
  .axp-panel {
    width: min(400px, calc(100vw - 20px));
    max-height: calc(100dvh - var(--supra-leo-bottom, 6.5rem) - 14px);
    border-radius: 15px;
  }

  .axp-hdr,
  .axp-reply,
  .axp-actions,
  .axp-mod-sel {
    padding-left: 12px;
    padding-right: 12px;
  }

  .axp-body,
  .axp-chat-scroll,
  .axp-assist-scroll,
  .axp-reminder-body,
  .axp-chat-input-wrap {
    padding-left: 12px;
    padding-right: 12px;
  }

  .axp-stats-row { grid-template-columns: repeat(4, 1fr); }
  .axp-stat-num { font-size: 16px; }
}
`

function injectPanelCSS() {
  if (typeof document === 'undefined') return
  if (document.getElementById('ax-panel-v3')) return
  const el = document.createElement('style')
  el.id = 'ax-panel-v3'
  el.textContent = UPDATED_PANEL_CSS
  document.head.appendChild(el)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('crm_token') || ''
}

function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  return `${base}${path}`
}

// ─── Status maps ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<SpeakState, { label: string; dotColor: string; pulse: boolean }> = {
  idle:              { label: 'Standby',   dotColor: 'rgba(34,197,94,.35)', pulse: false },
  fetching:          { label: 'Fetching…', dotColor: '#a78bfa',             pulse: true  },
  speaking:          { label: 'Speaking',  dotColor: '#4ade80',             pulse: true  },
  paused:            { label: 'Paused',    dotColor: 'rgba(34,197,94,.35)', pulse: false },
  'waiting-command': { label: 'Awaiting',  dotColor: '#22c55e',             pulse: false },
  listening:         { label: 'Listening', dotColor: '#22c55e',             pulse: true  },
  'listening-reply': { label: 'Dictating', dotColor: '#22c55e',             pulse: true  },
  sending:           { label: 'Sending…',  dotColor: '#4ade80',             pulse: true  },
  done:              { label: 'Complete',  dotColor: '#22c55e',             pulse: false },
  error:             { label: 'Error',     dotColor: '#f87171',             pulse: false },
}

const LEO_STATE: Record<SpeakState, LeoState> = {
  idle: 'idle', fetching: 'thinking', speaking: 'speaking', paused: 'idle',
  'waiting-command': 'waiting-command', listening: 'listening',
  'listening-reply': 'listening', sending: 'thinking', done: 'idle', error: 'error',
}

// ─── Reminder modules ─────────────────────────────────────────────────────────
const REMINDER_MODULES = [
  { id: 'appointments', label: 'Appts',  icon: <Calendar className="h-3 w-3" /> },
  { id: 'timeproof',    label: 'Time',   icon: <Clock className="h-3 w-3" /> },
  { id: 'supraspace',   label: 'Space',  icon: <MessageSquare className="h-3 w-3" /> },
  { id: 'biometrics',   label: 'Bio',    icon: <Fingerprint className="h-3 w-3" /> },
  { id: 'feeds',        label: 'Feeds',  icon: <Rss className="h-3 w-3" /> },
]

// ─── Quick prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS: Record<string, string[]> = {
  appointments: ['Summarize my leads today', 'Draft a follow-up email', "What's on my schedule?"],
  timeproof:    ['Hours worked this week?', 'Am I on track with attendance?', 'Generate my timeproof summary'],
  supraspace:   ['Messages needing attention?', 'Draft a team announcement', 'Summarize unread threads'],
  biometrics:   ['Explain biometric login', 'SSH key best practices', 'Review my security status'],
  feeds:        ['What did the team post?', 'Write a motivational post', 'Summarize team activity'],
  general:      ['Help with a lead follow-up', 'Draft a professional email', 'What should I prioritize?'],
}

// ─── Waveform ──────────────────────────────────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 16 }}>
      {Array.from({ length: 9 }).map((_, i) => {
        const edge = i === 0 || i === 8
        return (
          <div key={i} className="axp-wavebar" style={{
            height: edge ? 4 : 13,
            opacity: edge ? 0.2 : 0.8,
            animationDuration: `${(0.30 + i * 0.045).toFixed(2)}s`,
            animationDelay: `${(i * 0.042).toFixed(2)}s`,
          }} />
        )
      })}
    </div>
  )
}

// ─── AI Generate helper ────────────────────────────────────────────────────────
async function aiGenerate(prompt: string, module: string): Promise<string> {
  const token = getToken()
  const res = await fetch(apiUrl('/api/supraleo/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: prompt, module, stream: false }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.message || `AI error ${res.status}`)
  }
  const data = await res.json()
  return data?.data?.message || ''
}

// ─── Chat Tab ──────────────────────────────────────────────────────────────────
interface ChatMsg { id: string; role: 'user' | 'leo'; text: string; streaming?: boolean }

function ChatTab({ activeModule = 'general' }: { activeModule?: string }) {
  const [messages, setMessages] = React.useState<ChatMsg[]>([])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || loading) return
    const uid = Date.now().toString()
    const lid = (Date.now() + 1).toString()
    setMessages(prev => [
      ...prev,
      { id: uid, role: 'user', text },
      { id: lid, role: 'leo', text: '', streaming: true },
    ])
    setInput('')
    setLoading(true)

    try {
      abortRef.current = new AbortController()
      const res = await fetch(apiUrl('/api/supraleo/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ message: text, module: activeModule, stream: true }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.message || 'API error')
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let acc = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const p = JSON.parse(raw)
            if (p.type === 'delta') {
              acc += p.text
              setMessages(prev => prev.map(m => m.id === lid ? { ...m, text: acc } : m))
            } else if (p.type === 'done') {
              setMessages(prev => prev.map(m => m.id === lid ? { ...m, streaming: false } : m))
            } else if (p.type === 'error') {
              throw new Error(p.message || 'Stream error')
            }
          } catch { /* ignore chunk parse errors */ }
        }
      }
    } catch (err: any) {
      const errMsg = err.name === 'AbortError' ? '' : (err.message || 'Something went wrong.')
      setMessages(prev => prev.map(m =>
        m.id === lid ? { ...m, text: errMsg || m.text, streaming: false } : m
      ))
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const prompts = QUICK_PROMPTS[activeModule] || QUICK_PROMPTS.general

  return (
    <div className="axp-chat-wrap">
      <div ref={scrollRef} className="axp-chat-scroll">
        {messages.length === 0 && (
          <div className="axp-empty">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <SupraLeoAvatar state="idle" size={46} animate />
              <div style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: 16, fontWeight: 800,
                color: 'var(--p-acc2)',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}>
                How can I help?
              </div>
              <div style={{
                fontSize: 10, color: 'var(--p-tx3)', fontWeight: 300, textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.12em',
                textTransform: 'uppercase',
              }}>
                AI-Powered Dealership Intelligence
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {prompts.map(p => (
                <button key={p} className="axp-quick-btn" onClick={() => send(p)}>
                  {p}
                  <ChevronRight size={11} style={{ opacity: 0.4, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`axp-msg-row ${msg.role === 'user' ? 'usr' : ''}`}>
            {msg.role === 'leo' && (
              <SupraLeoAvatar
                state={msg.streaming ? 'thinking' : 'idle'}
                size={24}
                animate={!!msg.streaming}
              />
            )}
            <div className={`axp-bubble ${msg.role === 'user' ? 'usr' : 'leo'}`}>
              {msg.role === 'leo' && msg.text === '' && msg.streaming ? (
                <div className="axp-typing">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="axp-typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
                  ))}
                </div>
              ) : (
                <>
                  {msg.text}
                  {msg.streaming && msg.text && <span className="axp-cur" />}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="axp-chat-input-wrap">
        <div className="axp-input-row">
          <textarea
            className="axp-ta"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Autrix AI…"
            rows={1}
            disabled={loading}
          />
          {loading ? (
            <button className="axp-send" onClick={() => abortRef.current?.abort()}>
              <Square size={11} />
            </button>
          ) : (
            <button className="axp-send" onClick={() => send()} disabled={!input.trim()}>
              <Send size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Reminder Tab ──────────────────────────────────────────────────────────────
function ReminderTab() {
  const [selectedModule, setSelectedModule] = React.useState('appointments')
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<any>(null)
  const [error, setError] = React.useState('')

  const fetchReminders = React.useCallback(async (mod: string) => {
    const token = getToken()
    if (!token) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await apiClient.get(`/api/supraleo/reminders/${mod}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(res.data?.data)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchReminders(selectedModule) }, [selectedModule, fetchReminders])

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const renderContent = () => {
    if (loading) return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
        <Loader2 size={20} style={{ animation: 'axp-spin .9s linear infinite', color: 'var(--p-acc)' }} />
      </div>
    )
    if (error) return (
      <div style={{
        padding: '12px', fontSize: 12, color: 'var(--p-red)',
        border: '1px solid rgba(248,113,113,.2)', borderRadius: 10,
        background: 'rgba(248,113,113,.04)',
      }}>
        {error}
      </div>
    )
    if (!data) return null

    switch (selectedModule) {
      case 'appointments': {
        const { today = [], newLeads = [], pendingLeads = [], counts } = data
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="axp-stats-row">
              {[
                { num: counts?.todayAppointments || 0, label: 'Today',   c: 'var(--p-acc2)',   bg: 'rgba(34,197,94,.08)',  bd: 'rgba(34,197,94,.18)' },
                { num: counts?.upcomingThisWeek || 0,  label: 'Week',    c: 'var(--p-teal)',   bg: 'rgba(52,211,153,.08)', bd: 'rgba(52,211,153,.18)' },
                { num: counts?.newLeads || 0,          label: 'New',     c: 'var(--p-purple)', bg: 'rgba(167,139,250,.08)',bd: 'rgba(167,139,250,.18)' },
                { num: counts?.pendingLeads || 0,      label: 'Pending', c: 'var(--p-amber)',  bg: 'rgba(251,191,36,.08)', bd: 'rgba(251,191,36,.18)' },
              ].map(c => (
                <div key={c.label} className="axp-stat-card" style={{ background: c.bg, borderColor: c.bd }}>
                  <div className="axp-stat-num" style={{ color: c.c }}>{c.num}</div>
                  <div className="axp-stat-lbl">{c.label}</div>
                </div>
              ))}
            </div>

            {today.length > 0 && (
              <div>
                <div className="axp-lbl">Today's Schedule</div>
                {today.map((a: any, i: number) => (
                  <div key={i} className="axp-reminder-item success">
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-tx)', marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--p-tx3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.06em' }}>
                      {fmtTime(a.startTime)} · {a.type} · {a.status}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {newLeads.length > 0 && (
              <div>
                <div className="axp-lbl">New Leads</div>
                {newLeads.slice(0, 5).map((l: any, i: number) => (
                  <div key={i} className="axp-reminder-item info">
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-tx)', marginBottom: 2 }}>{l.firstName} {l.lastName}</div>
                    <div style={{ fontSize: 10, color: 'var(--p-tx3)' }}>{l.source} · {fmtDate(l.createdAt)}</div>
                  </div>
                ))}
                {newLeads.length > 5 && (
                  <div style={{ fontSize: 10, color: 'var(--p-tx3)', textAlign: 'center', padding: '4px 0' }}>
                    +{newLeads.length - 5} more
                  </div>
                )}
              </div>
            )}

            {pendingLeads.length > 0 && (
              <div>
                <div className="axp-lbl">Pending Leads</div>
                {pendingLeads.slice(0, 3).map((l: any, i: number) => (
                  <div key={i} className="axp-reminder-item warn">
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-tx)', marginBottom: 2 }}>{l.firstName} {l.lastName}</div>
                    <div style={{ fontSize: 10, color: 'var(--p-tx3)' }}>{l.status} · {fmtDate(l.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}

            {today.length === 0 && newLeads.length === 0 && pendingLeads.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--p-tx3)', fontSize: 12 }}>
                <CheckCircle2 size={22} style={{ color: 'var(--p-green)', margin: '0 auto 8px', display: 'block' }} />
                All clear for today.
              </div>
            )}
          </div>
        )
      }

      case 'timeproof': {
        const { today: tp, alerts = [], weekLogsCount } = data
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span className="axp-chip" style={{
                background: tp?.isLive ? 'rgba(34,197,94,.1)' : 'rgba(74,222,128,.07)',
                borderColor: tp?.isLive ? 'rgba(34,197,94,.3)' : 'rgba(74,222,128,.2)',
                color: tp?.isLive ? 'var(--p-green)' : 'var(--p-acc3)',
              }}>
                {tp?.isLive ? '● Live' : tp?.hasClockedIn ? 'Clocked Out' : 'Not Clocked In'}
              </span>
              {tp?.workedHours && (
                <span className="axp-chip" style={{ background: 'rgba(251,191,36,.08)', borderColor: 'rgba(251,191,36,.25)', color: 'var(--p-amber)' }}>
                  {tp.workedHours}h Today
                </span>
              )}
              <span className="axp-chip" style={{ background: 'rgba(167,139,250,.08)', borderColor: 'rgba(167,139,250,.25)', color: 'var(--p-purple)' }}>
                {weekLogsCount || 0} Logs / Week
              </span>
            </div>
            {tp?.timeIn && (
              <div className="axp-reminder-item success">
                <div style={{ fontSize: 10, color: 'var(--p-tx3)' }}>Time In</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--p-tx)', fontFamily: 'Exo 2, sans-serif' }}>
                  {new Date(tp.timeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
            {tp?.timeOut && (
              <div className="axp-reminder-item info">
                <div style={{ fontSize: 10, color: 'var(--p-tx3)' }}>Time Out</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--p-tx)', fontFamily: 'Exo 2, sans-serif' }}>
                  {new Date(tp.timeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
            {alerts.map((a: any, i: number) => (
              <div key={i} className={`axp-reminder-item ${a.type === 'warning' ? 'warn' : 'info'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                  <AlertTriangle size={11} style={{ color: a.type === 'warning' ? 'var(--p-amber)' : 'var(--p-acc)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--p-tx2)' }}>{a.message}</span>
                </div>
              </div>
            ))}
          </div>
        )
      }

      case 'supraspace': {
        const { unreadMessages = [], counts } = data
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span className="axp-chip" style={{ background: 'rgba(248,113,113,.08)', borderColor: 'rgba(248,113,113,.25)', color: 'var(--p-red)' }}>
                {counts?.unread || 0} Unread
              </span>
              <span className="axp-chip" style={{ background: 'rgba(34,197,94,.08)', borderColor: 'rgba(34,197,94,.25)', color: 'var(--p-green)' }}>
                {counts?.activeConversations || 0} Active
              </span>
            </div>
            {unreadMessages.length > 0 ? (
              <div>
                <div className="axp-lbl">Unread Messages</div>
                {unreadMessages.slice(0, 5).map((m: any, i: number) => (
                  <div key={i} className="axp-reminder-item info">
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-tx)', marginBottom: 2 }}>
                      {m.sender?.fullName || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--p-tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--p-tx3)', fontSize: 12 }}>
                <CheckCircle2 size={22} style={{ color: 'var(--p-green)', margin: '0 auto 8px', display: 'block' }} />
                No unread messages.
              </div>
            )}
          </div>
        )
      }

      case 'biometrics': {
        const { alerts = [] } = data
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((a: any, i: number) => (
              <div key={i} className="axp-reminder-item info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                  <Fingerprint size={11} style={{ color: 'var(--p-acc)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--p-tx2)' }}>{a.message}</span>
                </div>
              </div>
            ))}
          </div>
        )
      }

      case 'feeds': {
        const { newPosts = [], counts } = data
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span className="axp-chip" style={{ background: 'rgba(34,197,94,.08)', borderColor: 'rgba(34,197,94,.25)', color: 'var(--p-green)' }}>
                {counts?.newPostsToday || 0} Posts Today
              </span>
              <span className="axp-chip" style={{ background: 'rgba(52,211,153,.08)', borderColor: 'rgba(52,211,153,.25)', color: 'var(--p-teal)' }}>
                {counts?.newCommentsToday || 0} Comments
              </span>
            </div>
            {newPosts.length > 0 ? (
              <div>
                <div className="axp-lbl">Recent Posts</div>
                {newPosts.slice(0, 4).map((p: any, i: number) => (
                  <div key={i} className="axp-reminder-item success">
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-tx)', marginBottom: 2 }}>
                      {p.authorName}
                      <span style={{ color: 'var(--p-tx3)', fontWeight: 300, marginLeft: 4 }}>· {p.authorRole}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--p-tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--p-tx3)', fontSize: 12 }}>
                No new posts today.
              </div>
            )}
          </div>
        )
      }

      default: return null
    }
  }

  return (
    <div className="axp-reminder-wrap">
      <div className="axp-mod-sel">
        {REMINDER_MODULES.map(m => (
          <button
            key={m.id}
            className={`axp-mod-btn ${selectedModule === m.id ? 'active' : ''}`}
            onClick={() => setSelectedModule(m.id)}
          >
            {m.icon} {m.label}
          </button>
        ))}
        <button
          onClick={() => fetchReminders(selectedModule)}
          className="axp-mod-btn"
          title="Refresh"
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw size={10} />
        </button>
      </div>
      <div className="axp-reminder-body">{renderContent()}</div>
    </div>
  )
}

// ─── Action Card ───────────────────────────────────────────────────────────────
interface ActionCardProps {
  icon: React.ReactNode
  iconBg: string
  iconBd?: string
  title: string
  subtitle: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function ActionCard({ icon, iconBg, iconBd, title, subtitle, children, defaultOpen = false }: ActionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="axp-action-card">
      <div className="axp-action-card-hdr" onClick={() => setOpen(p => !p)}>
        <div className="axp-action-icon" style={{ background: iconBg, borderColor: iconBd || 'rgba(34,197,94,.1)' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="axp-action-title">{title}</div>
          <div className="axp-action-sub">{subtitle}</div>
        </div>
        <ChevronDown size={12} style={{
          color: 'var(--p-tx3)',
          transition: 'transform .22s',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
        }} />
      </div>
      {open && <div className="axp-action-body">{children}</div>}
    </div>
  )
}

// ─── Book Appointment Card ─────────────────────────────────────────────────────
function BookAppointmentCard({ message }: { message: SupraLeoMessage | null }) {
  const [form, setForm] = React.useState({ title: '', date: '', time: '', notes: '', location: '' })
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [err, setErr] = React.useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleBook = async () => {
    if (!form.date || !form.time) { setErr('Date and time are required'); return }
    setLoading(true); setErr('')
    try {
      const token = getToken()
      await apiClient.post('/api/appointments', {
        title: form.title || `Appointment${message?.sender ? ` with ${message.sender}` : ''}`,
        startTime: new Date(`${form.date}T${form.time}`).toISOString(),
        endTime: new Date(new Date(`${form.date}T${form.time}`).getTime() + 3600000).toISOString(),
        notes: form.notes,
        location: form.location,
        status: 'pending',
        type: 'appointment',
        ...(message?.leadId ? { leadId: message.leadId } : {}),
      }, { headers: { Authorization: `Bearer ${token}` } })
      setDone(true)
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={{ padding: '14px 0', textAlign: 'center' }}>
      <CheckCircle2 size={24} style={{ color: 'var(--p-green)', margin: '0 auto 7px', display: 'block' }} />
      <div style={{ fontSize: 13, color: 'var(--p-green)', fontWeight: 600, fontFamily: 'Exo 2, sans-serif' }}>
        Appointment Booked!
      </div>
      <button className="axp-copy-btn" style={{ margin: '7px auto 0' }} onClick={() => setDone(false)}>
        Book Another
      </button>
    </div>
  )

  return (
    <div className="axp-appt-form">
      <div>
        <div className="axp-field-lbl">Title</div>
        <input
          className="axp-field-input"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder={message?.sender ? `Appointment with ${message.sender}` : 'Appointment title'}
        />
      </div>
      <div className="axp-form-row">
        <div>
          <div className="axp-field-lbl">Date</div>
          <input type="date" className="axp-field-input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <div className="axp-field-lbl">Time</div>
          <input type="time" className="axp-field-input" value={form.time} onChange={e => set('time', e.target.value)} />
        </div>
      </div>
      <div>
        <div className="axp-field-lbl">Location</div>
        <input
          className="axp-field-input"
          value={form.location}
          onChange={e => set('location', e.target.value)}
          placeholder="Dealership / Video Call"
        />
      </div>
      <div>
        <div className="axp-field-lbl">Notes</div>
        <input
          className="axp-field-input"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Optional notes…"
        />
      </div>
      {err && <div style={{ fontSize: 10.5, color: 'var(--p-red)', fontWeight: 500 }}>{err}</div>}
      <button
        className="axp-gen-btn"
        style={{
          background: 'linear-gradient(135deg, var(--p-acc) 0%, #16a34a 100%)',
          borderColor: 'transparent', color: '#fff', marginTop: 4,
          boxShadow: '0 2px 10px rgba(34,197,94,.25)',
        }}
        onClick={handleBook}
        disabled={loading}
      >
        {loading
          ? <Loader2 size={11} style={{ animation: 'axp-spin .9s linear infinite' }} />
          : <CalendarPlus size={11} />}
        {loading ? 'Booking…' : 'Confirm Appointment'}
      </button>
    </div>
  )
}

// ─── Reply Composer Card ───────────────────────────────────────────────────────
function ReplyComposerCard({ message }: { message: SupraLeoMessage | null }) {
  const [tone, setTone] = React.useState<'professional' | 'friendly' | 'follow-up' | 'custom'>('professional')
  const [customPrompt, setCustomPrompt] = React.useState('')
  const [result, setResult] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState('')

  const tones = [
    { id: 'professional', label: 'Professional' },
    { id: 'friendly',     label: 'Friendly'     },
    { id: 'follow-up',    label: 'Follow-Up'    },
    { id: 'custom',       label: 'Custom'       },
  ] as const

  const handleGenerate = async () => {
    setLoading(true); setResult(''); setError('')
    try {
      const senderInfo = message
        ? `Lead: ${message.sender || 'Customer'} (${message.senderEmail || ''}), Subject: ${message.subject || ''}, Status: ${message.status || 'New'}`
        : 'a new automotive inquiry'
      const prompt = tone === 'custom'
        ? `${customPrompt}\n\nContext: ${senderInfo}`
        : `Write a ${tone} reply email to ${senderInfo}. Automotive dealership CRM context. Concise and action-oriented. Format with Subject: and Body: sections.`
      const text = await aiGenerate(prompt, 'appointments')
      setResult(text)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{ paddingTop: 9 }}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 9 }}>
        {tones.map(t => (
          <button
            key={t.id}
            onClick={() => setTone(t.id as any)}
            style={{
              height: 26, padding: '0 9px', borderRadius: 99,
              border: `1px solid ${tone === t.id ? 'rgba(34,197,94,.4)' : 'var(--p-bd2)'}`,
              background: tone === t.id ? 'rgba(34,197,94,.12)' : 'transparent',
              color: tone === t.id ? 'var(--p-acc2)' : 'var(--p-tx3)',
              fontSize: 10.5, cursor: 'pointer', transition: 'all .16s',
              fontFamily: 'Space Grotesk, sans-serif', fontWeight: tone === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tone === 'custom' && (
        <textarea
          className="axp-ta"
          style={{
            border: '1px solid var(--p-bd2)', borderRadius: 10,
            padding: '8px 10px', marginBottom: 8, width: '100%',
            minHeight: 54, background: 'var(--p-bg2)',
          }}
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          placeholder="Describe what you want to say…"
        />
      )}
      <button
        className="axp-gen-btn"
        onClick={handleGenerate}
        disabled={loading || (tone === 'custom' && !customPrompt.trim())}
      >
        {loading
          ? <Loader2 size={11} style={{ animation: 'axp-spin .9s linear infinite' }} />
          : <Sparkles size={11} />}
        {loading ? 'Generating…' : 'Generate Reply'}
      </button>
      {error && <div style={{ marginTop: 7, fontSize: 11, color: 'var(--p-red)' }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 9 }}>
          <div className="axp-action-result">{result}</div>
          <button className="axp-copy-btn" onClick={handleCopy}>
            {copied
              ? <CheckCircle2 size={9} style={{ color: 'var(--p-green)' }} />
              : <FileText size={9} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Lead Summary Card ─────────────────────────────────────────────────────────
function LeadSummaryCard({ message }: { message: SupraLeoMessage | null }) {
  const [result, setResult] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSummarize = async () => {
    if (!message) return
    setLoading(true); setResult(''); setError('')
    try {
      const prompt = `Analyze this automotive lead:
Sender: ${message.sender || 'Unknown'} (${message.senderEmail || 'no email'})
Subject: ${message.subject || 'No subject'}
Status: ${message.status || 'New'}
Snippet: ${message.snippet || 'No content'}

Provide:
1. **Key Points** — what the customer wants
2. **Intent** — buying stage
3. **Next Action** — specific step today
4. **Priority** — High/Medium/Low with reason`
      const text = await aiGenerate(prompt, 'appointments')
      setResult(text)
    } catch (e: any) {
      setError(e?.message || 'Failed to summarize.')
    } finally {
      setLoading(false)
    }
  }

  if (!message) return (
    <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--p-tx3)', fontSize: 11 }}>
      Open a lead message to summarize it.
    </div>
  )

  return (
    <div style={{ paddingTop: 9 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
        {[
          { icon: <User size={9} />,  key: 'Sender',  val: message.sender },
          { icon: <Mail size={9} />,  key: 'Email',   val: message.senderEmail },
          { icon: <Tag size={9} />,   key: 'Subject', val: message.subject },
          { icon: <Star size={9} />,  key: 'Status',  val: message.status },
        ].filter(r => r.val).map(r => (
          <div key={r.key} className="axp-lead-row">
            <span style={{ color: 'var(--p-tx3)', display: 'flex', alignItems: 'center', gap: 4, minWidth: 68 }}>
              {r.icon}
              <span className="axp-lead-key">{r.key}</span>
            </span>
            <span className="axp-lead-val">{r.val}</span>
          </div>
        ))}
      </div>
      <button className="axp-gen-btn" onClick={handleSummarize} disabled={loading}>
        {loading
          ? <Loader2 size={11} style={{ animation: 'axp-spin .9s linear infinite' }} />
          : <BookOpen size={11} />}
        {loading ? 'Analyzing…' : 'Summarize Lead'}
      </button>
      {error && <div style={{ marginTop: 7, fontSize: 11, color: 'var(--p-red)' }}>{error}</div>}
      {result && <div className="axp-action-result" style={{ marginTop: 9 }}>{result}</div>}
    </div>
  )
}

// ─── Follow-Up Strategy Card ───────────────────────────────────────────────────
function FollowUpCard({ message }: { message: SupraLeoMessage | null }) {
  const [result, setResult] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleGenerate = async () => {
    setLoading(true); setResult(''); setError('')
    try {
      const context = message
        ? `Lead: ${message.sender || 'Customer'}, Status: ${message.status || 'New'}, Subject: ${message.subject || 'General inquiry'}`
        : 'a general automotive lead'
      const text = await aiGenerate(
        `Create a 3-step follow-up strategy for ${context} at an automotive dealership.
For each step: Step & Timing, Channel, Key talking points (2-3), Goal. Be specific and conversion-focused.`,
        'appointments'
      )
      setResult(text)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate strategy.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingTop: 9 }}>
      <button className="axp-gen-btn" onClick={handleGenerate} disabled={loading}>
        {loading
          ? <Loader2 size={11} style={{ animation: 'axp-spin .9s linear infinite' }} />
          : <TrendingUp size={11} />}
        {loading ? 'Planning…' : 'Generate Strategy'}
      </button>
      {error && <div style={{ marginTop: 7, fontSize: 11, color: 'var(--p-red)' }}>{error}</div>}
      {result && <div className="axp-action-result" style={{ marginTop: 9 }}>{result}</div>}
    </div>
  )
}

// ─── Assistant Tab ─────────────────────────────────────────────────────────────
function AssistantTab({
  state, message, errorMsg, voiceName, transcript,
  onStop, onPause, onResume, onReplay,
  onStartListeningForCommand, onStartReplyListening,
  onSetTranscript, onSendReply,
}: Omit<PanelProps, 'email' | 'onClose' | 'module' | 'fromPath'>) {
  const [reply, setReply] = React.useState('')
  const [editing, setEditing] = React.useState(false)
  const [editText, setEditText] = React.useState('')
  const editRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.selectionStart = editRef.current.value.length
    }
  }, [editing])

  const isSpeaking  = state === 'speaking'
  const isPaused    = state === 'paused'
  const isWaiting   = state === 'waiting-command'
  const isListening = state === 'listening'
  const isReplyMic  = state === 'listening-reply'
  const isSending   = state === 'sending'
  const isDone      = state === 'done'
  const isError     = state === 'error'
  const isIdle      = state === 'idle'
  const isFetching  = state === 'fetching'
  const isActive    = isSpeaking || isPaused || isListening || isReplyMic || isSending
  const hasMessage  = !!message

  const handleQuickReplySend = async () => {
    if (!reply.trim()) return
    onSetTranscript(reply.trim())
    setReply('')
    await new Promise(r => setTimeout(r, 50))
    await onSendReply()
  }

  return (
    <>
      <div className="axp-assist-scroll">
        {isError && errorMsg && (
          <div className="axp-err">
            <AlertCircle size={14} style={{ color: 'var(--p-red)', flexShrink: 0, marginTop: 1 }} />
            <p>{errorMsg}</p>
          </div>
        )}

        {isWaiting && (
          <div className="axp-wait">
            <div className="axp-wait-title">
              <CheckCircle2 size={12} /> Done reading — what's next?
            </div>
            <div className="axp-wait-grid">
              <button className="axp-wait-btn axp-wait-v" onClick={onStartListeningForCommand}>
                <Mic size={10} /> Voice Reply
              </button>
              <button className="axp-wait-btn axp-wait-d" onClick={onStartReplyListening}>
                <MessageSquare size={10} /> Dictate
              </button>
            </div>
            <button className="axp-wait-x" onClick={onStop}><X size={9} /> Close</button>
          </div>
        )}

        {isListening && (
          <div className="axp-listen">
            <div className="axp-listen-lbl">
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--p-green)',
                boxShadow: '0 0 8px rgba(34,197,94,.8)',
                animation: 'axp-dot .7s ease-in-out infinite',
              }} />
              Listening for command
            </div>
            <Waveform active />
            <div className="axp-listen-hint">Say "Reply", "Stop", or "Read again"</div>
          </div>
        )}

        {isReplyMic && (
          <div className="axp-listen">
            <div className="axp-listen-lbl">
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--p-green)',
                boxShadow: '0 0 8px rgba(34,197,94,.8)',
                animation: 'axp-dot .7s ease-in-out infinite',
              }} />
              Dictating your reply
            </div>
            <Waveform active />
            {transcript && <div className="axp-transcript">{transcript}</div>}
            <div className="axp-listen-hint" style={{ fontSize: 10.5 }}>Speak clearly · stops after silence</div>
          </div>
        )}

        {isSending && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px',
            border: '1px solid rgba(34,197,94,.2)',
            background: 'rgba(34,197,94,.05)', borderRadius: 12,
          }}>
            <Loader2 size={14} style={{ color: 'var(--p-acc)', animation: 'axp-spin .9s linear infinite' }} />
            <span style={{ fontSize: 12.5, color: 'var(--p-acc2)', fontFamily: 'Space Grotesk, sans-serif' }}>
              Sending reply…
            </span>
          </div>
        )}

        {isDone && transcript && !editing && (
          <div>
            <div className="axp-lbl">Your Reply</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <div className="axp-transcript" style={{ flex: 1 }}>{transcript}</div>
              <button
                className="axp-btn"
                style={{ padding: '0 8px', height: 28, flexShrink: 0 }}
                onClick={() => { setEditText(transcript); setEditing(true) }}
              >
                <Edit3 size={10} />
              </button>
            </div>
          </div>
        )}

        {isDone && editing && (
          <div>
            <div className="axp-lbl">Edit Reply</div>
            <div className="axp-input-row">
              <textarea
                ref={editRef}
                className="axp-ta"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={4}
                style={{ height: 82 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', marginTop: 6 }}>
              <button className="axp-btn" onClick={() => setEditing(false)}>Cancel</button>
              <button className="axp-btn pri" onClick={() => { onSetTranscript(editText); setEditing(false) }}>Save</button>
            </div>
          </div>
        )}

        {!isListening && !isReplyMic && !isWaiting && !isSending && (
          <>
            <div className="axp-section-hdr" style={{ marginTop: 4 }}>AI Tools</div>
            <ActionCard
              icon={<CalendarPlus size={13} style={{ color: '#4ade80' }} />}
              iconBg="rgba(34,197,94,.12)"
              title="Book Appointment"
              subtitle="Schedule with a lead"
              defaultOpen={false}
            >
              <BookAppointmentCard message={message} />
            </ActionCard>
            <ActionCard
              icon={<Mail size={13} style={{ color: '#86efac' }} />}
              iconBg="rgba(74,222,128,.1)"
              title="Craft Reply"
              subtitle="AI-powered email tailored to this lead"
              defaultOpen={hasMessage}
            >
              <ReplyComposerCard message={message} />
            </ActionCard>
            <ActionCard
              icon={<BookOpen size={13} style={{ color: '#a78bfa' }} />}
              iconBg="rgba(167,139,250,.1)"
              iconBd="rgba(167,139,250,.15)"
              title="Summarize Lead"
              subtitle="Key points & recommended actions"
              defaultOpen={hasMessage}
            >
              <LeadSummaryCard message={message} />
            </ActionCard>
            <ActionCard
              icon={<TrendingUp size={13} style={{ color: '#fbbf24' }} />}
              iconBg="rgba(251,191,36,.1)"
              iconBd="rgba(251,191,36,.15)"
              title="Follow-Up Strategy"
              subtitle="Multi-step engagement plan"
            >
              <FollowUpCard message={message} />
            </ActionCard>
          </>
        )}
      </div>

      {(state !== 'idle' || hasMessage) && !isWaiting && (
        <div className="axp-reply">
          <div className="axp-lbl">Quick Reply</div>
          <div className="axp-input-row">
            <textarea
              className="axp-ta"
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickReplySend() }
              }}
              placeholder="Compose your reply…"
              rows={1}
              disabled={isSending}
            />
            <button
              className="axp-send"
              onClick={handleQuickReplySend}
              disabled={!reply.trim() || isSending}
            >
              {isSending
                ? <Loader2 size={11} style={{ animation: 'axp-spin .9s linear infinite' }} />
                : <Send size={11} />}
            </button>
          </div>
        </div>
      )}

      <div className="axp-actions">
        {isDone && transcript ? (
          <>
            <button className="axp-btn pri" onClick={onSendReply} disabled={!transcript.trim()}>
              <Send size={10} /> Send
            </button>
            <button className="axp-btn" onClick={onStartReplyListening}>
              <RotateCcw size={10} /> Re-dictate
            </button>
            <button className="axp-btn" onClick={() => { setEditText(transcript); setEditing(true) }}>
              <Edit3 size={10} /> Edit
            </button>
            <button className="axp-btn dng" onClick={onStop}>
              <X size={10} /> Discard
            </button>
          </>
        ) : !isWaiting && (
          <>
            {(isSpeaking || isPaused) && (
              <button className="axp-btn" onClick={isPaused ? onResume : onPause}>
                {isPaused ? <Play size={10} /> : <Pause size={10} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            {(isIdle || hasMessage) && !isFetching && (
              <button className="axp-btn" onClick={onReplay}>
                <Play size={10} /> {message ? 'Read Aloud' : 'Read'}
              </button>
            )}
            {isFetching && (
              <button className="axp-btn" disabled>
                <Loader2 size={10} style={{ animation: 'axp-spin .9s linear infinite' }} /> Fetching…
              </button>
            )}
            {!isListening && hasMessage && (
              <button className="axp-btn" onClick={onStartReplyListening}>
                <Mic size={10} /> Voice Reply
              </button>
            )}
            {isActive && (
              <button className="axp-btn dng" onClick={onStop}>
                <Square size={10} /> Stop
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ─── Main Panel ────────────────────────────────────────────────────────────────
export function SupraLeoPanel({
  state, module, fromPath, email, message, errorMsg, voiceName, transcript,
  onStop, onPause, onResume, onClose, onReplay,
  onStartListeningForCommand, onStartReplyListening,
  onSetTranscript, onSendReply,
}: PanelProps) {
  const [tab, setTab] = React.useState<'chat' | 'assistant' | 'reminder'>('chat')
  const [activeModule, setActiveModule] = React.useState('general')
  const router = useRouter()

  React.useEffect(() => { injectPanelCSS() }, [])

  React.useEffect(() => {
    if (message) { setActiveModule('appointments'); setTab('assistant') }
  }, [message])

  React.useEffect(() => {
    if (module) setActiveModule(module)
  }, [module])

  const st = STATUS_MAP[state]
  const waveActive = state === 'speaking' || state === 'listening' || state === 'listening-reply'

  return (
    <div data-axp>
      <div className="axp-panel">

        {/* ── Header ── */}
        <div className="axp-hdr">
          <SupraLeoAvatar state={LEO_STATE[state]} size={44} animate />
          <div className="axp-hdr-text">
            <div className="axp-name">Suprah Autrix AI</div>
            <span className="axp-slogan">Dealership Intelligence System</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="axp-status">
                <div
                  className="axp-dot"
                  style={{
                    background: st.dotColor,
                    boxShadow: st.pulse ? `0 0 6px ${st.dotColor}` : 'none',
                    animation: st.pulse ? 'axp-dot 1.4s ease-in-out infinite' : 'none',
                  }}
                />
                <span>{st.label}</span>
                {voiceName && (
                  <>
                    <span style={{ opacity: 0.25 }}>·</span>
                    <Volume2 size={8} style={{ opacity: 0.4 }} />
                    <span style={{ maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {voiceName}
                    </span>
                  </>
                )}
              </div>
              <Waveform active={waveActive} />
            </div>
          </div>

          <button
            className="axp-icon-btn"
            title="Expand to full screen"
            onClick={() => {
              onClose()
              const params = new URLSearchParams({
                module: activeModule,
                from: fromPath || '/crm/dashboard',
              })
              router.push(`/crm/supra-leo?${params.toString()}`)
            }}
          >
            <Maximize2 size={12} />
          </button>
          <button className="axp-icon-btn close" onClick={onClose}>
            <X size={12} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="axp-tabs">
          <button
            className={`axp-tab ${tab === 'chat' ? 'on' : ''}`}
            onClick={() => setTab('chat')}
          >
            <MessageSquare size={11} /> Chat
          </button>
          <button
            className={`axp-tab ${tab === 'assistant' ? 'on' : ''}`}
            onClick={() => setTab('assistant')}
          >
            <Zap size={11} /> Assistant
          </button>
          <button
            className={`axp-tab ${tab === 'reminder' ? 'on' : ''}`}
            onClick={() => setTab('reminder')}
          >
            <Car size={11} /> Leads
          </button>
        </div>

        {/* ── Tab Content ── */}
        {tab === 'chat' && <ChatTab activeModule={activeModule} />}
        {tab === 'reminder' && <ReminderTab />}
        {tab === 'assistant' && (
          <AssistantTab
            state={state}
            message={message}
            errorMsg={errorMsg}
            voiceName={voiceName}
            transcript={transcript}
            onStop={onStop}
            onPause={onPause}
            onResume={onResume}
            onReplay={onReplay}
            onStartListeningForCommand={onStartListeningForCommand}
            onStartReplyListening={onStartReplyListening}
            onSetTranscript={onSetTranscript}
            onSendReply={onSendReply}
          />
        )}
      </div>
    </div>
  )
}

export default SupraLeoPanel