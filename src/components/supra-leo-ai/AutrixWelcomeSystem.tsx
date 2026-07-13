'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, Zap, Car, Shield, Clock, MessageSquare, Rss, Calendar } from 'lucide-react'
import { SupraLeoAvatar } from './SupraLeoAvatar'

const GLOBAL_WELCOME_KEY = 'autrix_welcomed_v1'

const WELCOME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Outfit:wght@300;400;500;600&family=Roboto+Mono:wght@300;400&display=swap');

/* ─── Keyframes ─── */
@keyframes aw-in       { from{opacity:0;transform:translateY(24px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes aw-out      { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(.95) translateY(12px)} }
@keyframes aw-bg-in    { from{opacity:0} to{opacity:1} }
@keyframes aw-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes aw-scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(500px)} }
@keyframes aw-dot      { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.55)} }
@keyframes aw-float    { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }
@keyframes aw-ring     { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.4);opacity:0} }
@keyframes aw-word     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes aw-glow     { 0%,100%{box-shadow:0 0 20px rgba(0,180,80,.15)} 50%{box-shadow:0 0 40px rgba(0,180,80,.35)} }
@keyframes aw-stripe   { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
@keyframes aw-bar      { from{width:0} to{width:100%} }
@keyframes aw-counter  { from{opacity:0} to{opacity:1} }
@keyframes aw-revealUp { from{opacity:0;clip-path:inset(100% 0 0 0)} to{opacity:1;clip-path:inset(0% 0 0 0)} }
@keyframes aw-breathe  { 0%,100%{opacity:.6} 50%{opacity:1} }

/* ─── Overlay ─── */
.aw-overlay {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: aw-bg-in .35s ease forwards;
}
.aw-overlay-bg {
  position: absolute; inset: 0;
  background: rgba(0,8,4,.87);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
}

/* ─── Dashboard Card ─── */
.aw-card {
  position: relative; z-index: 1;
  width: min(500px, 100%);
  background: #040D07;
  border: 1px solid rgba(0,180,80,.22);
  border-radius: 4px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(0,180,80,.06),
    0 4px 60px rgba(0,0,0,.9),
    0 0 100px rgba(0,180,80,.07),
    inset 0 1px 0 rgba(0,180,80,.12);
  animation: aw-in .44s cubic-bezier(.16,1,.3,1) forwards;
}
.aw-card.closing { animation: aw-out .22s ease forwards; }

/* Racing stripe top bar */
.aw-card-topbar {
  height: 3px;
  background: linear-gradient(90deg, transparent 0%, #00B450 20%, #00FF6A 50%, #00B450 80%, transparent 100%);
  background-size: 200% 100%;
  animation: aw-shimmer 2.5s linear infinite;
  position: relative;
}
.aw-card-topbar::after {
  content:'';
  position:absolute; top:0; left:0; right:0; bottom:0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
  width: 60px;
  animation: aw-stripe 2s linear infinite;
}

/* Corner accents */
.aw-corner {
  position: absolute; width: 16px; height: 16px; z-index: 10;
}
.aw-corner--tl { top: 12px; left: 12px; border-top: 1.5px solid rgba(0,180,80,.6); border-left: 1.5px solid rgba(0,180,80,.6); }
.aw-corner--tr { top: 12px; right: 12px; border-top: 1.5px solid rgba(0,180,80,.6); border-right: 1.5px solid rgba(0,180,80,.6); }
.aw-corner--bl { bottom: 12px; left: 12px; border-bottom: 1.5px solid rgba(0,180,80,.6); border-left: 1.5px solid rgba(0,180,80,.6); }
.aw-corner--br { bottom: 12px; right: 12px; border-bottom: 1.5px solid rgba(0,180,80,.6); border-right: 1.5px solid rgba(0,180,80,.6); }

/* Grid bg */
.aw-grid-bg {
  position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: .03;
}

/* Scanline */
.aw-scanline {
  position: absolute; left: 0; right: 0; height: 80px; z-index: 2; pointer-events: none;
  background: linear-gradient(180deg, transparent 0%, rgba(0,180,80,.06) 50%, transparent 100%);
  animation: aw-scanline 6s linear infinite;
}

.aw-body {
  position: relative; z-index: 3;
  padding: 36px 36px 30px;
  display: flex; flex-direction: column; align-items: center; gap: 22px;
  text-align: center;
}

/* Header row */
.aw-header-row {
  display: flex; align-items: center; gap: 10px;
  font-family: 'Roboto Mono', monospace;
  font-size: 8px; letter-spacing: .3em; text-transform: uppercase;
  color: rgba(0,180,80,.5);
}
.aw-header-divider { width: 24px; height: 1px; background: rgba(0,180,80,.3); }

/* Avatar area */
.aw-avatar-wrap {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  animation: aw-float 4s ease-in-out infinite;
}
.aw-avatar-ring {
  position: absolute; border-radius: 50%;
  border: 1px solid rgba(0,180,80,.4);
  animation: aw-ring 2.8s ease-out infinite;
}
.aw-avatar-glow {
  position: absolute; inset: -20px; border-radius: 50%;
  background: radial-gradient(circle, rgba(0,180,80,.12) 0%, transparent 70%);
  animation: aw-breathe 3s ease-in-out infinite;
}

/* Title */
.aw-brand-row {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.aw-eyebrow {
  font-family: 'Roboto Mono', monospace;
  font-size: 8px; letter-spacing: .35em; text-transform: uppercase;
  color: rgba(0,180,80,.55);
  display: flex; align-items: center; gap: 8px;
}
.aw-eyebrow-dot {
  width: 4px; height: 4px; border-radius: 50%; background: #00B450;
  animation: aw-dot 1.4s ease-in-out infinite;
}
.aw-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 28px; font-weight: 900;
  color: #E8F5E9;
  letter-spacing: .08em; text-transform: uppercase; line-height: 1;
}
.aw-title-green { color: #00C853; }
.aw-subtitle {
  font-family: 'Roboto Mono', monospace;
  font-size: 8px; letter-spacing: .22em; text-transform: uppercase;
  color: rgba(0,180,80,.38);
}

/* Speaking indicator */
.aw-speaking {
  display: flex; align-items: center; gap: 5px;
  font-family: 'Roboto Mono', monospace;
  font-size: 7.5px; letter-spacing: .18em; text-transform: uppercase;
  color: rgba(0,200,83,.6);
}
.aw-speaking-bar {
  width: 2px; border-radius: 1px; background: #00C853;
}

/* Message */
.aw-message {
  font-family: 'Outfit', sans-serif;
  font-size: 14px; font-weight: 300; line-height: 1.75;
  color: rgba(180,220,190,.72);
  max-width: 380px;
}
.aw-message strong { color: #E8F5E9; font-weight: 500; }

/* Feature pills */
.aw-features {
  display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
}
.aw-pill {
  display: inline-flex; align-items: center; gap: 5px;
  height: 24px; padding: 0 10px;
  border: 1px solid rgba(0,180,80,.2);
  border-radius: 2px;
  background: rgba(0,180,80,.06);
  font-family: 'Roboto Mono', monospace;
  font-size: 7.5px; letter-spacing: .12em; text-transform: uppercase;
  color: rgba(0,200,83,.65);
}
.aw-pill-diamond {
  width: 4px; height: 4px;
  background: #00C853; opacity: .7;
  transform: rotate(45deg);
}

/* Progress bar */
.aw-progress-wrap {
  width: 100%; display: flex; flex-direction: column; gap: 5px;
}
.aw-progress-label {
  display: flex; justify-content: space-between;
  font-family: 'Roboto Mono', monospace;
  font-size: 7px; letter-spacing: .2em; text-transform: uppercase;
  color: rgba(0,180,80,.4);
}
.aw-progress-track {
  width: 100%; height: 2px; background: rgba(0,180,80,.1); border-radius: 1px; overflow: hidden;
}
.aw-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00B450, #00FF6A);
  animation: aw-bar 18s linear forwards;
}

/* CTA */
.aw-cta {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; height: 46px;
  border: 1px solid rgba(0,180,80,.4);
  border-radius: 3px;
  background: rgba(0,180,80,.1);
  color: #00C853;
  font-family: 'Orbitron', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
  cursor: pointer; transition: all .2s;
  position: relative; overflow: hidden;
}
.aw-cta::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(0,180,80,.15) 0%, transparent 100%);
  opacity: 0; transition: opacity .2s;
}
.aw-cta:hover { border-color: rgba(0,200,83,.7); background: rgba(0,180,80,.18); color: #00FF6A; box-shadow: 0 0 30px rgba(0,180,80,.15); }
.aw-cta:hover::before { opacity: 1; }

/* Close btn */
.aw-close {
  position: absolute; top: 16px; right: 16px; z-index: 10;
  width: 28px; height: 28px;
  border: 1px solid rgba(0,180,80,.15);
  border-radius: 2px; background: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(0,180,80,.35); transition: all .15s;
}
.aw-close:hover { color: rgba(0,200,83,.8); background: rgba(0,180,80,.08); border-color: rgba(0,180,80,.4); }

/* ─── Page Card ─── */
.aw-page-card {
  position: relative; z-index: 1;
  width: min(440px, 100%);
  background: #040D07;
  border: 1px solid rgba(0,180,80,.2);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 60px rgba(0,0,0,.9), 0 0 80px rgba(0,180,80,.06), inset 0 1px 0 rgba(0,180,80,.1);
  animation: aw-in .38s cubic-bezier(.16,1,.3,1) forwards;
}
.aw-page-card.closing { animation: aw-out .2s ease forwards; }

.aw-page-accent-bar {
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--pg-color, #00B450), transparent);
  background-size: 200% 100%;
  animation: aw-shimmer 2.5s linear infinite;
}

.aw-page-body {
  padding: 28px 30px 26px;
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  text-align: center;
  position: relative; z-index: 1;
}

.aw-page-icon-wrap {
  width: 62px; height: 62px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,180,80,.07);
  position: relative;
  animation: aw-float 3.5s ease-in-out infinite;
}
.aw-page-icon-wrap svg { width: 26px; height: 26px; }

.aw-page-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 20px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #E8F5E9;
  line-height: 1.1;
}

