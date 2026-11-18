"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { useUser, useAuthActions } from "@/providers/AuthProvider"
import { useOrg } from "@/hooks/useOrg"
import { useMyMembership } from "@/hooks/api/useMembership"
import { ACTION_AUTO_SERVICE_DISCOUNT_PERCENT, buildMemberBenefitsUrl } from "@/lib/customer-benefits"
import { DEFAULT_TIER_COLORS, MEMBER_CARD_DOTS, MEMBER_CARD_SURFACE, TIER_TEXT, tierColorVars } from "@/lib/membership-theme"
import { cn } from "@/lib/utils"

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
  const { organization } = useOrg()
  const dealerName = organization?.name || "Your Dealership"

  if (!user || !rawUser) return null

  const memberName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.fullName || rawUser.email
  const memberId = getMemberId(rawUser._id)
  const sinceYear = getSinceYear(rawUser._id)
  const qrValue = buildMemberBenefitsUrl(rawUser._id, memberName, dealerName)

  const tier = membership?.currentTier
  const tierName = tier?.name ?? "Ignition"
  const tierPrimary = tier?.colorTheme.primary ?? DEFAULT_TIER_COLORS.primary
  const tierGradient = tier?.colorTheme.gradient ?? DEFAULT_TIER_COLORS.gradient

  // Follows the light/dark theme (2026-11-18): Suprah mint on light screens,
  // the green-black card on dark screens.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={onClick ? "View full membership card" : undefined}
      className={cn(
        "relative grid grid-cols-[minmax(0,1fr)] w-full overflow-hidden rounded-xl shrink-0 mb-4 select-none text-left disabled:cursor-default touch-manipulation transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        "shadow-[0_12px_28px_-8px_rgba(6,78,59,0.22)] dark:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.75)]",
        MEMBER_CARD_SURFACE,
      )}
      style={tierColorVars(tier?.colorTheme)}
    >
      {/* Card shape (2026-11-18): this keeps the bank-card proportions as the
          minimum, and the text below shares its grid cell, so on narrow
          phones the card grows taller instead of cutting the last lines off. */}
      <span aria-hidden="true" className="col-start-1 row-start-1 w-full self-start" style={{ aspectRatio: "1.586" }} />

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
        className={cn("pointer-events-none absolute inset-0", MEMBER_CARD_DOTS)}
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "8px 8px",
          maskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      <div className="relative z-10 col-start-1 row-start-1 flex flex-col justify-between gap-2 px-3.5 py-3">

        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-black tracking-[0.2em] uppercase text-foreground dark:text-white leading-none">
              {dealerName}
            </p>
            <p className="text-[11px] tracking-[0.16em] uppercase mt-1 text-(--tier-ink) dark:text-(--tier)/80">
              Jiffy Lube Partner
            </p>
          </div>
          <div className="bg-white rounded-md p-1 shadow-lg ring-1 ring-emerald-900/10 dark:ring-0">
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
        <div className="flex items-center gap-2 flex-wrap">
          <svg width="30" height="23" viewBox="0 0 38 30" fill="none" aria-hidden="true">
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
          <span className={cn("text-[11px] font-bold uppercase tracking-wider", TIER_TEXT)}>{tierName} Member</span>
          <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-emerald-800 dark:bg-white/10 dark:text-white">{ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}% Service</span>
        </div>

        {/* Cardholder */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:text-white/70 mb-0.5">Cardholder</p>
            <p className="text-xs font-bold tracking-widest uppercase text-foreground dark:text-white leading-tight min-w-0 break-words [overflow-wrap:anywhere] max-w-44 whitespace-normal">
              {memberName}
            </p>
            <p className="font-mono text-[11px] font-semibold tracking-[0.12em] mt-0.5 text-(--tier-ink) dark:text-(--tier)/90">
              {memberId}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:text-white/70 mb-0.5">Since</p>
            <p className="font-mono text-foreground/85 dark:text-white/85 text-[11px] font-semibold">{sinceYear}</p>
          </div>
        </div>

        {/* Representative section */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-1.5 border-t bg-emerald-900/5 border-emerald-900/10 dark:bg-white/4 dark:border-white/6",
            onClick && "pr-28",
          )}
        >
          <div
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white leading-none"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
          >
            JS
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-foreground dark:text-white/90 leading-tight">{dealerName} Customer Benefit</p>
            <p className="text-[11px] text-muted-foreground dark:text-white/70 leading-snug mt-0.5">
              {ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}% off eligible services at participating locations
            </p>
          </div>
        </div>

      </div>

      {onClick && (
        <span className="absolute bottom-2 right-2.5 z-10 rounded-full bg-emerald-800 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm dark:bg-black/55 dark:text-white/85">
          Tap to view
        </span>
      )}
    </button>
  )
}
