"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Mail, Megaphone, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

  const setTab = (tab: CampaignTab) => {
    router.replace(tab === "sms" ? "/crm/campaigns" : `/crm/campaigns?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/crm/leads")} aria-label="Back to leads">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold tracking-tight">Campaigns</h1>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Send SMS and email campaigns to CRM leads using the existing campaign tools.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "grid w-full rounded-xl border bg-muted/40 p-1 sm:w-auto",
              isAdmin ? "grid-cols-3" : "grid-cols-2",
            )}
            role="tablist"
            aria-label="Campaign channels"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedTab === "sms"}
              onClick={() => setTab("sms")}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
                selectedTab === "sms"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Megaphone className="h-4 w-4" />
              <span>SMS Campaigns</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedTab === "email"}
              onClick={() => setTab("email")}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
                selectedTab === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Mail className="h-4 w-4" />
              <span>Email Campaigns</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                role="tab"
                aria-selected={selectedTab === "contacts"}
                onClick={() => setTab("contacts")}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
                  selectedTab === "contacts"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Users className="h-4 w-4" />
                <span>Marketing Contacts</span>
              </button>
            )}
          </div>
        </div>

        {selectedTab === "email" ? (
          <EmailCampaignsPanel hideHeader />
        ) : selectedTab === "contacts" ? (
          <MarketingContactsPanel hideHeader />
        ) : (
          <SmsCampaignsPanel hideHeader />
        )}
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
