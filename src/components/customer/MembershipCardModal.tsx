"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { useUser, useAuthActions } from "@/providers/AuthProvider"
import { useOrg } from "@/hooks/useOrg"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CarFront, ExternalLink, Share2, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useMyMembership } from "@/hooks/api/useMembership"
import { ACTION_AUTO_BENEFITS_REP, ACTION_AUTO_SERVICE_DISCOUNT_PERCENT, buildMemberBenefitsUrl } from "@/lib/customer-benefits"
import { DEFAULT_TIER_COLORS, MEMBER_CARD_DOTS, MEMBER_CARD_SURFACE, TIER_TEXT, tierColorVars } from "@/lib/membership-theme"
import { cn } from "@/lib/utils"

// The buttons under the card: solid on light screens, glass on dark screens.
const CARD_ACTION =
  "w-full rounded-xl h-11 font-semibold border bg-white text-emerald-950 border-white hover:bg-emerald-50 hover:text-emerald-950 " +
  "dark:bg-white/8 dark:hover:bg-white/15 dark:border-white/15 dark:text-white dark:hover:text-white dark:backdrop-blur-sm"

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

interface MembershipCardModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function MembershipCardModal({ isOpen, onOpenChange }: MembershipCardModalProps) {
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
  const lifetimePts = membership?.points.lifetimePoints ?? 0

  const handleShare = async () => {
    const text = `${memberName} - ${dealerName} ${tierName} Member - ${memberId} - ${ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}% service benefit`
    if (navigator.share) {
      try { await navigator.share({ title: `${dealerName} Membership Card`, text }) } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text)
      toast.success("Member ID copied!")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* The close button sits above the card (2026-11-18): the shared
          one sat on top of the dealership name. */}
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/70 backdrop-blur-[4px]"
        className="w-[calc(100vw-2rem)] max-w-sm gap-3 p-0 bg-transparent border-0 shadow-none">
        <DialogTitle className="sr-only">{dealerName} membership card</DialogTitle>
        <DialogDescription className="sr-only">
          Show this card&apos;s QR code at participating service locations for {ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}% off eligible services.
        </DialogDescription>
        <div className="flex justify-end">
          <DialogClose
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" />
          </DialogClose>
        </div>

