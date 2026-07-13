'use client'


import * as React from 'react'
import {
  X, Clock, Calendar, MessageSquare, Rss, ChevronRight,
  CheckCircle2, Loader2, Sparkles, Users, Maximize2,
  AlertTriangle, Square,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { SupraLeoAvatar } from '@/components/supra-leo-ai/SupraLeoAvatar'


export interface DashboardNotificationsProps {
  user: { fullName: string; role: string }
  token: string
  hasClockedIn: boolean
}

interface AlertItem {
  id: string
  module: 'appointments' | 'leads' | 'feeds' | 'supraspace'
  title: string
  description: string
  count?: number
  href?: string
}

interface ReminderData {
  appointments?: {
    counts?: { todayAppointments: number; upcomingThisWeek: number; newLeads: number; pendingLeads: number }
    today?: any[]
    newLeads?: any[]
    pendingLeads?: any[]
  }
  feeds?: { counts?: { newPostsToday: number; newCommentsToday: number } }
  supraspace?: { counts?: { unread: number; activeConversations: number } }
}


const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@300;400&display=swap');

[data-dbn] {
  /* ── Dark tokens (default) ── */
  --d-bg:       #060D1A;
  --d-bg2:      #0A1628;
  --d-surface:  #0F1E35;
  --d-surface2: #162440;
  --d-border:   rgba(59,130,246,0.14);
  --d-border2:  rgba(255,255,255,0.06);
  --d-accent:   #3B82F6;
  --d-accent2:  #60A5FA;
  --d-orange:   #F59E0B;
  --d-silver:   #94AFC6;
  --d-text1:    rgba(220,235,255,0.95);
  --d-text2:    rgba(140,175,220,0.68);
  --d-text3:    rgba(80,130,185,0.38);
  --d-green:    #10B981;
  --d-red:      #EF4444;
  --d-purple:   #8B5CF6;
  --d-amber:    #F59E0B;
  --d-cyan:     #06B6D4;
  --d-sh:       0 2px 12px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.40);
  --d-shlg:     0 4px 24px rgba(59,130,246,0.15), 0 12px 48px rgba(0,0,0,0.55);
  --d-glass:    rgba(9,18,36,0.92);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* System light */
@media (prefers-color-scheme: light) {
  [data-dbn] {
    --d-bg:       #F0F5FB;
    --d-bg2:      #E2ECF8;
    --d-surface:  #FFFFFF;
    --d-surface2: #F4F8FE;
    --d-border:   rgba(37,99,235,0.12);
    --d-border2:  rgba(0,0,0,0.07);
    --d-accent:   #2563EB;
    --d-accent2:  #3B82F6;
    --d-silver:   #6B8BAE;
    --d-text1:    #081A30;
    --d-text2:    rgba(10,50,100,0.65);
    --d-text3:    rgba(10,50,100,0.38);
    --d-sh:       0 2px 12px rgba(0,0,0,0.08), 0 6px 24px rgba(37,99,235,0.06);
    --d-shlg:     0 4px 20px rgba(37,99,235,0.14), 0 10px 40px rgba(0,0,0,0.10);
    --d-glass:    rgba(255,255,255,0.95);
  }
}

/* Class-based dark override */
.dark [data-dbn] {
  --d-bg:       #060D1A;
  --d-bg2:      #0A1628;
  --d-surface:  #0F1E35;
  --d-surface2: #162440;
  --d-border:   rgba(59,130,246,0.14);
  --d-border2:  rgba(255,255,255,0.06);
  --d-accent:   #3B82F6;
  --d-accent2:  #60A5FA;
  --d-text1:    rgba(220,235,255,0.95);
  --d-text2:    rgba(140,175,220,0.68);
  --d-text3:    rgba(80,130,185,0.38);
  --d-sh:       0 2px 12px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.40);
  --d-shlg:     0 4px 24px rgba(59,130,246,0.15), 0 12px 48px rgba(0,0,0,0.55);
  --d-glass:    rgba(9,18,36,0.92);
}

