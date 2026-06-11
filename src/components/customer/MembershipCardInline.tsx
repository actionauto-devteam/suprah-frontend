"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { useUser, useAuthActions } from "@/providers/AuthProvider"
import { Car, Star, Shield } from "lucide-react"

function getMemberId(userId: string): string {
  return `AA-${userId.slice(-8).toUpperCase()}`
}

export function MembershipCardInline() {
  const { user } = useUser()
  const { user: rawUser } = useAuthActions()

  if (!user || !rawUser) return null

  const memberId = getMemberId(rawUser._id)
  const memberName =
    `${user.firstName} ${user.lastName}`.trim() || user.fullName || rawUser.email

  const qrPayload = JSON.stringify({
    type: "aa-member",
    id: rawUser._id,
    mid: memberId,
    name: memberName,
  })

  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl mb-4 shrink-0">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-12 -left-12 w-40 h-40 bg-green-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex items-center gap-4 p-4 sm:p-5">

        {/* Left — brand + member info */}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">

          {/* brand row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center shadow-md shrink-0">
                <Car className="w-4 h-4 text-white" />
              </div>
              <div className="leading-none">
                <p className="text-white text-[11px] font-extrabold tracking-widest uppercase">
                  Action Auto
                </p>
                <p className="text-zinc-500 text-[9px] uppercase tracking-widest mt-0.5">
                  Jiffy Lube Partner
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 shrink-0">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-green-400 text-[9px] font-bold uppercase tracking-wider">
                Gold
              </span>
            </div>
          </div>

          {/* divider */}
          <div className="h-px bg-zinc-800 w-full" />

          {/* member identity */}
          <div>
            <p className="text-white font-extrabold text-base leading-tight truncate">
              {memberName}
            </p>
            <p className="font-mono text-green-400 text-xs font-bold tracking-[0.12em] mt-0.5">
              {memberId}
            </p>
          </div>

          {/* hint */}
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-zinc-500 shrink-0" />
            <p className="text-zinc-500 text-[10px] leading-snug">
              Show QR at any Jiffy Lube counter to redeem discounts
            </p>
          </div>
        </div>

        {/* Right — QR code */}
        <div className="shrink-0">
          <div className="bg-white rounded-xl p-2 shadow-lg">
            <QRCodeSVG
              value={qrPayload}
              size={88}
              bgColor="#ffffff"
              fgColor="#18181b"
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
