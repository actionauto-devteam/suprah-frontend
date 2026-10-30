"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Mail, Megaphone, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SmsCampaignsPanel } from "@/components/campaigns/SmsCampaignsPanel"
import { EmailCampaignsPanel } from "@/components/campaigns/EmailCampaignsPanel"
import { MarketingContactsPanel } from "@/components/campaigns/MarketingContactsPanel"
import { useUser } from "@/providers/AuthProvider"

type CampaignTab = "sms" | "email" | "contacts"

function CampaignsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const isAdmin = user?.role === "admin"
  const tabParam = searchParams.get("tab")
  const requestedTab: CampaignTab = tabParam === "email" ? "email" : tabParam === "contacts" ? "contacts" : "sms"
  const selectedTab: CampaignTab = requestedTab === "contacts" && !isAdmin ? "sms" : requestedTab

  const setTab = (tab: string) => {
    router.replace(tab === "sms" ? "/crm/campaigns" : `/crm/campaigns?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/crm/dashboard")} aria-label="Back to CRM dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Campaigns</h1>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Send SMS and email campaigns to CRM leads, and manage your reusable Marketing Contacts list.
              </p>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setTab}>
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1 sm:w-fit">
            <TabsTrigger value="sms" className="gap-1.5 px-3.5 py-2">
              <Megaphone className="h-3.5 w-3.5" />
              SMS Campaigns
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 px-3.5 py-2">
              <Mail className="h-3.5 w-3.5" />
              Email Campaigns
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="contacts" className="gap-1.5 px-3.5 py-2">
                <Users className="h-3.5 w-3.5" />
                Marketing Contacts
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="sms" className="mt-5">
            <SmsCampaignsPanel hideHeader />
          </TabsContent>
          <TabsContent value="email" className="mt-5">
            <EmailCampaignsPanel hideHeader />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="contacts" className="mt-5">
              <MarketingContactsPanel hideHeader />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  return (
    <React.Suspense fallback={<div className="h-full bg-background" />}>
      <CampaignsPageContent />
    </React.Suspense>
  )
}