/* Class-based light override */
.light [data-dbn] {
  --d-bg:       #F0F5FB;
  --d-bg2:      #E2ECF8;
  --d-surface:  #FFFFFF;
  --d-surface2: #F4F8FE;
  --d-border:   rgba(37,99,235,0.12);
  --d-border2:  rgba(0,0,0,0.07);
  --d-accent:   #2563EB;
  --d-accent2:  #3B82F6;
  --d-silver:   #6B8BAE;
  --d-text1:    #081A30;
  --d-text2:    rgba(10,50,100,0.65);
  --d-text3:    rgba(10,50,100,0.38);
  --d-sh:       0 2px 12px rgba(0,0,0,0.08), 0 6px 24px rgba(37,99,235,0.06);
  --d-shlg:     0 4px 20px rgba(37,99,235,0.14), 0 10px 40px rgba(0,0,0,0.10);
  --d-glass:    rgba(255,255,255,0.95);
}

[data-dbn] *, [data-dbn] *::before, [data-dbn] *::after { box-sizing: border-box; }
[data-dbn] { color: var(--d-text1); }

/* ── Keyframes ── */
@keyframes dbn-fade-in   { from{opacity:0} to{opacity:1} }
@keyframes dbn-fade-out  { from{opacity:1} to{opacity:0} }
@keyframes dbn-slide-in  { from{opacity:0;transform:translateY(14px) scale(.984)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes dbn-slide-out { from{opacity:1;transform:translateY(0) scale(1)}       to{opacity:0;transform:translateY(10px) scale(.984)} }
@keyframes dbn-toast-in  { from{opacity:0;transform:translateX(110%)}             to{opacity:1;transform:translateX(0)} }
@keyframes dbn-toast-out { from{opacity:1;transform:translateX(0)}                to{opacity:0;transform:translateX(110%)} }
@keyframes dbn-shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes dbn-scan      { 0%{top:0;opacity:.5} 100%{top:100%;opacity:0} }
@keyframes dbn-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.25;transform:scale(.65)} }
@keyframes dbn-spin      { to{transform:rotate(360deg)} }
@keyframes dbn-breathe   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.004)} }
@keyframes dbn-ring-pulse{ 0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.45)} 60%{box-shadow:0 0 0 12px rgba(59,130,246,0)} }
@keyframes dbn-arrow-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
@keyframes dbn-item-in   { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }

/* ── Overlay ── */
.dbn-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(3,8,16,0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: dbn-fade-in .24s ease forwards;
}
.dbn-overlay.exiting { animation: dbn-fade-out .2s ease forwards; }

/* ── Modal shell — mirrors axp-panel ── */
.dbn-modal {
  width: 100%; max-width: 400px;
  background: var(--d-glass);
  border: 1px solid var(--d-border);
  border-radius: 16px;
  box-shadow: var(--d-shlg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  animation: dbn-slide-in .30s cubic-bezier(.16,1,.3,1) forwards;
}
.dbn-modal.exiting { animation: dbn-slide-out .22s ease forwards; }

/* Top shimmer line */
.dbn-modal::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px; z-index: 5;
  background: linear-gradient(90deg, transparent 0%, var(--d-accent2) 30%, rgba(200,225,255,.85) 50%, var(--d-accent2) 70%, transparent 100%);
  background-size: 200% 100%;
  animation: dbn-shimmer 3.8s linear infinite;
}

/* Scan-line sweep */
.dbn-modal::after {
  content: '';
  position: absolute; left: 0; right: 0; height: 48px;
  background: linear-gradient(180deg, rgba(59,130,246,.04) 0%, transparent 100%);
  animation: dbn-scan 7s linear infinite;
  pointer-events: none; z-index: 1;
}

/* ── Header ── */
.dbn-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--d-surface);
  border-bottom: 1px solid var(--d-border2);
  flex-shrink: 0; position: relative; z-index: 2;
}
.dbn-hdr-text { flex: 1; min-width: 0; }
.dbn-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px; font-weight: 700;
  color: var(--d-accent2);
  letter-spacing: .10em; line-height: 1;
  margin-bottom: 3px; text-transform: uppercase;
}
.dbn-slogan {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px; letter-spacing: .18em;
  text-transform: uppercase; color: var(--d-text3);
  display: block; margin-bottom: 4px;
}
.dbn-status {
  display: flex; align-items: center; gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px; letter-spacing: .15em;
  text-transform: uppercase; color: var(--d-text3);
}
.dbn-dot {
  width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0;
}
.dbn-icon-btn {
  width: 26px; height: 26px; border-radius: 7px;
  border: 1px solid var(--d-border2); background: none;
  cursor: pointer; color: var(--d-text3);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .15s; padding: 0;
}
.dbn-icon-btn:hover {
  border-color: rgba(59,130,246,.3);
  background: rgba(59,130,246,.08);
  color: var(--d-accent2);
}
.dbn-icon-btn.close:hover {
  border-color: rgba(239,68,68,.3);
  background: rgba(239,68,68,.07);
  color: var(--d-red);
}

