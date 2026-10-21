"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Bot, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { useAiOperatingModes } from "@/hooks/useAiOperatingModes"
import { useCrmLeadGroups } from "@/hooks/useCrmLeadGroups"
import { CrmSettingsNav } from "@/components/crm/settings/CrmSettingsNav"
import { AiOperatingModesPanel } from "@/components/crm/AiOperatingModesPanel"
import { AiHubOverview, type AiAgentSettingsSummary } from "@/components/crm/aiHub/AiHubOverview"
import { ShadowDraftsPanel } from "@/components/crm/aiHub/ShadowDraftsPanel"
import { ShadowDraftDrawer } from "@/components/crm/aiHub/ShadowDraftDrawer"
import { AiUsagePanel } from "@/components/crm/aiHub/AiUsagePanel"
import { AiHistoryPanel } from "@/components/crm/aiHub/AiHistoryPanel"
import { HubCard } from "@/components/crm/aiHub/ShadowStatusBadge"
import { TrainingRulesPanel } from "@/components/crm/aiHub/TrainingRulesPanel"
import { TestingLabPanel } from "@/components/crm/aiHub/TestingLabPanel"
import { useTrainingStatus } from "@/hooks/useAiTraining"
import { canViewAiHub, SHADOW_DRAFT_STATUSES } from "@/lib/aiShadowDrafts"
import { AI_CHANNELS } from "@/lib/aiOperatingModes"
import type { ShadowDraftFilters } from "@/hooks/useAiShadowDrafts"

const HUB_TABS = [
  { value: "overview", label: "Overview" },
  { value: "modes", label: "Operating Modes" },
  { value: "drafts", label: "Shadow Drafts" },
  { value: "training", label: "Training Rules" },
  { value: "lab", label: "Testing Lab" },
  { value: "usage", label: "Usage" },
  { value: "history", label: "History" },
] as const
type HubTab = (typeof HUB_TABS)[number]["value"]

interface CrmUserData {
  _id: string
  fullName: string
  role: string
}

function readTab(value: string | null): HubTab {
  return HUB_TABS.some((tab) => tab.value === value) ? (value as HubTab) : "overview"
}

