"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { useUser, useAuthActions } from "@/providers/AuthProvider"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { toast } from "sonner"
import { useMyMembership } from "@/hooks/api/useMembership"

function getMemberId(userId: string): string {
  const hex = userId.slice(-12).toUpperCase()
  return `${hex.slice(0,4)} ${hex.slice(4,8)} ${hex.slice(8,12)}`
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
  const lifetimePts = membership?.points.lifetimePoints ?? 0

  const handleShare = async () => {
    const text = `${memberName} — Action Auto ${tierName} Member · ${memberId}`
    if (navigator.share) {
      try { await navigator.share({ title: "Action Auto Membership Card", text }) } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text)
      toast.success("Member ID copied!")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/70 backdrop-blur-[4px]"
        className="w-[calc(100vw-2rem)] max-w-sm p-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:text-white/80 [&>button]:top-3 [&>button]:left-3 [&>button]:right-auto [&>button]:z-50">

        <div
          className="relative overflow-hidden rounded-2xl text-white select-none"
          style={{
            background: "linear-gradient(140deg, #060d10 0%, #0b1a14 40%, #071210 100%)",
            boxShadow: "0 32px 64px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
            aspectRatio: "1.586",
          }}
        >
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
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
              maskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 40%, transparent 100%)",
            }}
          />

          <div className="relative z-10 h-full flex flex-col justify-between px-5 py-4 sm:px-6 sm:py-5">

            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black tracking-[0.28em] uppercase text-white leading-none">
                  Action Auto
                </p>
                <p className="text-[8.5px] tracking-[0.22em] uppercase mt-1" style={{ color: `${tierPrimary}cc` }}>
                  Jiffy Lube Partner
                </p>
              </div>

              <div className="bg-white rounded-lg p-1.5 shadow-xl">
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

            <div className="flex items-center gap-3">
              <svg width="38" height="30" viewBox="0 0 38 30" fill="none">
                <rect x="0.5" y="0.5" width="37" height="29" rx="5" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
                <rect x="0.5" y="0.5" width="37" height="29" rx="5" fill="url(#chipG2)"/>
                <line x1="13" y1="0.5" x2="13" y2="29.5" stroke="rgba(0,0,0,0.3)" strokeWidth="0.75"/>
                <line x1="25" y1="0.5" x2="25" y2="29.5" stroke="rgba(0,0,0,0.3)" strokeWidth="0.75"/>
                <line x1="0.5" y1="10" x2="37.5" y2="10" stroke="rgba(0,0,0,0.3)" strokeWidth="0.75"/>
                <line x1="0.5" y1="20" x2="37.5" y2="20" stroke="rgba(0,0,0,0.3)" strokeWidth="0.75"/>
                <rect x="13" y="10" width="12" height="10" rx="1.5" fill="rgba(0,0,0,0.2)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/>
                <defs>
                  <linearGradient id="chipG2" x1="0" y1="0" x2="38" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor={tierGradient[0]}/>
                    <stop offset="0.45" stopColor={tierPrimary}/>
                    <stop offset="1" stopColor={tierGradient[tierGradient.length - 1]}/>
                  </linearGradient>
                </defs>
              </svg>

              <div
                className="flex items-center gap-1 rounded-full px-2.5 py-1 border"
                style={{ background: `${tierPrimary}1a`, borderColor: `${tierPrimary}50` }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: tierPrimary }}>
                  ★ {tierName} Member
                </span>
              </div>

              {lifetimePts > 0 && (
                <span className="text-[9px] font-semibold text-white/70 ml-auto">
                  {lifetimePts.toLocaleString()} pts
                </span>
              )}
            </div>

            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[7.5px] uppercase tracking-[0.22em] text-white/60 mb-1">Cardholder</p>
                <p className="text-sm font-bold tracking-[0.12em] uppercase text-white leading-none truncate max-w-40">
                  {memberName}
                </p>
                <p className="font-mono text-[11px] font-semibold tracking-[0.14em] mt-1" style={{ color: `${tierPrimary}e6` }}>
                  {memberId}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[7.5px] uppercase tracking-[0.22em] text-white/60 mb-1">Since</p>
                <p className="font-mono text-white/85 text-xs font-semibold">{sinceYear}</p>
              </div>
            </div>

            <div
              className="rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[10px] font-bold text-white/90 leading-none">Justin Soha</p>
              <p className="text-[8px] text-white/65 leading-snug mt-0.5">
                VP of Operations &amp; Market Ops Manager · Lube Management Corp, Utah
              </p>
            </div>

          </div>
        </div>

        <div className="mt-3">
          <Button
            onClick={handleShare}
            className="w-full bg-white/8 hover:bg-white/15 border border-white/15 text-white rounded-xl h-11 font-semibold backdrop-blur-sm"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Card
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
