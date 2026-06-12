"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { useUser, useAuthActions } from "@/providers/AuthProvider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Share2, Shield, Star, Car } from "lucide-react"
import { toast } from "sonner"

function getMemberId(userId: string): string {
  return `AA-${userId.slice(-8).toUpperCase()}`
}

interface MembershipCardModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function MembershipCardModal({ isOpen, onOpenChange }: MembershipCardModalProps) {
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

  const handleShare = async () => {
    const text = `${memberName} — Action Auto Member ID: ${memberId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Action Auto Membership Card", text })
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(text)
      toast.success("Member ID copied!")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm p-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:text-white">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-2xl border border-zinc-800 p-5 sm:p-7">
          {/* ambient glow */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 bg-green-500/20 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 w-56 h-56 bg-emerald-400/10 rounded-full blur-3xl" />

          {/* card header */}
          <DialogHeader className="relative z-10 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-lg">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div className="leading-tight">
                  <DialogTitle className="text-white text-sm font-extrabold tracking-widest uppercase">
                    Action Auto
                  </DialogTitle>
                  <p className="text-zinc-400 text-[10px] uppercase tracking-widest">
                    Jiffy Lube Partner
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-full bg-green-500/15 border border-green-500/30 px-2.5 py-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-green-400 text-[10px] font-bold uppercase tracking-wider">
                  Gold
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* QR code */}
          <div className="relative z-10 flex justify-center mb-5">
            <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-2xl">
              <QRCodeSVG
                value={qrPayload}
                size={152}
                bgColor="#ffffff"
                fgColor="#18181b"
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          {/* member info */}
          <div className="relative z-10 space-y-0.5 mb-5">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-none break-all">
              {memberName}
            </h2>
            <p className="font-mono text-green-400 text-sm font-bold tracking-[0.15em]">
              {memberId}
            </p>
            <p className="text-zinc-500 text-xs pt-1 leading-relaxed">
              Show this QR code at any Jiffy Lube partner location to verify
              membership and redeem exclusive discounts.
            </p>
          </div>

          {/* divider */}
          <div className="relative z-10 flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-zinc-800" />
            <Shield className="w-3.5 h-3.5 text-zinc-600" />
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* actions */}
          <div className="relative z-10">
            <Button
              onClick={handleShare}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl h-11 font-semibold transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
