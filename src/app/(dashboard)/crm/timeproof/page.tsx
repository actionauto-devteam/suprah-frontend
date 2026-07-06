"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TimeprofRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/crm/timeproof-clock")
  }, [router])
  return null
}
