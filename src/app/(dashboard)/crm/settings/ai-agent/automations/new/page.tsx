"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { AutomationBuilder } from "@/components/crm/aiHub/automation/AutomationBuilder"

function NewAutomation() {
  const template = useSearchParams()?.get("template") || undefined
  return <AutomationBuilder key={template || "blank"} templateKey={template} />
}

export default function NewAutomationPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <NewAutomation />
    </React.Suspense>
  )
}