/* ── Step nav pills ── */
.dbn-step-pills {
  display: flex; gap: 5px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--d-border2);
  background: var(--d-surface); flex-shrink: 0;
}
.dbn-step-pill {
  height: 3px; border-radius: 99px;
  background: var(--d-border); flex: 1;
  transition: background .3s;
}
.dbn-step-pill.active { background: var(--d-accent); }
.dbn-step-pill.done   { background: rgba(59,130,246,.35); }

/* ── Body ── */
.dbn-body {
  padding: 13px 16px;
  display: flex; flex-direction: column; gap: 9px;
  overflow-y: auto; flex: 1;
  max-height: min(420px, calc(100vh - 200px));
}
.dbn-body::-webkit-scrollbar { width: 2px; }
.dbn-body::-webkit-scrollbar-thumb { background: var(--d-border); border-radius: 1px; }

/* ── Section label ── */
.dbn-lbl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px; letter-spacing: .22em;
  text-transform: uppercase; color: var(--d-text3);
  margin-bottom: 6px;
}

/* ── Welcome screen ── */
.dbn-welcome {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 10px 0 6px; text-align: center;
}
.dbn-welcome-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 20px; font-weight: 700;
  color: var(--d-accent2); letter-spacing: .06em;
  text-transform: uppercase; line-height: 1.1;
}
.dbn-welcome-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px; letter-spacing: .18em;
  text-transform: uppercase; color: var(--d-text3);
}
.dbn-welcome-desc {
  font-size: 12px; font-weight: 300;
  color: var(--d-text2); line-height: 1.7;
  max-width: 300px;
}

/* ── HUD stat row ── */
.dbn-stat-row {
  display: flex; gap: 5px; flex-wrap: wrap;
  margin-top: 4px;
}
.dbn-chip {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px; font-weight: 600; letter-spacing: .10em;
  padding: 3px 9px; border-radius: 99px;
  border: 1px solid; text-transform: uppercase;
}

/* ── Clock-in banner ── */
.dbn-clock-banner {
  display: flex; align-items: center; gap: 11px;
  padding: 11px 13px;
  border: 1px solid rgba(245,158,11,.22);
  background: rgba(245,158,11,.05);
  border-radius: 10px;
  position: relative; overflow: hidden;
}
.dbn-clock-banner::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 20%, rgba(245,158,11,.5) 50%, transparent 80%);
}
.dbn-clock-icon {
  width: 34px; height: 34px; border-radius: 8px;
  background: rgba(245,158,11,.1);
  border: 1px solid rgba(245,158,11,.22);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: dbn-breathe 2.2s ease-in-out infinite;
}
.dbn-clock-title { font-size: 12px; font-weight: 600; color: var(--d-amber); margin-bottom: 2px; }
.dbn-clock-desc  { font-size: 10.5px; font-weight: 300; color: var(--d-text3); }

/* ── Success banner ── */
.dbn-success-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 13px;
  border: 1px solid rgba(16,185,129,.22);
  background: rgba(16,185,129,.04);
  border-radius: 10px;
}
.dbn-success-banner span { font-size: 12px; font-weight: 500; color: var(--d-green); }

/* ── Divider ── */
.dbn-div {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--d-border), transparent);
  flex-shrink: 0;
}

/* ── Alert list ── */
.dbn-alert-list { display: flex; flex-direction: column; gap: 5px; }

