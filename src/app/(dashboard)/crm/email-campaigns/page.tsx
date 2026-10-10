import { redirect } from "next/navigation"

export default function EmailCampaignsRedirectPage() {
  redirect("/crm/campaigns?tab=email")
}
