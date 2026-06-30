"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { useUser, useAuthActions } from "@/providers/AuthProvider"
import { useMyMembership } from "@/hooks/api/useMembership"

function getMemberId(userId: string): string {
  const hex = userId.slice(-12).toUpperCase()
  return `${hex.slice(0, 4)} ${hex.slice(4, 8)} ${hex.slice(8, 12)}`
}

function getSinceYear(userId: string): string {
  try {
    const ts = parseInt(userId.substring(0, 8), 16) * 1000
    return new Date(ts).getFullYear().toString()
  } catch {
    return new Date().getFullYear().toString()
  }
}

export function MembershipCardInline({ onClick }: { onClick?: () => void }) {
  const { user } = useUser()
  const { user: rawUser } = useAuthActions()
  const { data: membership } = useMyMembership()

  if (!user || !rawUser) return null

  const memberName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.fullName || rawUser.email
  const memberId = getMemberId(rawUser._id)
  const sinceYear = getSinceYear(rawUser._id)
  const qrValue = `https://suprah.ai/member/${rawUser._id}?name=${encodeURIComponent(memberName)}&dealer=${encodeURIComponent("Action Auto")}`

  const tier = membership?.currentTier
  const tierName = tier?.name ?? "Ignition"
  const tierPrimary = tier?.colorTheme.primary ?? "#9ca3af"
  const tierGradient = tier?.colorTheme.gradient ?? ["#374151", "#9ca3af"]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={onClick ? "View full membership card" : undefined}
      className="relative w-full overflow-hidden rounded-xl text-white shrink-0 mb-4 select-none text-left disabled:cursor-default touch-manipulation transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      style={{
        background: "linear-gradient(140deg, #060d10 0%, #0b1a14 40%, #071210 100%)",
        boxShadow: "0 12px 28px -8px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06)",
        aspectRatio: "1.586",
      }}
    >
      {/* Tier-colored top stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${tierPrimary}, transparent)` }}
      />

      {/* Tier-colored glows */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl" style={{ background: `${tierPrimary}33` }} />
      <div className="pointer-events-none absolute -bottom-12 -left-10 w-32 h-32 rounded-full blur-2xl" style={{ background: `${tierPrimary}1f` }} />

      {/* Dot-matrix texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
          maskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col justify-between px-3.5 py-3">

        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9.5px] font-black tracking-[0.25em] uppercase text-white leading-none">
              Action Auto
            </p>
            <p className="text-[7.5px] tracking-[0.2em] uppercase mt-0.5" style={{ color: `${tierPrimary}cc` }}>
              Jiffy Lube Partner
            </p>
          </div>
          <div className="bg-white rounded-md p-1 shadow-lg">
            <QRCodeSVG
              value={qrValue}
              size={36}
              bgColor="#ffffff"
              fgColor="#0b1a14"
              level="M"
              marginSize={0}
            />
          </div>
        </div>

        {/* Chip + tier badge */}
        <div className="flex items-center gap-2">
          <svg width="30" height="23" viewBox="0 0 38 30" fill="none">
            <rect x="0.5" y="0.5" width="37" height="29" rx="5" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <rect x="0.5" y="0.5" width="37" height="29" rx="5" fill="url(#chipGi)" />
            <line x1="13" y1="0.5" x2="13" y2="29.5" stroke="rgba(0,0,0,0.28)" strokeWidth="0.75" />
            <line x1="25" y1="0.5" x2="25" y2="29.5" stroke="rgba(0,0,0,0.28)" strokeWidth="0.75" />
            <line x1="0.5" y1="10" x2="37.5" y2="10" stroke="rgba(0,0,0,0.28)" strokeWidth="0.75" />
            <line x1="0.5" y1="20" x2="37.5" y2="20" stroke="rgba(0,0,0,0.28)" strokeWidth="0.75" />
            <rect x="13" y="10" width="12" height="10" rx="1.5" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.22)" strokeWidth="0.5" />
            <defs>
              <linearGradient id="chipGi" x1="0" y1="0" x2="38" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor={tierGradient[0]} />
                <stop offset="0.45" stopColor={tierPrimary} />
                <stop offset="1" stopColor={tierGradient[tierGradient.length - 1]} />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: tierPrimary }}>★ {tierName} Member</span>
        </div>

        {/* Cardholder */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[6.5px] uppercase tracking-[0.2em] text-white/60 mb-0.5">Cardholder</p>
            <p className="text-[10.5px] font-bold tracking-widest uppercase text-white leading-none truncate max-w-32.5">
              {memberName}
            </p>
            <p className="font-mono text-[9px] font-semibold tracking-[0.12em] mt-0.5" style={{ color: `${tierPrimary}e6` }}>
              {memberId}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[6.5px] uppercase tracking-[0.2em] text-white/60 mb-0.5">Since</p>
            <p className="font-mono text-white/80 text-[9px] font-semibold">{sinceYear}</p>
          </div>
        </div>

        {/* Representative section */}
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black text-white"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
          >
            JS
          </div>
          <div className="min-w-0">
            <p className="text-[8.5px] font-bold text-white/90 leading-none">Justin Soha</p>
            <p className="text-[7px] text-white/60 leading-snug mt-0.5 truncate">
              VP of Operations &amp; Market Ops Manager · Lube Management Corp, Utah
            </p>
          </div>
        </div>

      </div>

      {onClick && (
        <span className="absolute bottom-2 right-2.5 z-10 rounded-full bg-black/45 px-1.5 py-0.5 text-[6.5px] font-bold uppercase tracking-[0.15em] text-white/70 backdrop-blur-sm">
          Tap to view
        </span>
      )}
    </button>
  )
}
