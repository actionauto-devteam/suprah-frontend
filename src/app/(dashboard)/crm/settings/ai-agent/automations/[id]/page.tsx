"use client"

import { useParams } from "next/navigation"
import { AutomationBuilder } from "@/components/crm/aiHub/automation/AutomationBuilder"

export default function EditAutomationPage() {
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  return <AutomationBuilder key={id} automationId={id} />
}
