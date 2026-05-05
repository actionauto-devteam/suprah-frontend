'use client'
import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { SupraLeoAvatar, type LeoState } from './SupraLeoAvatar'

// ─── Design System CSS — aligned with SupraLeoPanel green theme ───────────────
const BADGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

/* ── Dark tokens (default) — matches panel [data-axp] ── */
[data-axb] {
  --b-bg:       #030a05;
  --b-bg2:      #061009;
  --b-surf:     #091810;
  --b-surf2:    #0d2016;
  --b-bd:       rgba(34,197,94,0.18);
  --b-bd2:      rgba(34,197,94,0.08);
  --b-acc:      #22c55e;
  --b-acc2:     #4ade80;
  --b-acc3:     #86efac;
  --b-acc-dim:  rgba(34,197,94,0.10);
  --b-tx:       rgba(220,255,235,0.95);
  --b-tx2:      rgba(134,203,160,0.72);
  --b-tx3:      rgba(74,163,112,0.42);
  --b-sh:       0 4px 24px rgba(0,0,0,0.7), 0 1px 0 rgba(34,197,94,0.12);
  --b-glow:     0 0 32px rgba(34,197,94,0.10);
  --b-glass:    rgba(6,16,9,0.92);
  font-family: 'Space Grotesk', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── System light mode ── */
@media (prefers-color-scheme: light) {
  [data-axb] {
    --b-bg:       #f0faf4;
    --b-bg2:      #e6f7ec;
    --b-surf:     #ffffff;
    --b-surf2:    #f4fcf7;
    --b-bd:       rgba(22,163,74,0.20);
    --b-bd2:      rgba(22,163,74,0.10);
    --b-acc:      #16a34a;
    --b-acc2:     #15803d;
    --b-acc3:     #166534;
    --b-acc-dim:  rgba(22,163,74,0.08);
    --b-tx:       #052e16;
    --b-tx2:      rgba(5,46,22,0.68);
    --b-tx3:      rgba(5,46,22,0.38);
    --b-sh:       0 4px 20px rgba(0,0,0,0.08), 0 1px 0 rgba(22,163,74,0.14);
    --b-glow:     0 0 32px rgba(22,163,74,0.08);
    --b-glass:    rgba(255,255,255,0.96);
  }
}

/* ── .dark class override ── */
.dark [data-axb] {
  --b-bg:       #030a05;
  --b-bg2:      #061009;
  --b-surf:     #091810;
  --b-surf2:    #0d2016;
  --b-bd:       rgba(34,197,94,0.18);
  --b-bd2:      rgba(34,197,94,0.08);
  --b-acc:      #22c55e;
  --b-acc2:     #4ade80;
  --b-acc3:     #86efac;
  --b-acc-dim:  rgba(34,197,94,0.10);
  --b-tx:       rgba(220,255,235,0.95);
  --b-tx2:      rgba(134,203,160,0.72);
  --b-tx3:      rgba(74,163,112,0.42);
  --b-sh:       0 4px 24px rgba(0,0,0,0.7), 0 1px 0 rgba(34,197,94,0.12);
  --b-glow:     0 0 32px rgba(34,197,94,0.10);
  --b-glass:    rgba(6,16,9,0.92);
}

/* ── .light class override ── */
.light [data-axb] {
  --b-bg:       #f0faf4;
  --b-bg2:      #e6f7ec;
  --b-surf:     #ffffff;
  --b-surf2:    #f4fcf7;
  --b-bd:       rgba(22,163,74,0.20);
  --b-bd2:      rgba(22,163,74,0.10);
  --b-acc:      #16a34a;
  --b-acc2:     #15803d;
  --b-acc3:     #166534;
  --b-acc-dim:  rgba(22,163,74,0.08);
  --b-tx:       #052e16;
  --b-tx2:      rgba(5,46,22,0.68);
  --b-tx3:      rgba(5,46,22,0.38);
  --b-sh:       0 4px 20px rgba(0,0,0,0.08), 0 1px 0 rgba(22,163,74,0.14);
  --b-glow:     0 0 32px rgba(22,163,74,0.08);
  --b-glass:    rgba(255,255,255,0.96);
}

/* ── Keyframes ── */
@keyframes axb-breathe  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.0035)} }
@keyframes axb-dot      { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.2;transform:scale(.6)} }
@keyframes axb-in       { from{opacity:0;transform:translateY(10px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes axb-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes axb-slide-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes axb-glow-in  { from{box-shadow:var(--b-sh)} to{box-shadow:var(--b-sh),var(--b-glow)} }

/* ── Badge ── */
[data-axb] .axb-badge {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  padding: 8px 16px 8px 8px;
  background: var(--b-glass);
  border: 1px solid var(--b-bd);
  border-radius: 14px;
  box-shadow: var(--b-sh), var(--b-glow);
  cursor: pointer;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: border-color .22s, box-shadow .22s, transform .14s;
  position: relative;
  overflow: hidden;
  outline: none;
  animation: axb-breathe 5.5s ease-in-out infinite;
  min-width: 168px;
}

/* Top shimmer line */
[data-axb] .axb-badge::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(34,197,94,0.4) 25%,
    rgba(134,239,172,0.9) 50%,
    rgba(34,197,94,0.4) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: axb-shimmer 3.5s linear infinite;
}

/* Diagonal accent highlight on right */
[data-axb] .axb-badge::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 80px;
  background: linear-gradient(270deg, var(--b-acc-dim) 0%, transparent 100%);
  pointer-events: none;
}

[data-axb] .axb-badge:hover {
  border-color: rgba(34,197,94,0.42);
  box-shadow: var(--b-sh), 0 0 40px rgba(34,197,94,0.16);
  transform: translateY(-2px);
}
[data-axb] .axb-badge:active { transform: translateY(0) scale(.975); }

/* ── Badge text ── */
[data-axb] .axb-name {
  font-family: 'Exo 2', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--b-acc2);
  letter-spacing: .08em;
  line-height: 1;
  display: block;
  margin-bottom: 3px;
  text-transform: uppercase;
}
[data-axb] .axb-slogan {
  font-family: 'JetBrains Mono', monospace;
  font-size: 6.5px;
  letter-spacing: .20em;
  text-transform: uppercase;
  color: var(--b-tx3);
  display: block;
  margin-bottom: 4px;
}
[data-axb] .axb-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--b-tx2);
}
[data-axb] .axb-dot {
  width: 4.5px; height: 4.5px;
  border-radius: 50%;
  flex-shrink: 0;
}
[data-axb] .axb-mod-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: .10em;
  padding: 2px 7px;
  border-radius: 99px;
  border: 1px solid rgba(34,197,94,0.25);
  background: rgba(34,197,94,0.09);
  color: var(--b-acc2);
  margin-top: 3px;
  text-transform: uppercase;
}