.dbn-alert-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--d-border2);
  border-radius: 10px;
  background: var(--d-surface);
  cursor: pointer; transition: all .16s;
  text-decoration: none; color: inherit;
  position: relative; overflow: hidden;
  animation: dbn-item-in .28s ease both;
}
.dbn-alert-item::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 20%, var(--d-accent)22 50%, transparent 80%);
}
.dbn-alert-item:hover {
  border-color: var(--d-border);
  background: var(--d-surface2);
}
.dbn-alert-icon {
  width: 30px; height: 30px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.dbn-alert-text { flex: 1; min-width: 0; }
.dbn-alert-title {
  font-size: 11.5px; font-weight: 500; color: var(--d-text1);
  margin-bottom: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dbn-alert-desc {
  font-size: 10px; font-weight: 300; color: var(--d-text3);
  font-family: 'JetBrains Mono', monospace; letter-spacing: .05em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dbn-alert-badge {
  min-width: 18px; height: 18px; border-radius: 9px;
  font-size: 8.5px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px; flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace; letter-spacing: .03em;
}
.dbn-alert-arrow {
  color: var(--d-text3); flex-shrink: 0;
  transition: transform .14s, color .14s;
}
.dbn-alert-item:hover .dbn-alert-arrow {
  transform: translateX(2px); color: var(--d-accent2);
}

/* Skeleton */
.dbn-skeleton {
  height: 50px; border-radius: 10px;
  background: linear-gradient(90deg, var(--d-surface) 25%, rgba(59,130,246,.06) 50%, var(--d-surface) 75%);
  background-size: 200% auto;
  animation: dbn-shimmer 1.5s linear infinite;
}

/* ── Footer ── */
.dbn-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--d-border2);
  background: var(--d-surface);
  flex-shrink: 0;
}
.dbn-step-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; letter-spacing: .2em;
  text-transform: uppercase; color: var(--d-text3);
}
.dbn-btn-row { display: flex; gap: 6px; }

.dbn-btn-primary {
  display: inline-flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 14px;
  border-radius: 8px; border: 1px solid var(--d-accent);
  background: var(--d-accent); color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: 11.5px; font-weight: 600;
  cursor: pointer; transition: all .14s;
  letter-spacing: .03em;
}
.dbn-btn-primary:hover { background: var(--d-accent2); border-color: var(--d-accent2); }
.dbn-btn-primary:disabled { opacity: .4; cursor: default; }

.dbn-btn-secondary {
  display: inline-flex; align-items: center; gap: 4px;
  height: 30px; padding: 0 11px;
  border-radius: 8px; border: 1px solid var(--d-border2);
  background: none; color: var(--d-text3);
  font-family: 'DM Sans', sans-serif;
  font-size: 11.5px; font-weight: 400;
  cursor: pointer; transition: all .14s;
}
.dbn-btn-secondary:hover {
  border-color: var(--d-border);
  color: var(--d-text2);
  background: rgba(59,130,246,.06);
}

/* ── Toast strip ── */
.dbn-toast-strip {
  position: fixed; bottom: 84px; right: 22px;
  z-index: 9990;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
}
.dbn-toast {
  width: 300px;
  background: var(--d-glass);
  border: 1px solid var(--d-border);
  border-radius: 12px;
  box-shadow: var(--d-sh);
  padding: 11px 13px;
  position: relative; overflow: hidden;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  animation: dbn-toast-in .28s cubic-bezier(.16,1,.3,1) forwards;
}
.dbn-toast::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--d-accent2) 40%, var(--d-accent2) 60%, transparent 90%);
  background-size: 200% 100%;
  animation: dbn-shimmer 3.5s linear infinite;
}
.dbn-toast.exiting { animation: dbn-toast-out .2s ease forwards; }
.dbn-toast-inner { display: flex; align-items: flex-start; gap: 10px; }
.dbn-toast-content { flex: 1; min-width: 0; }
.dbn-toast-title { font-size: 12px; font-weight: 600; color: var(--d-text1); margin-bottom: 2px; }
.dbn-toast-desc  { font-size: 10.5px; font-weight: 300; color: var(--d-text3); line-height: 1.5; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: .05em; }
.dbn-toast-close {
  width: 18px; height: 18px; border-radius: 4px;
  border: none; background: none; cursor: pointer;
  color: var(--d-text3); display: flex; align-items: center; justify-content: center;
  transition: color .12s; padding: 0; flex-shrink: 0;
}
.dbn-toast-close:hover { color: var(--d-red); }
.dbn-toast-progress {
  position: absolute; bottom: 0; left: 0;
  height: 1.5px; background: var(--d-accent);
  border-radius: 0 2px 2px 0;
}

