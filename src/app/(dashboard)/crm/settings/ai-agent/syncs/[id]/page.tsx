"use client"

import { useParams } from "next/navigation"
import { DataSyncWizard } from "@/components/crm/aiHub/automation/DataSyncPages"

export default function EditDataSyncPage() {
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  return <DataSyncWizard key={id} syncId={id} />
}