function readFilters(params: URLSearchParams): ShadowDraftFilters {
  const status = params.get("status") || undefined
  const channel = params.get("channel") || undefined
  const page = Number(params.get("page") || 1)
  return {
    status: status && (SHADOW_DRAFT_STATUSES as readonly string[]).includes(status) ? status : undefined,
    channel: channel && (AI_CHANNELS as readonly string[]).includes(channel) ? channel : undefined,
    sort: params.get("sort") === "oldest" ? "oldest" : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

function AiAgentHubContent() {
  const router = useRouter()
  const pathname = usePathname() || "/crm/settings/ai-agent"
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const [user, setUser] = React.useState<CrmUserData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [settings, setSettings] = React.useState<AiAgentSettingsSummary>({ agentName: "Alex" })
  const [fallbackGroupId, setFallbackGroupId] = React.useState("")
  const { groups } = useCrmLeadGroups()

  const getHubToken = React.useCallback(async () => {
    const crmToken = typeof window !== "undefined" ? localStorage.getItem("crm_token") : null
    return crmToken || (await getToken())
  }, [getToken])

  React.useEffect(() => {
    const check = async () => {
      const token = localStorage.getItem("crm_token")
      if (!token) {
        router.replace("/crm")
        return
      }
      try {
        const res = await apiClient.get("/api/crm/me", { headers: { Authorization: `Bearer ${token}` } })
        const me = (res.data?.data || res.data) as CrmUserData
        setUser(me)
        if (canViewAiHub(me.role)) {
          const settingsRes = await apiClient.get("/api/crm/org-settings", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
          const data = settingsRes ? (settingsRes.data?.data || settingsRes.data) : null
          if (data) {
            setSettings({
              agentName: String(data.aiAgentName || "").trim() || "Alex",
              followUpIntervalHours: typeof data.aiFollowUpIntervalHours === "number" ? data.aiFollowUpIntervalHours : undefined,
            })
            setFallbackGroupId(data.aiHandoffFallbackGroupId || "")
          }
        }
      } catch {
        localStorage.removeItem("crm_token")
        localStorage.removeItem("crm_user")
        router.replace("/crm")
      } finally {
        setIsLoading(false)
      }
    }
    void check()
  }, [router])

  const allowed = canViewAiHub(user?.role)
  const isAdmin = user?.role === "admin"
  const modes = useAiOperatingModes(getHubToken)
  const requestedTab = readTab(searchParams.get("tab"))
  const tab: HubTab = allowed || requestedTab === "lab" ? requestedTab : "training"
  const visibleTabs = allowed ? HUB_TABS : HUB_TABS.filter((item) => item.value === "training" || item.value === "lab")
  const training = useTrainingStatus(getHubToken, Boolean(user))
  const draftId = searchParams.get("draft")
  const filters = React.useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const fallbackGroupName = groups.find((group) => group._id === fallbackGroupId)?.name

  const updateParams = React.useCallback((patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") next.delete(key)
      else next.set(key, value)
    }
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const setTab = (value: string) => updateParams({
    tab: value === "overview" ? undefined : value,
    ...(value === "drafts" ? {} : { status: undefined, channel: undefined, sort: undefined, page: undefined }),
  })
  const setFilters = (next: ShadowDraftFilters) => updateParams({
    status: next.status,
    channel: next.channel,
    sort: next.sort === "oldest" ? "oldest" : undefined,
    page: next.page && next.page > 1 ? String(next.page) : undefined,
  })
  const openDraft = (id: string) => updateParams({ draft: id })
  const closeDraft = () => updateParams({ draft: undefined })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" aria-label="Loading" />
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen w-full bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/crm/dashboard")} className="h-9 w-9 p-0 rounded-xl border border-border/40 hover:bg-muted/50 shrink-0" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">AI Agent &amp; Automation</h1>
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">Status, operating modes, and Shadow Training for {settings.agentName}</p>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 px-2 rounded-full capitalize font-semibold ml-auto hidden sm:inline-flex shrink-0">
            {user.role}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <CrmSettingsNav role={user.role} />
          </div>

          <div className="lg:col-span-9 min-w-0 space-y-4">
            <Tabs value={tab} onValueChange={setTab} className="gap-4">
              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <TabsList className="w-max">
                  {visibleTabs.map((item) => (
                    <TabsTrigger key={item.value} value={item.value} className="px-3 text-xs">{item.label}</TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="training">
                <TrainingRulesPanel getToken={getHubToken} />
              </TabsContent>

              <TabsContent value="lab">
                <TestingLabPanel getToken={getHubToken} />
              </TabsContent>

              {allowed && (
                <>
                <TabsContent value="overview">
                  {modes.data ? (
                    <AiHubOverview
                      data={modes.data}
                      settings={{ ...settings, fallbackGroupName }}
                      isAdmin={isAdmin}
                      getToken={getHubToken}
                      onModesChange={modes.setData}
                      onOpenDraft={openDraft}
                      onShowDrafts={() => setTab("drafts")}
                    />
                  ) : (
                    <HubCard title="Overview" icon={<Bot className="h-4 w-4 text-primary" />}>
                      {modes.error
                        ? <p role="alert" className="text-xs text-red-600 dark:text-red-400">{modes.error}</p>
                        : <div className="h-24 rounded-xl bg-muted/50 animate-pulse" aria-busy="true" />}
                    </HubCard>
                  )}
                </TabsContent>

                <TabsContent value="modes">
                  <HubCard title="Operating modes" description="Choose, per channel, whether the AI agent is off, in training, or replying live." icon={<Bot className="h-4 w-4 text-primary" />}>
                    {!isAdmin && <p className="mb-3 text-[11px] text-muted-foreground/70">You can view the modes. Only admins can change them.</p>}
                    <AiOperatingModesPanel getToken={getHubToken} isAdmin={isAdmin} agentName={settings.agentName} />
                  </HubCard>
                </TabsContent>

                <TabsContent value="drafts">
                  <ShadowDraftsPanel getToken={getHubToken} filters={filters} onFiltersChange={setFilters} onOpen={openDraft} />
                </TabsContent>

                <TabsContent value="usage">
                  <AiUsagePanel getToken={getHubToken} />
                </TabsContent>

                <TabsContent value="history">
                  <AiHistoryPanel getToken={getHubToken} />
                </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>
      </main>
      {allowed && <ShadowDraftDrawer draftId={draftId} getToken={getHubToken} onClose={closeDraft} canEvaluate={Boolean(training.data?.enabled && training.data?.canReview)} />}
    </div>
  )
}

export default function AiAgentHubPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AiAgentHubContent />
    </React.Suspense>
  )
}
