'use client'

import * as React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface LeadData {
  _id: string
  firstName?: string; lastName?: string; senderName?: string
  senderEmail?: string; email?: string; subject?: string
  body?: string; status?: string
}

interface Props {
  lead?: LeadData
  leadId?: string
  size?: 'sm' | 'md'
  className?: string
}

function usePrefersDark() {
  const [dark, setDark] = React.useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
  )

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const sync = () => setDark(root.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return dark
}

export function SupraLeoReadButton({ lead, leadId, size = 'sm', className = '' }: Props) {
  const [active, setActive] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)
  const dark = usePrefersDark()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const id = lead?._id || leadId
    if (!id) return
    setActive(true)
    setTimeout(() => setActive(false), 1600)
    window.dispatchEvent(new CustomEvent('supraleo:read-message', {
      detail: {
        leadId: id,
        firstName: lead?.firstName,
        lastName: lead?.lastName,
        senderName: lead?.senderName,
        senderEmail: lead?.senderEmail,
        email: lead?.email,
        subject: lead?.subject,
        body: lead?.body,
        status: lead?.status,
      },
    }))
  }

  const dim = size === 'sm' ? 24 : 30
  const iconSz = size === 'sm' ? 13 : 16
  const isOn = active || hovered

  const accentBase  = dark ? 'rgba(59,130,246,' : 'rgba(37,99,235,'
  const accentSolid = dark ? '#60A5FA' : '#2563EB'
  const borderColor = active
    ? `${accentBase}0.6)`
    : isOn
      ? `${accentBase}0.4)`
      : `${accentBase}0.18)`
  const bgColor = active
    ? `${accentBase}0.16)`
    : isOn
      ? `${accentBase}0.08)`
      : `${accentBase}0.04)`
  const strokeMain = active
    ? `${accentBase}0.9)`
    : isOn
      ? `${accentBase}0.75)`
      : `${accentBase}0.55)`
  const strokeFaint = active
    ? `${accentBase}0.6)`
    : `${accentBase}0.35)`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label="Read with Autrix AI"
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: dim,
            height: dim,
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            background: bgColor,
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.15s, border-color 0.15s, transform 0.10s, box-shadow 0.15s',
            transform: active ? 'scale(0.91)' : 'scale(1)',
            boxShadow: active
              ? `0 0 8px ${accentBase}0.3)`
              : isOn
                ? `0 0 4px ${accentBase}0.12)`
                : 'none',
            flexShrink: 0,
          }}
        >
          <svg width={iconSz} height={iconSz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="7.5" r="5.2"
              stroke={strokeMain}
              strokeWidth="0.8" />
            <line x1="2.8" y1="6.2" x2="6.0" y2="6.2"
              stroke={active ? accentSolid : strokeMain}
              strokeWidth="1.1" strokeLinecap="round" />
            <line x1="3.2" y1="7.1" x2="5.5" y2="7.1"
              stroke={strokeFaint}
              strokeWidth="0.65" strokeLinecap="round" />
            <line x1="10.0" y1="6.2" x2="13.2" y2="6.2"
              stroke={active ? accentSolid : strokeMain}
              strokeWidth="1.1" strokeLinecap="round" />
            <line x1="10.5" y1="7.1" x2="12.8" y2="7.1"
              stroke={strokeFaint}
              strokeWidth="0.65" strokeLinecap="round" />
            <text x="8" y="9.2" textAnchor="middle" fontSize="5.5" fontWeight="700"
              fontFamily="'Rajdhani', 'DM Sans', sans-serif"
              fill={active ? accentSolid : strokeMain}
              style={{ letterSpacing: '.05em' }}>A</text>
            <path d="M5.2 11.4 L5.8 10.6 C6.1 10.35 6.5 10.2 7 10.2 L9 10.2 C9.5 10.2 9.9 10.35 10.2 10.6 L10.8 11.4"
              stroke={strokeFaint}
              strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {active && <circle cx="8" cy="7.5" r="1.5" fill={`${accentBase}0.3)`} />}
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '0.08em' }}>
          Read with Autrix AI
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

export default SupraLeoReadButton