.aw-page-desc {
  font-family: 'Outfit', sans-serif;
  font-size: 13px; font-weight: 300; line-height: 1.7;
  color: rgba(180,220,190,.65);
  max-width: 340px;
}

.aw-page-tips {
  display: flex; flex-direction: column; gap: 7px;
  width: 100%;
}
.aw-page-tip {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 9px 12px; border-radius: 3px;
  border: 1px solid rgba(0,180,80,.1);
  background: rgba(0,180,80,.04);
  text-align: left;
  animation: aw-word .3s ease forwards; opacity: 0;
}
.aw-page-tip-bullet {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--pg-color, #00B450);
  flex-shrink: 0; margin-top: 5px; opacity: .7;
}
.aw-page-tip-text {
  font-family: 'Outfit', sans-serif;
  font-size: 12px; font-weight: 300; line-height: 1.55;
  color: rgba(180,220,190,.6);
}

.aw-page-cta {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; height: 40px;
  border: 1px solid; border-radius: 3px;
  font-family: 'Orbitron', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.aw-page-cta:hover { opacity: .85; }

/* ─── Speaking bars animation ─── */
.aw-bars { display: flex; align-items: center; gap: 2.5px; height: 14px; }
.aw-bar {
  width: 2.5px; border-radius: 1px; background: #00C853;
  animation: aw-dot var(--d, .8s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}
`

function injectWelcomeCSS() {
  if (typeof document === 'undefined') return
  if (document.getElementById('aw-css-v2')) return
  const el = document.createElement('style')
  el.id = 'aw-css-v2'
  el.textContent = WELCOME_CSS
  document.head.appendChild(el)
}

function speak(text: string, rate = 0.91, pitch = 1): SpeechSynthesisUtterance {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = rate; utt.pitch = pitch; utt.volume = 0.9
  const go = () => {
    const voices = window.speechSynthesis.getVoices()
    const v =
      voices.find((v) => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices[0]
    if (v) utt.voice = v
    window.speechSynthesis.speak(utt)
  }
  window.speechSynthesis.getVoices().length === 0
    ? (window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; go() })
    : go()
  return utt
}

function SpeakingBars() {
  return (
    <div className="aw-bars">
      {[{ h: 8, d: '.7s', dl: '0s' }, { h: 13, d: '.9s', dl: '.1s' }, { h: 6, d: '.6s', dl: '.2s' }, { h: 11, d: '.8s', dl: '.05s' }, { h: 9, d: '.75s', dl: '.15s' }].map((b, i) => (
        <div key={i} className="aw-bar" style={{ height: b.h, '--d': b.d, '--delay': b.dl } as React.CSSProperties} />
      ))}
    </div>
  )
}

export interface PageConfig {
  title: string
  highlight: string
  iconComponent: React.ReactNode
  color: string
  description: string
  tips: string[]
  voiceGreeting: string
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  appointments: {
    title: 'Appointments',
    highlight: 'Module',
    iconComponent: <Calendar color="#00C853" />,
    color: '#00C853',
    description: "Your deal pipeline starts here. Manage every incoming lead, schedule test drives and service visits, and follow up with precision. Every minute in this module is a minute closer to a closed deal.",
    tips: [
      'View all incoming leads from DealersCloud in the Leads tab.',
      'Switch to Calendar View to visualize your full schedule at a glance.',
      'Click the Autrix icon on any lead to have me draft a custom reply instantly.',
    ],
    voiceGreeting: "Welcome to the Appointments module! I'm Autrix, your AI sales co-pilot. Here you manage your full lead pipeline and schedule every appointment. Click the Autrix button on any lead card to have me analyze it and draft a custom reply.",
  },
  timeproof: {
    title: 'Timeproof',
    highlight: 'Attendance',
    iconComponent: <Clock color="#F59E0B" />,
    color: '#F59E0B',
    description: "Track every shift, break, and hour with pinpoint accuracy. Your Timeproof dashboard gives you full visibility over attendance records and lets me surface any anomalies instantly.",
    tips: [
      'Clock in at the start of your shift to begin time tracking.',
      'Use the break button to accurately log your break time.',
      'Ask me to summarize your weekly or monthly attendance in Chat.',
    ],
    voiceGreeting: "Welcome to Timeproof! This is where your shift hours are logged with precision. Clock in when you arrive, and use the break button so every minute is accounted for.",
  },
  'supra-space': {
    title: 'Supra Space',
    highlight: 'Messaging',
    iconComponent: <MessageSquare color="#8B5CF6" />,
    color: '#8B5CF6',
    description: "Your team's communication command center. Real-time messaging, group channels, and file sharing — built for the pace of a busy dealership floor.",
    tips: [
      'Unread conversations appear highlighted — tackle them first.',
      'Use Channels for team-wide announcements and broadcast updates.',
      'Ask me to draft a team message or summarize threads you missed.',
    ],
    voiceGreeting: "Welcome to Supra Space, your team messaging hub! Chat with colleagues, share updates, and stay in sync with the floor.",
  },
  biometrics: {
    title: 'Biometrics',
    highlight: 'Security',
    iconComponent: <Shield color="#EF4444" />,
    color: '#EF4444',
    description: "Your security command center. Manage fingerprint authentication, SSH keys, and access credentials — encrypted and audit-logged for every action.",
    tips: [
      'Enroll biometric credentials for fast, secure daily login.',
      'Add SSH keys for developer access to secure systems.',
      'Review your audit log for any unusual access attempts.',
    ],
    voiceGreeting: "Welcome to the Biometrics module — your security command center. Manage fingerprint login and access credentials. Your security is our top priority.",
  },
  feeds: {
    title: 'Team Feeds',
    highlight: 'Social',
    iconComponent: <Rss color="#06B6D4" />,
    color: '#06B6D4',
    description: "The heartbeat of Action Auto. Share wins, post updates, celebrate team milestones, and keep everyone connected — on the floor and off it.",
    tips: [
      'Share shoutouts to celebrate your team\'s wins.',
      'React and comment to stay engaged with colleagues.',
      'Ask me to write a motivational post or team announcement.',
    ],
    voiceGreeting: "Welcome to Team Feeds — the social hub of Action Auto. Share updates, celebrate wins, and keep your team energized.",
  },
}

interface DashboardWelcomeProps {
  userName: string
  onClose: () => void
}

function DashboardWelcomeModal({ userName, onClose }: DashboardWelcomeProps) {
  const [closing, setClosing] = React.useState(false)
  const [speaking, setSpeaking] = React.useState(false)

  const handleClose = React.useCallback(() => {
    window.speechSynthesis.cancel()
    setClosing(true)
    setTimeout(onClose, 220)
  }, [onClose])

  React.useEffect(() => {
    injectWelcomeCSS()
    const t = setTimeout(() => {
      const firstName = userName.split(' ')[0]
      setSpeaking(true)
      const msg = `Welcome to Action Auto CRM, ${firstName}. I'm Autrix, your AI co-pilot. I help you manage leads, schedule appointments, track attendance, and keep your team connected. You'll find me in the bottom right — tap anytime. The Appointments module handles your full lead pipeline. Supra Space is your team messaging hub. Timeproof logs your shifts. Biometrics keeps you secure. And Team Feeds keeps everyone connected. Let's close some deals.`
      const utt = speak(msg, 0.9)
      utt.onend = () => setSpeaking(false)
      utt.onerror = () => setSpeaking(false)
    }, 800)
    const closeTimer = setTimeout(handleClose, 20000)
    return () => { clearTimeout(t); clearTimeout(closeTimer); window.speechSynthesis.cancel() }
  }, [userName, handleClose])

  const pills = ['Lead Pipeline', 'AI Analysis', 'Voice Assist', 'Smart Reminders', 'Quick Actions']

  return createPortal(
    <div className="aw-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="aw-overlay-bg" />
      <div className={`aw-card ${closing ? 'closing' : ''}`}>
        {/* Corner accents */}
        <div className="aw-corner aw-corner--tl" />
        <div className="aw-corner aw-corner--tr" />
        <div className="aw-corner aw-corner--bl" />
        <div className="aw-corner aw-corner--br" />

        {/* Top racing stripe */}
        <div className="aw-card-topbar" />

        <button className="aw-close" onClick={handleClose}><X size={11} /></button>

        {/* Grid background */}
        <svg className="aw-grid-bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 36} y1="0" x2={i * 36} y2="100%" stroke="#00B450" strokeWidth="0.4" />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 30} x2="100%" y2={i * 30} stroke="#00B450" strokeWidth="0.4" />
          ))}
        </svg>

        {/* Scanline */}
        <div className="aw-scanline" />

        <div className="aw-body">
          {/* Header */}
          <div className="aw-header-row">
            <div className="aw-header-divider" />
            <Car size={11} color="rgba(0,180,80,.5)" />
            <span>Action Auto CRM</span>
            <div className="aw-header-divider" />
          </div>

          {/* Avatar */}
          <div className="aw-avatar-wrap">
            <div className="aw-avatar-glow" />
            <div className="aw-avatar-ring" style={{ width: 96, height: 96 }} />
            <div className="aw-avatar-ring" style={{ width: 96, height: 96, animationDelay: '1.4s' }} />
            <SupraLeoAvatar state={speaking ? 'speaking' : 'idle'} size={70} animate />
          </div>

          {/* Brand */}
          <div className="aw-brand-row">
            <div className="aw-eyebrow">
              <div className="aw-eyebrow-dot" />
              AI Sales Co-Pilot
              <div className="aw-eyebrow-dot" style={{ animationDelay: '.5s' }} />
            </div>
            <div className="aw-title">
              Supra <span className="aw-title-green">Autrix</span>
            </div>
            <div className="aw-subtitle">Driven by Intelligence · Built for Dealers</div>
          </div>

          {/* Speaking */}
          {speaking && (
            <div className="aw-speaking">
              <SpeakingBars />
              <span style={{ marginLeft: 4 }}>Autrix Speaking</span>
            </div>
          )}

          {/* Message */}
          <div className="aw-message">
            Welcome, <strong>{userName.split(' ')[0]}</strong>. I'm your AI co-pilot for the Action Auto CRM — here to help you close more deals, stay on schedule, and keep your team running at full throttle.
          </div>

          {/* Pills */}
          <div className="aw-features">
            {pills.map((p) => (
              <div key={p} className="aw-pill">
                <div className="aw-pill-diamond" />
                {p}
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="aw-progress-wrap">
            <div className="aw-progress-label">
              <span>System Initializing</span>
              <span>Ready</span>
            </div>
            <div className="aw-progress-track">
              <div className="aw-progress-fill" />
            </div>
          </div>

          {/* CTA */}
          <button className="aw-cta" onClick={handleClose}>
            <Zap size={13} />
            Enter Dashboard
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Page Welcome Modal ───────────────────────────────────────────────────────
interface PageWelcomeModalProps {
  pageKey: string
  onClose: () => void
}

function PageWelcomeModal({ pageKey, onClose }: PageWelcomeModalProps) {
  const [closing, setClosing] = React.useState(false)
  const [speaking, setSpeaking] = React.useState(false)
  const cfg = PAGE_CONFIGS[pageKey]

  const handleClose = React.useCallback(() => {
    window.speechSynthesis.cancel()
    setClosing(true)
    setTimeout(onClose, 200)
  }, [onClose])

  React.useEffect(() => {
    if (!cfg) return
    injectWelcomeCSS()
    const t = setTimeout(() => {
      setSpeaking(true)
      const utt = speak(cfg.voiceGreeting, 0.91)
      utt.onend = () => setSpeaking(false)
      utt.onerror = () => setSpeaking(false)
    }, 500)
    const closeTimer = setTimeout(handleClose, 14000)
    return () => { clearTimeout(t); clearTimeout(closeTimer); window.speechSynthesis.cancel() }
  }, [cfg, handleClose])

  if (!cfg) return null

  return createPortal(
    <div className="aw-overlay" style={{ zIndex: 99998 }} onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="aw-overlay-bg" />
      <div className={`aw-page-card ${closing ? 'closing' : ''}`} style={{ '--pg-color': cfg.color } as React.CSSProperties}>
        <div className="aw-corner aw-corner--tl" style={{ borderColor: `${cfg.color}60` }} />
        <div className="aw-corner aw-corner--tr" style={{ borderColor: `${cfg.color}60` }} />
        <div className="aw-corner aw-corner--bl" style={{ borderColor: `${cfg.color}60` }} />
        <div className="aw-corner aw-corner--br" style={{ borderColor: `${cfg.color}60` }} />

        <button className="aw-close" onClick={handleClose}><X size={11} /></button>
        <div className="aw-page-accent-bar" />

        <div className="aw-page-body">
          <div className="aw-page-icon-wrap" style={{ boxShadow: `0 0 40px ${cfg.color}20` }}>
            {cfg.iconComponent}
          </div>

          <div className="aw-eyebrow" style={{ justifyContent: 'center' }}>
            <div className="aw-eyebrow-dot" style={{ background: cfg.color }} />
            Module Overview
          </div>

          <div className="aw-page-title" style={{ color: '#E8F5E9' }}>
            {cfg.title} <span style={{ color: cfg.color }}>{cfg.highlight}</span>
          </div>

          {speaking && (
            <div className="aw-speaking">
              <SpeakingBars />
              <span style={{ marginLeft: 4 }}>Autrix Speaking</span>
            </div>
          )}

          <div className="aw-page-desc">{cfg.description}</div>

          <div className="aw-page-tips">
            {cfg.tips.map((tip, i) => (
              <div key={i} className="aw-page-tip" style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
                <div className="aw-page-tip-bullet" />
                <span className="aw-page-tip-text">{tip}</span>
              </div>
            ))}
          </div>

          <button
            className="aw-page-cta"
            style={{ borderColor: `${cfg.color}44`, background: `${cfg.color}0D`, color: cfg.color }}
            onClick={handleClose}
          >
            <Zap size={11} />
            Explore {cfg.title}
            <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Hook: Dashboard welcome — shows ONCE EVER via localStorage ───────────────
export function useAutrixVoiceWelcome(userName: string, isReady: boolean) {
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    if (!isReady || !userName) return
    // Use localStorage so this persists across sessions — shows only once ever.
    if (localStorage.getItem(GLOBAL_WELCOME_KEY)) return
    localStorage.setItem(GLOBAL_WELCOME_KEY, '1')
    const t = setTimeout(() => setShow(true), 1200)
    return () => clearTimeout(t)
  }, [isReady, userName])

  return show ? <DashboardWelcomeModal userName={userName} onClose={() => setShow(false)} /> : null
}

// ─── Hook: Page welcome on first visit per page ───────────────────────────────
export function useAutrixPageWelcome(pageKey: string) {
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    if (!pageKey || !PAGE_CONFIGS[pageKey]) return
    const key = `autrix_page_${pageKey}_v1`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    const t = setTimeout(() => setShow(true), 600)
    return () => clearTimeout(t)
  }, [pageKey])

  return show ? <PageWelcomeModal pageKey={pageKey} onClose={() => setShow(false)} /> : null
}

// ─── Drop-in gate components ──────────────────────────────────────────────────
export function AutrixWelcomeGate({ userName, isReady }: { userName: string; isReady: boolean }) {
  const modal = useAutrixVoiceWelcome(userName, isReady)
  return <>{modal}</>
}

export function AutrixPageGate({ pageKey }: { pageKey: string }) {
  const modal = useAutrixPageWelcome(pageKey)
  return <>{modal}</>
}

export default AutrixWelcomeGate