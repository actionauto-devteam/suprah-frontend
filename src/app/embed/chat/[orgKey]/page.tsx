"use client"

import { useParams, useSearchParams } from "next/navigation"
import { WebChatWidget } from "@/components/webchat/WebChatWidget"

export default function EmbedChatPage() {
  const { orgKey } = useParams<{ orgKey: string }>()
  const searchParams = useSearchParams()
  const vehicleId = searchParams.get("vehicleId") || undefined
  const contextLabel = searchParams.get("label") || undefined

  return (
    <div className="h-full w-full bg-transparent">
      <WebChatWidget
        orgKey={vehicleId ? undefined : orgKey}
        vehicleId={vehicleId}
        contextLabel={contextLabel}
        embedMode
      />
    </div>
  )
}