/* ── Leo guided cue ── */
.dbn-leo-cue {
  position: fixed; z-index: 9980;
  pointer-events: none;
  animation: dbn-fade-in .4s ease forwards;
}
.dbn-leo-cue-label {
  background: var(--d-glass);
  border: 1px solid var(--d-border);
  border-radius: 10px;
  padding: 8px 12px 8px 10px;
  box-shadow: var(--d-sh);
  display: flex; align-items: center; gap: 8px;
  white-space: nowrap;
  position: relative; overflow: hidden;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.dbn-leo-cue-label::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--d-accent2) 40%, var(--d-accent2) 60%, transparent 90%);
  background-size: 200% 100%;
  animation: dbn-shimmer 3.5s linear infinite;
}
.dbn-leo-cue-text {
  font-size: 11px; font-weight: 500; color: var(--d-text2);
  font-family: 'DM Sans', sans-serif;
}
.dbn-leo-cue-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--d-text3);
}
.dbn-leo-ring {
  position: fixed; z-index: 9979;
  border-radius: 50%; pointer-events: none;
  animation: dbn-ring-pulse 2.2s ease-in-out infinite, dbn-fade-in .5s ease forwards;
}
.dbn-cue-arrow {
  width: 8px; height: 8px;
  border-right: 1.5px solid var(--d-accent);
  border-bottom: 1.5px solid var(--d-accent);
  transform: rotate(45deg);
  animation: dbn-arrow-bob 1.2s ease-in-out infinite;
}