        {/* Follows the light/dark theme (2026-11-18). */}
        <div
          className={cn(
            "relative grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl select-none",
            "shadow-[0_32px_64px_-12px_rgba(0,0,0,0.55)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.85)]",
            MEMBER_CARD_SURFACE,
          )}
          style={tierColorVars(tier?.colorTheme)}
        >
          {/* Card shape (2026-11-18): the bank-card proportions are the
              minimum, and the text shares this grid cell, so on narrow phones
              the card grows taller instead of cutting the last lines off. */}
          <span aria-hidden="true" className="col-start-1 row-start-1 w-full self-start" style={{ aspectRatio: "1.586" }} />

          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, transparent, ${tierPrimary}, transparent)` }}
          />

          <div
            className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl"
            style={{ background: `${tierPrimary}40` }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-16 w-48 h-48 rounded-full blur-3xl"
            style={{ background: `${tierPrimary}25` }}
          />

          <div
            className={cn("pointer-events-none absolute inset-0", MEMBER_CARD_DOTS)}
            style={{
              backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "10px 10px",
              maskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 40%, transparent 100%)",
            }}
          />

          <div className="relative z-10 col-start-1 row-start-1 flex flex-col justify-between gap-2 px-5 py-4 sm:px-6 sm:py-5">

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black tracking-[0.22em] uppercase text-foreground dark:text-white leading-none">
                  {dealerName}
                </p>
                <p className="text-[11px] tracking-[0.18em] uppercase mt-1 text-(--tier-ink) dark:text-(--tier)/80">
                  Jiffy Lube Partner
                </p>
              </div>

              <div className="bg-white rounded-lg p-1.5 shadow-xl ring-1 ring-emerald-900/10 dark:ring-0">
                <QRCodeSVG
                  value={qrValue}
                  size={72}
                  bgColor="#ffffff"
                  fgColor="#0b1a14"
                  level="M"
                  marginSize={0}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <svg width="38" height="30" viewBox="0 0 38 30" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="37" height="29" rx="5" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                <rect x="0.5" y="0.5" width="37" height="29" rx="5" fill="url(#chipG2)" />
                <line x1="13" y1="0.5" x2="13" y2="29.5" stroke="rgba(0,0,0,0.3)" strokeWidth="0.75" />
                <line x1="25" y1="0.5" x2="25" y2="29.5" stroke="rgba(0,0,0,0.3)" strokeWidth="0.75" />
                <line x1="0.5" y1="10" x2="37.5" y2="10" stroke="rgba(0,0,0,0.3)" strokeWidth="0.75" />
                <line x1="0.5" y1="20" x2="37.5" y2="20" stroke="rgba(0,0,0,0.3)" strokeWidth="0.75" />
                <rect x="13" y="10" width="12" height="10" rx="1.5" fill="rgba(0,0,0,0.2)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5" />
                <defs>
                  <linearGradient id="chipG2" x1="0" y1="0" x2="38" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor={tierGradient[0]} />
                    <stop offset="0.45" stopColor={tierPrimary} />
                    <stop offset="1" stopColor={tierGradient[tierGradient.length - 1]} />
                  </linearGradient>
                </defs>
              </svg>

              <div className="flex items-center gap-1 rounded-full px-2.5 py-1 border border-(--tier-ink)/30 bg-(--tier-ink)/8 dark:border-(--tier)/30 dark:bg-(--tier)/10">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", TIER_TEXT)}>
                  {tierName} Member
                </span>
              </div>

              <div className="rounded-full border px-2.5 py-1 bg-primary/12 border-primary/25 dark:bg-white/8 dark:border-white/14">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-white">
                  {ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}% off services
                </span>
              </div>

              {lifetimePts > 0 && (
                <span className="text-[11px] font-semibold text-foreground/80 dark:text-white/80 ml-auto">
                  {lifetimePts.toLocaleString()} pts
                </span>
              )}
            </div>

            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground dark:text-white/70 mb-1">Cardholder</p>
                <p className="text-sm font-bold tracking-[0.12em] uppercase text-foreground dark:text-white leading-tight min-w-0 break-words [overflow-wrap:anywhere] max-w-40 whitespace-normal">
                  {memberName}
                </p>
                <p className="font-mono text-xs font-semibold tracking-[0.14em] mt-1 text-(--tier-ink) dark:text-(--tier)/90">
                  {memberId}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground dark:text-white/70 mb-1">Since</p>
                <p className="font-mono text-foreground/85 dark:text-white/85 text-xs font-semibold">{sinceYear}</p>
              </div>
            </div>

            <div className="rounded-xl px-3 py-2 border-t bg-emerald-900/5 border-emerald-900/10 dark:bg-white/4 dark:border-white/7">
              <p className="text-xs font-bold text-foreground dark:text-white/90 leading-tight">
                {ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}% off eligible services
              </p>
              <p className="text-[11px] text-muted-foreground dark:text-white/75 leading-snug mt-0.5">
                Verify {dealerName} customer status with {ACTION_AUTO_BENEFITS_REP.name}.
              </p>
            </div>

          </div>
        </div>
        <div className="grid gap-2">
          <Button onClick={handleShare} className={CARD_ACTION}>
            <Share2 className="w-4 h-4 mr-2" />
            Share Card
          </Button>
          <Button asChild variant="outline" className={CARD_ACTION}>
            <Link href={qrValue} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Benefits
            </Link>
          </Button>
          <Button asChild variant="outline" className={CARD_ACTION}>
            <Link href="/customer?tab=vehicles&add=vehicle" onClick={() => onOpenChange(false)}>
              <CarFront className="w-4 h-4 mr-2" />
              Register VIN
            </Link>
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
