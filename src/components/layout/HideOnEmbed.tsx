"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

export function HideOnEmbed({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith("/embed")) return null
  return <>{children}</>
}