/* ── Module color classes ── */
.mod-appts { background: rgba(16,185,129,.1); color: #10B981; }
.mod-leads { background: rgba(139,92,246,.1); color: #8B5CF6; }
.mod-feeds { background: rgba(245,158,11,.1); color: #F59E0B; }
.mod-space { background: rgba(6,182,212,.1);  color: #06B6D4; }
.badge-appts { background: rgba(16,185,129,.12); color: #10B981; border-color: rgba(16,185,129,.25); }
.badge-leads { background: rgba(139,92,246,.12); color: #8B5CF6; border-color: rgba(139,92,246,.25); }
.badge-feeds { background: rgba(245,158,11,.12); color: #F59E0B; border-color: rgba(245,158,11,.25); }
.badge-space { background: rgba(6,182,212,.12);  color: #06B6D4; border-color: rgba(6,182,212,.25); }
`

function injectCSS() {
  if (typeof document === 'undefined') return
  if (document.getElementById('dbn-v2-styles')) return
  const el = document.createElement('style')
  el.id = 'dbn-v2-styles'
  el.textContent = CSS
  document.head.appendChild(el)
}


const MODULE_CONFIG = {
  appointments: { icon: <Calendar size={13} />, iconClass: 'mod-appts', badgeClass: 'badge-appts', href: '/crm/appointments' },
  leads:        { icon: <Users size={13} />,    iconClass: 'mod-leads', badgeClass: 'badge-leads', href: '/crm/appointments' },
  feeds:        { icon: <Rss size={13} />,      iconClass: 'mod-feeds', badgeClass: 'badge-feeds', href: '/crm/feeds' },
  supraspace:   { icon: <MessageSquare size={13} />, iconClass: 'mod-space', badgeClass: 'badge-space', href: '/crm/supra-space' },
}


function AlertRow({ item, delay = 0 }: { item: AlertItem; delay?: number }) {
  const cfg = MODULE_CONFIG[item.module]
  return (
    <a
      href={cfg.href}
      className="dbn-alert-item"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`dbn-alert-icon ${cfg.iconClass}`}>{cfg.icon}</div>
      <div className="dbn-alert-text">
        <div className="dbn-alert-title">{item.title}</div>
        <div className="dbn-alert-desc">{item.description}</div>
      </div>
      {item.count != null && item.count > 0 && (
        <span className={`dbn-alert-badge ${cfg.badgeClass}`}>
          {item.count > 99 ? '99+' : item.count}
        </span>
      )}
      <ChevronRight size={11} className="dbn-alert-arrow" />
    </a>
  )
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────

interface ToastItem {
  id: string
  icon: React.ReactNode
  iconClass: string
  title: string
  desc: string
  exiting?: boolean
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [width, setWidth] = React.useState(100)
  const DURATION = 5200

  React.useEffect(() => {
    const start = Date.now()
    let raf: number
    const tick = () => {
      const elapsed = Date.now() - start
      setWidth(Math.max(0, 100 - (elapsed / DURATION) * 100))
      if (elapsed < DURATION) raf = requestAnimationFrame(tick)
      else onDismiss(item.id)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [item.id, onDismiss])

  return (
    <div className={`dbn-toast ${item.exiting ? 'exiting' : ''}`} data-dbn>
      <div className="dbn-toast-inner">
        <div
          className={`dbn-alert-icon ${item.iconClass}`}
          style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {item.icon}
        </div>
        <div className="dbn-toast-content">
          <div className="dbn-toast-title">{item.title}</div>
          <div className="dbn-toast-desc">{item.desc}</div>
        </div>
        <button className="dbn-toast-close" onClick={() => onDismiss(item.id)}>
          <X size={10} />
        </button>
      </div>
      <div
        className="dbn-toast-progress"
        style={{ width: `${width}%`, transition: 'width 100ms linear' }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Supra Leo Guided Cue
// ─────────────────────────────────────────────────────────────

function SupraLeoCue({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = React.useState(true)

  React.useEffect(() => {
    const id = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 400)
    }, 9000)
    return () => clearTimeout(id)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div data-dbn>
      {/* Ring around badge */}
      <div
        className="dbn-leo-ring"
        style={{
          bottom: 14,
          right: 14,
          width: 86,
          height: 62,
          border: '1.5px solid rgba(59,130,246,0.45)',
          borderRadius: 14,
        }}
      />
      {/* Label */}
      <div
        className="dbn-leo-cue"
        style={{ bottom: 86, right: 16 }}
      >
        <div className="dbn-leo-cue-label">
          <SupraLeoAvatar state="idle" size={22} animate={false} />
          <div>
            <div className="dbn-leo-cue-text">Manage your tasks here</div>
            <div className="dbn-leo-cue-mono">Autrix AI · Ready</div>
          </div>
          <div className="dbn-cue-arrow" />
        </div>
        {/* Notch */}
        <div style={{
          position: 'absolute', bottom: -5, right: 22,
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid rgba(59,130,246,0.18)',
        }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function DashboardNotifications({ user, token, hasClockedIn }: DashboardNotificationsProps) {
  const [phase, setPhase] = React.useState<'modal' | 'toasts' | 'cue' | 'done'>('modal')
  const [modalExiting, setModalExiting] = React.useState(false)
  const [overlayExiting, setOverlayExiting] = React.useState(false)
  const [step, setStep] = React.useState(0) // 0 = welcome, 1 = alerts
  const [loading, setLoading] = React.useState(true)
  const [alerts, setAlerts] = React.useState<AlertItem[]>([])
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [cueVisible, setCueVisible] = React.useState(false)

  const SEEN_KEY = 'dbn2_seen_' + new Date().toDateString()
  const alreadySeen = typeof localStorage !== 'undefined' && localStorage.getItem(SEEN_KEY)

  React.useEffect(() => { injectCSS() }, [])

  // Fetch reminders
  React.useEffect(() => {
    if (alreadySeen || !token) { setLoading(false); return }
    const modules = ['appointments', 'feeds', 'supraspace']
    Promise.all(
      modules.map(mod =>
        apiClient.get(`/api/supraleo/reminders/${mod}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => ({ mod, data: r.data?.data })).catch(() => ({ mod, data: null }))
      )
    ).then(results => {
      const rd: ReminderData = {}
      results.forEach(({ mod, data }) => { if (data) (rd as any)[mod] = data })
      buildAlerts(rd)
      setLoading(false)
    })
  }, [token])

  const buildAlerts = (rd: ReminderData) => {
    const list: AlertItem[] = []

    const apptCounts = rd.appointments?.counts
    if (apptCounts) {
      if (apptCounts.todayAppointments > 0) {
        list.push({
          id: 'appt-today', module: 'appointments',
          title: `${apptCounts.todayAppointments} appointment${apptCounts.todayAppointments > 1 ? 's' : ''} today`,
          description: 'Scheduled on your calendar',
          count: apptCounts.todayAppointments,
        })
      }
      if (apptCounts.newLeads > 0) {
        list.push({
          id: 'leads-new', module: 'leads',
          title: `${apptCounts.newLeads} new lead${apptCounts.newLeads > 1 ? 's' : ''} waiting`,
          description: 'Not yet reviewed',
          count: apptCounts.newLeads,
        })
      }
      if (apptCounts.pendingLeads > 0) {
        list.push({
          id: 'leads-pending', module: 'leads',
          title: `${apptCounts.pendingLeads} lead${apptCounts.pendingLeads > 1 ? 's' : ''} pending follow-up`,
          description: 'Require your attention',
          count: apptCounts.pendingLeads,
        })
      }
    }

    const feedCounts = rd.feeds?.counts
    if (feedCounts && (feedCounts.newPostsToday > 0 || feedCounts.newCommentsToday > 0)) {
      list.push({
        id: 'feeds', module: 'feeds',
        title: `${feedCounts.newPostsToday} new team post${feedCounts.newPostsToday !== 1 ? 's' : ''} today`,
        description: feedCounts.newCommentsToday > 0 ? `+${feedCounts.newCommentsToday} new comments` : 'Team activity',
        count: feedCounts.newPostsToday + feedCounts.newCommentsToday,
      })
    }

    const spaceCounts = rd.supraspace?.counts
    if (spaceCounts && spaceCounts.unread > 0) {
      list.push({
        id: 'supraspace', module: 'supraspace',
        title: `${spaceCounts.unread} unread message${spaceCounts.unread > 1 ? 's' : ''} in Supra Space`,
        description: `${spaceCounts.activeConversations} active conversation${spaceCounts.activeConversations !== 1 ? 's' : ''}`,
        count: spaceCounts.unread,
      })
    }

    setAlerts(list)
    setToasts(list.map(a => ({
      id: a.id,
      icon: MODULE_CONFIG[a.module].icon,
      iconClass: MODULE_CONFIG[a.module].iconClass,
      title: a.title,
      desc: a.description,
    })))
  }

  const closeModal = (cb?: () => void) => {
    setModalExiting(true)
    setTimeout(() => {
      setOverlayExiting(true)
      setTimeout(() => {
        if (typeof localStorage !== 'undefined') {
          // Persist dismissal across tabs and browser restarts
          localStorage.setItem(SEEN_KEY, '1')
          // Prune stale daily keys (keep only the last 3 days) to avoid localStorage bloat
          const prefix = 'dbn2_seen_'
          Object.keys(localStorage)
            .filter(k => k.startsWith(prefix) && k !== SEEN_KEY)
            .forEach(k => localStorage.removeItem(k))
        }
        setOverlayExiting(false)
        setModalExiting(false)
        cb?.()
      }, 200)
    }, 240)
  }

  const handleProceed = () => {
    if (step === 0 && alerts.length > 0) { setStep(1); return }
    closeModal(() => {
      if (alerts.length > 0) {
        setPhase('toasts')
      } else {
        setPhase('cue')
        setCueVisible(true)
      }
    })
  }

  const handleSkip = () => {
    closeModal(() => { setPhase('cue'); setCueVisible(true) })
  }

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => {
      const next = prev.filter(t => t.id !== id)
      if (next.length === 0) {
        setTimeout(() => { setPhase('cue'); setCueVisible(true) }, 300)
      }
      return next
    })
  }, [])

  if (alreadySeen) return null

  const firstName = user.fullName.split(' ')[0]
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver' })
  const hasAlerts = alerts.length > 0

  // Derive status dot for current state
  const isLoadingDot = loading
  const dotColor = isLoadingDot ? '#8B5CF6' : hasAlerts ? '#F59E0B' : '#10B981'
  const dotLabel = isLoadingDot ? 'Scanning' : hasAlerts ? `${alerts.length} items` : 'All clear'

  return (
    <>
      {/* ── Welcome Modal ── */}
      {phase === 'modal' && (
        <div className={`dbn-overlay ${overlayExiting ? 'exiting' : ''}`} data-dbn>
          <div className={`dbn-modal ${modalExiting ? 'exiting' : ''}`}>

            {/* Header */}
            <div className="dbn-hdr">
              <SupraLeoAvatar state={loading ? 'thinking' : hasAlerts ? 'reading' : 'idle'} size={42} animate />
              <div className="dbn-hdr-text">
                <div className="dbn-name">Autrix AI</div>
                <span className="dbn-slogan">Driven by Intelligence</span>
                <div className="dbn-status">
                  <div
                    className="dbn-dot"
                    style={{
                      background: dotColor,
                      boxShadow: loading ? `0 0 6px ${dotColor}` : 'none',
                      animation: loading ? 'dbn-pulse-dot 1.4s ease-in-out infinite' : 'none',
                    }}
                  />
                  {dotLabel}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button className="dbn-icon-btn close" onClick={handleSkip} title="Dismiss">
                  <X size={11} />
                </button>
              </div>
            </div>

            {/* Step progress pills */}
            <div className="dbn-step-pills">
              {[0, 1].map(i => (
                <div
                  key={i}
                  className={`dbn-step-pill ${i < step ? 'done' : i === step ? 'active' : ''}`}
                />
              ))}
            </div>

            {/* Body */}
            <div className="dbn-body">

              {/* ── Step 0: Welcome ── */}
              {step === 0 && (
                <>
                  <div className="dbn-welcome">
                    <div>
                      <div className="dbn-welcome-title">Welcome back, {firstName}.</div>
                      <div className="dbn-welcome-sub" style={{ marginTop: 4 }}>
                        Dashboard · {timeStr}
                      </div>
                    </div>
                    <div className="dbn-welcome-desc">
                      {loading
                        ? 'Scanning your modules for pending tasks and alerts…'
                        : hasAlerts
                          ? `Found ${alerts.length} item${alerts.length !== 1 ? 's' : ''} across your modules that need attention today.`
                          : "All modules are clear. No pending tasks or alerts."
                      }
                    </div>

                    {/* Stat chips */}
                    {!loading && hasAlerts && (
                      <div className="dbn-stat-row">
                        {alerts.map(a => {
                          const cfg = MODULE_CONFIG[a.module]
                          return (
                            <span key={a.id} className={`dbn-chip ${cfg.badgeClass}`}>
                              {a.count}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="dbn-div" />

                  {/* Clock-in / clocked-in */}
                  {!hasClockedIn ? (
                    <div className="dbn-clock-banner">
                      <div className="dbn-clock-icon">
                        <Clock size={15} style={{ color: 'var(--d-amber)' }} />
                      </div>
                      <div>
                        <div className="dbn-clock-title">Time to clock in</div>
                        <div className="dbn-clock-desc">Your shift hasn't started. Go to Timeproof Clock to begin.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="dbn-success-banner">
                      <CheckCircle2 size={13} style={{ color: 'var(--d-green)', flexShrink: 0 }} />
                      <span>You're clocked in — shift is live.</span>
                    </div>
                  )}
                </>
              )}

              {/* ── Step 1: Alerts ── */}
              {step === 1 && (
                <>
                  <div className="dbn-lbl">
                    {loading ? 'Scanning modules…' : `${alerts.length} item${alerts.length !== 1 ? 's' : ''} need attention`}
                  </div>

                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[1, 2, 3].map(i => <div key={i} className="dbn-skeleton" />)}
                    </div>
                  ) : alerts.length > 0 ? (
                    <div className="dbn-alert-list">
                      {alerts.map((a, i) => (
                        <AlertRow key={a.id} item={a} delay={i * 55} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '22px 0 10px' }}>
                      <CheckCircle2
                        size={26}
                        style={{ color: 'var(--d-green)', margin: '0 auto 8px', display: 'block' }}
                      />
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--d-text2)' }}>
                        All systems clear.
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 300, color: 'var(--d-text3)',
                        marginTop: 4, fontFamily: "'JetBrains Mono',monospace",
                        letterSpacing: '.1em', textTransform: 'uppercase',
                      }}>
                        No pending items across modules
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="dbn-footer">
              <span className="dbn-step-label">Step {step + 1} / {hasAlerts ? 2 : 1}</span>
              <div className="dbn-btn-row">
                {step === 0 && hasAlerts && !loading && (
                  <button className="dbn-btn-secondary" onClick={handleSkip}>
                    <Square size={9} /> Skip
                  </button>
                )}
                <button
                  className="dbn-btn-primary"
                  onClick={handleProceed}
                  disabled={loading && step === 0}
                >
                  {loading && step === 0 ? (
                    <><Loader2 size={10} style={{ animation: 'dbn-spin .9s linear infinite' }} /> Scanning…</>
                  ) : step === 0 && hasAlerts ? (
                    <>View tasks <ChevronRight size={11} /></>
                  ) : (
                    <><Sparkles size={10} /> Got it</>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      {phase === 'toasts' && toasts.length > 0 && (
        <div className="dbn-toast-strip" data-dbn>
          {toasts.map(t => (
            <Toast key={t.id} item={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}

      {/* ── Supra Leo guided cue ── */}
      {phase === 'cue' && cueVisible && (
        <SupraLeoCue onDismiss={() => { setCueVisible(false); setPhase('done') }} />
      )}
    </>
  )
}

export default DashboardNotifications
