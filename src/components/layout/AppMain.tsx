"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isEmbed = pathname?.startsWith("/embed")

  React.useEffect(() => {
    if (!isEmbed) return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.backgroundColor
    const prevBody = body.style.backgroundColor
    html.style.backgroundColor = "transparent"
    body.style.backgroundColor = "transparent"
    return () => {
      html.style.backgroundColor = prevHtml
      body.style.backgroundColor = prevBody
    }
  }, [isEmbed])

  return (
    <main className={cn("flex-1 overflow-hidden", isEmbed ? "bg-transparent" : "bg-background")}>
      {children}
    </main>
  )
}