/* ── Toolbar variant ── */
[data-axb] .axb-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 5px 13px 5px 5px;
  background: var(--b-glass);
  border: 1px solid var(--b-bd);
  border-radius: 11px;
  box-shadow: var(--b-sh);
  cursor: pointer;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all .20s;
  position: relative;
  overflow: hidden;
  outline: none;
}
[data-axb] .axb-toolbar::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 5%,
    rgba(34,197,94,0.4) 35%,
    rgba(134,239,172,0.8) 50%,
    rgba(34,197,94,0.4) 65%,
    transparent 95%
  );
  background-size: 200% 100%;
  animation: axb-shimmer 4s linear infinite;
}
[data-axb] .axb-toolbar:hover {
  border-color: rgba(34,197,94,0.35);
  box-shadow: var(--b-sh), 0 0 24px rgba(34,197,94,0.12);
}

/* ── Panel wrap ── */
[data-axb] .axb-panel-wrap { animation: axb-in .28s cubic-bezier(.16,1,.3,1) forwards; }
`

function injectBadgeCSS() {
  if (typeof document === 'undefined') return
  if (document.getElementById('axb-badge-v2')) return
  const el = document.createElement('style')
  el.id = 'axb-badge-v2'
  el.textContent = BADGE_CSS
  document.head.appendChild(el)
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type { LeoState }

export interface LeoMessage {
  sender?: string; senderEmail?: string
  subject?: string; snippet?: string; status?: string
}

export interface SupraLeoAIProps {
  variant?: 'floating' | 'toolbar'
  position?: 'bottom-right' | 'bottom-left'
  state?: LeoState
  message?: LeoMessage | null
  transcript?: string
  voiceName?: string | null
  errorMsg?: string | null
  onStop?: () => void
  onPause?: () => void
  onResume?: () => void
  onReplay?: () => void
  onListen?: () => void
  onVoiceReply?: () => void
  onSendReply?: (t: string) => void
  onSetTranscript?: (t: string) => void
}

interface LoadedPanelProps {
  state: LeoState
  module: string
  fromPath: string
  email: null
  message: LeoMessage | null
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

// ─── Module detection ─────────────────────────────────────────────────────────
function detectModule(pathname: string): string {
  if (pathname.includes('/appointments')) return 'appointments'
  if (pathname.includes('/timeproof')) return 'timeproof'
  if (pathname.includes('/supra-space')) return 'supraspace'
  if (pathname.includes('/biometric')) return 'biometrics'
  if (pathname.includes('/feeds')) return 'feeds'
  if (pathname.includes('/supra-leo')) return 'general'
  return 'general'
}

const MODULE_LABELS: Record<string, string> = {
  appointments: 'Appointments',
  timeproof:    'Timeproof',
  supraspace:   'Supra Space',
  biometrics:   'Biometrics',
  feeds:        'Feeds',
  general:      'CRM',
}

// ─── State dot config — green palette ────────────────────────────────────────
const DOTS: Record<LeoState, { color: string; pulse: boolean; label: string }> = {
  idle:              { color: 'rgba(34,197,94,.40)', pulse: false, label: 'Standby'    },
  listening:         { color: '#4ade80',             pulse: true,  label: 'Listening'  },
  speaking:          { color: '#fbbf24',             pulse: true,  label: 'Speaking'   },
  thinking:          { color: '#a78bfa',             pulse: true,  label: 'Processing' },
  reading:           { color: '#34d399',             pulse: true,  label: 'Reading'    },
  'waiting-command': { color: '#22c55e',             pulse: false, label: 'Awaiting'   },
  error:             { color: '#f87171',             pulse: false, label: 'Error'      },
}

// ─── Badge component ──────────────────────────────────────────────────────────
function AutrixBadge({ state, onClick, module }: { state: LeoState; onClick: () => void; module: string }) {
  const d = DOTS[state]
  const showMod = module !== 'general'

  return (
    <div data-axb>
      <button className="axb-badge" onClick={onClick} aria-label="Open Autrix AI">
        <SupraLeoAvatar state={state} size={44} animate />
        <div style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <span className="axb-name">Suprah Autrix AI</span>
          <span className="axb-slogan">Dealership Intelligence</span>
          <div className="axb-status">
            <div
              className="axb-dot"
              style={{
                background: d.color,
                boxShadow: d.pulse ? `0 0 7px ${d.color}` : 'none',
                animation: d.pulse ? 'axb-dot 1.4s ease-in-out infinite' : 'none',
              }}
            />
            {d.label}
          </div>
          {showMod && (
            <div className="axb-mod-chip">
              ◈ {MODULE_LABELS[module]}
            </div>
          )}
        </div>
      </button>
    </div>
  )
}

// ─── Toolbar badge ────────────────────────────────────────────────────────────
function AutrixToolbarBadge({ state, onClick }: { state: LeoState; onClick: () => void }) {
  const d = DOTS[state]
  return (
    <div data-axb>
      <button className="axb-toolbar" onClick={onClick} aria-label="Open Autrix AI">
        <SupraLeoAvatar state={state} size={30} animate />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: 11, fontWeight: 800, color: 'var(--b-acc2)',
            letterSpacing: '.08em', textTransform: 'uppercase',
            display: 'block', marginBottom: 2,
          }}>
          Autrix
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7, letterSpacing: '.14em', textTransform: 'uppercase',
            color: 'var(--b-tx3)',
          }}>
            <div style={{
              width: 3.5, height: 3.5, borderRadius: '50%',
              background: d.color,
              boxShadow: d.pulse ? `0 0 6px ${d.color}` : 'none',
              animation: d.pulse ? 'axb-dot 1.4s ease-in-out infinite' : 'none',
              flexShrink: 0,
            }} />
            {d.label}
          </div>
        </div>
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SupraLeoAI({
  variant = 'floating',
  position = 'bottom-right',
  state = 'idle',
  message = null,
  transcript = '',
  voiceName = null,
  errorMsg = null,
  onStop = () => {},
  onPause = () => {},
  onResume = () => {},
  onReplay = () => {},
  onListen = () => {},
  onVoiceReply = () => {},
  onSendReply = () => {},
  onSetTranscript = () => {},
}: SupraLeoAIProps) {
  const [open, setOpen] = useState(false)
  const [Panel, setPanel] = useState<React.ComponentType<LoadedPanelProps> | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const currentModule = detectModule(pathname || '')
  const isLeft = position === 'bottom-left'
  const floatingStyles = {
    bottom: 'var(--supra-leo-bottom, var(--leo-bottom, 22px))',
    ...(isLeft
      ? { left: 'var(--supra-leo-side, var(--leo-side, 22px))' }
      : { right: 'var(--supra-leo-side, var(--leo-side, 22px))' }),
  }

  useEffect(() => { injectBadgeCSS() }, [])

  // Lazy-load panel
  useEffect(() => {
    import('./SupraLeoPanel').then(m => {
      setPanel(() => m.SupraLeoPanel as React.ComponentType<LoadedPanelProps>)
    })
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  // Listen for read-message events
  useEffect(() => {
    const h = (e: Event) => {
      if ((e as CustomEvent).detail?.leadId) setOpen(true)
    }
    window.addEventListener('supraleo:read-message', h)
    return () => window.removeEventListener('supraleo:read-message', h)
  }, [])

  // Auto-open on active state
  useEffect(() => {
    if (state !== 'idle' && state !== 'error') setOpen(true)
  }, [state])

  const close = () => { setOpen(false); onStop() }

  const panelProps = Panel ? {
    state,
    module: currentModule,
    fromPath: pathname || '/crm/dashboard',
    email: null,
    message,
    errorMsg,
    voiceName,
    transcript,
    onStop, onPause, onResume,
    onClose: close, onReplay,
    onStartListeningForCommand: onListen,
    onStartReplyListening: onVoiceReply,
    onSetTranscript,
    onSendReply: async () => onSendReply(transcript),
  } : null

  if (variant === 'toolbar') {
    return (
      <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
        <AutrixToolbarBadge state={state} onClick={() => setOpen(p => !p)} />
        {open && Panel && panelProps && (
          <div data-axb style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', zIndex: 9999 }}>
            <div className="axb-panel-wrap"><Panel {...panelProps} /></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="supra-floating-widget"
      data-panel-open={open ? 'true' : 'false'}
      data-position={position}
      style={{
        position: 'fixed',
        ...floatingStyles,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isLeft ? 'flex-start' : 'flex-end',
        gap: 12,
      }}
    >
      {open && Panel && panelProps && (
        <div data-axb>
          <div className="axb-panel-wrap"><Panel {...panelProps} /></div>
        </div>
      )}
      {!open && <AutrixBadge state={state} module={currentModule} onClick={() => setOpen(p => !p)} />}
    </div>
  )
}

export default SupraLeoAI