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
    const prevScheme = html.style.colorScheme
    const wasDark = html.classList.contains("dark")
    html.style.backgroundColor = "transparent"
    body.style.backgroundColor = "transparent"
    html.classList.remove("dark")
    html.classList.add("light")
    html.style.colorScheme = "light"
    return () => {
      html.style.backgroundColor = prevHtml
      body.style.backgroundColor = prevBody
      html.style.colorScheme = prevScheme
      if (wasDark) {
        html.classList.remove("light")
        html.classList.add("dark")
      }
    }
  }, [isEmbed])

  return (
    <main className={cn("flex-1 overflow-hidden", isEmbed ? "bg-transparent" : "bg-background")}>
      {children}
    </main>
  )
}
