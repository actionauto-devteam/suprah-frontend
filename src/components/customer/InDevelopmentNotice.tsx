"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Construction } from "lucide-react"
import { SUPPORT_EMAIL } from "@/lib/support-contact"
import { inDevelopmentFor } from "@/lib/customer-in-development"
import { useIsNativeApp } from "@/components/mobile/useIsNativeApp"

/**
 * "Still under development" at the top of a customer portal section that
 * isn't finished yet (see lib/customer-in-development): what works now, what
 * isn't ready, and who to contact. Shows nothing on finished pages.
 *
 * Inside the iPhone app those sections aren't offered, so a link that still
 * leads to one goes back to My Garage instead (2026-11-11).
 */
export function InDevelopmentNotice() {
  const pathname = usePathname()
  const router = useRouter()
  const isNativeApp = useIsNativeApp()
  const notice = inDevelopmentFor(pathname)

  React.useEffect(() => {
    if (isNativeApp && notice) router.replace("/customer")
  }, [isNativeApp, notice, router])

  if (!notice || isNativeApp) return null

  return (
    <section
      aria-label={`${notice.name} is still under development`}
      className="mb-4 overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 sm:mb-5"
    >
      <div className="h-0.5 bg-linear-to-r from-emerald-500 via-emerald-400 to-emerald-500/0" aria-hidden="true" />
      <div className="flex gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <Construction className="size-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-1.5 text-sm">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-black text-foreground">Still under development</span>
            <span className="rounded-full border border-emerald-500/30 bg-background/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Suprah AI
            </span>
          </p>
          <p className="text-foreground/90">
            The Suprah AI team is still building {notice.name}. <span className="font-semibold">What works now:</span> {notice.worksNow}
          </p>
          <p className="text-foreground/90">
            <span className="font-semibold">Not ready yet:</span> {notice.notReady}
          </p>
          <p className="text-xs text-muted-foreground">
            Questions? Email Suprah AI support at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-emerald-700 underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none dark:text-emerald-300"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
