"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Archive, ArchiveRestore, ArrowLeft, Eye, Loader2, MapPin, Pencil, Plus, Tags } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { useAlert } from "@/components/AlertDialog"
import { CrmSettingsNav } from "@/components/crm/settings/CrmSettingsNav"
import { HubCard, HubState } from "@/components/crm/aiHub/ShadowStatusBadge"
import { LocationEditorSheet, type LocationEditorTarget } from "@/components/crm/locations/LocationEditorSheet"
import { locationErrorMessage, locationRequest, useCrmLocationSuggestions, useCrmLocations } from "@/hooks/useCrmLocations"
import type { CrmLocation, CrmLocationSuggestion } from "@/lib/crmLocations"

interface CrmUserData {
  _id: string
  fullName: string
  role: string
}

const canViewLocations = (role?: string) => role === "admin" || role === "manager" || role === "super_admin"

function SuggestionRow({ suggestion, canManage, activeLocations, onCreate, onAddAlias }: {
  suggestion: CrmLocationSuggestion
  canManage: boolean
  activeLocations: CrmLocation[]
  onCreate: (suggestion: CrmLocationSuggestion) => void
  onAddAlias: (location: CrmLocation, label: string) => void
}) {
  const [targetId, setTargetId] = React.useState("")
  const sources = [
    suggestion.leadCount ? `${suggestion.leadCount} lead${suggestion.leadCount === 1 ? "" : "s"}` : "",
    suggestion.vehicleCount ? `${suggestion.vehicleCount} vehicle${suggestion.vehicleCount === 1 ? "" : "s"}` : "",
    suggestion.inReviewLinks ? "review links" : "",
  ].filter(Boolean).join(" · ")
  return (
    <li className="rounded-xl border border-border/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 break-words text-xs font-semibold">{suggestion.label}</span>
        {suggestion.mapped ? (
          <Badge variant="outline" className="text-[10px]">Mapped to {suggestion.mapped.name}{suggestion.mapped.status === "archived" ? " (archived)" : ""}</Badge>
        ) : (
          <Badge variant="outline" className="border-amber-400/50 text-[10px] text-amber-700 dark:text-amber-300">Not mapped</Badge>
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {sources || "No records"}
        {suggestion.variants.length > 1 ? ` · also written as ${suggestion.variants.slice(1).join(", ")}` : ""}
      </p>
      {!suggestion.mapped && !suggestion.usable && <p className="mt-1 text-[11px] text-muted-foreground">This label has characters a location name can&apos;t use, so it has to be mapped by hand.</p>}
      {!suggestion.mapped && suggestion.usable && canManage && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => onCreate(suggestion)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Create location
          </Button>
          {activeLocations.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`alias-target-${suggestion.key}`}>Add as another name of</label>
              <select
                id={`alias-target-${suggestion.key}`}
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="h-8 max-w-[14rem] rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Add as another name of…</option>
                {activeLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                disabled={!targetId}
                onClick={() => {
                  const location = activeLocations.find((item) => item.id === targetId)
                  if (location) onAddAlias(location, suggestion.label)
                }}
              >
                Review and add
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function LocationsContent() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [user, setUser] = React.useState<CrmUserData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [status, setStatus] = React.useState<"active" | "archived" | "all">("active")
  const [editor, setEditor] = React.useState<LocationEditorTarget | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const { confirm, AlertComponent } = useAlert()

  const getCrmToken = React.useCallback(async () => {
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
        setUser((res.data?.data || res.data) as CrmUserData)
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

  const allowed = canViewLocations(user?.role)
  const list = useCrmLocations(getCrmToken, status, allowed)
  const everything = useCrmLocations(getCrmToken, "all", allowed)
  const suggestions = useCrmLocationSuggestions(getCrmToken, allowed)
  const canManage = Boolean(list.data?.canManage)
  const allLocations = everything.data?.locations || []
  const activeLocations = allLocations.filter((location) => location.status === "active")

  const refresh = () => {
    list.reload()
    everything.reload()
    suggestions.reload()
  }

  const toggleArchive = (location: CrmLocation) => {
    const archiving = location.status === "active"
    void confirm(
      archiving ? `Archive ${location.name}?` : `Restore ${location.name}?`,
      archiving
        ? "Archived locations stay in the history and keep their code and other names, so nothing else can reuse them. You can restore it later."
        : "The location becomes active again with the same code and names.",
      async () => {
        setBusyId(location.id)
        try {
          await locationRequest(getCrmToken, "post", `/api/crm/locations/${location.id}/${archiving ? "archive" : "restore"}`, { expectedRevision: location.revision })
          toast.success(archiving ? "Location archived" : "Location restored")
          refresh()
        } catch (err) {
          toast.error("Could not change the location", { description: locationErrorMessage(err, "Please try again.") })
          refresh()
        } finally {
          setBusyId(null)
        }
      },
      archiving ? "Archive" : "Restore",
      "Cancel",
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Locations</h1>
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">Your dealership&apos;s stores, with stable codes for imported training and future knowledge</p>
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
            {!allowed ? (
              <HubCard title="Locations" icon={<MapPin className="h-4 w-4 text-primary" />}>
                <p className="text-xs text-muted-foreground">Only managers and admins can view locations.</p>
              </HubCard>
            ) : (
              <>
                <HubCard
                  title="Locations"
                  description="Each location has a permanent code and the other names it goes by. Nothing else in the CRM changes when you edit these."
                  icon={<MapPin className="h-4 w-4 text-primary" />}
                  action={canManage ? (
                    <Button size="sm" className="h-8" onClick={() => setEditor({ mode: "create" })}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> New location
                    </Button>
                  ) : undefined}
                >
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <label className="sr-only" htmlFor="location-status">Show</label>
                    <select
                      id="location-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as typeof status)}
                      className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto"
                    >
                      <option value="active">Active locations</option>
                      <option value="archived">Archived locations</option>
                      <option value="all">All locations</option>
                    </select>
                    {list.data && (
                      <span className="text-[11px] text-muted-foreground sm:ml-auto">
                        {list.data.counts.active} active · {list.data.counts.archived} archived · up to {list.data.limits.perOrg}
                      </span>
                    )}
                  </div>
                  {!canManage && list.data && <p className="mb-3 text-[11px] text-muted-foreground">You can view locations. Only admins can change them.</p>}
                  <HubState
                    loading={list.loading}
                    error={list.error}
                    onRetry={list.reload}
                    empty={list.data && !list.data.locations.length
                      ? (status === "archived" ? "No archived locations." : canManage ? "No locations yet. Add your first store with New location, or use a label below." : "No locations have been set up yet.")
                      : false}
                  >
                    {list.data && (
                      <ul aria-label="Locations" className="space-y-2">
                        {list.data.locations.map((location) => (
                          <li key={location.id} className="rounded-xl border border-border/40 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{location.name}</span>
                              <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">{location.code}</span>
                              {location.status === "archived" && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
                            </div>
                            {location.aliases.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {location.aliases.slice(0, 8).map((alias) => (
                                  <span key={alias} className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{alias}</span>
                                ))}
                                {location.aliases.length > 8 && <span className="text-[10px] text-muted-foreground">+{location.aliases.length - 8} more</span>}
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                Revision {location.revision} · updated by {location.updatedByName || "Team member"} · {new Date(location.updatedAt).toLocaleDateString()}
                              </span>
                              <div className="ml-auto flex flex-wrap gap-1">
                                {canManage && location.status === "active" ? (
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditor({ mode: "edit", location })} aria-label={`Edit ${location.name}`}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditor({ mode: "view", location })} aria-label={`View ${location.name}`}>
                                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                                  </Button>
                                )}
                                {canManage && (
                                  <Button size="sm" variant="ghost" className="h-7 px-2" disabled={busyId === location.id} onClick={() => toggleArchive(location)}>
                                    {busyId === location.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : location.status === "active" ? <Archive className="mr-1 h-3.5 w-3.5" /> : <ArchiveRestore className="mr-1 h-3.5 w-3.5" />}
                                    {location.status === "active" ? "Archive" : "Restore"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </HubState>
                </HubCard>

                <HubCard
                  title="Labels already used in your CRM"
                  description="Location names found on leads, vehicles and review links. Map each one to a location so imported content lands in the right store. This list only reads your data."
                  icon={<Tags className="h-4 w-4 text-primary" />}
                >
                  <HubState
                    loading={suggestions.loading}
                    error={suggestions.error}
                    onRetry={suggestions.reload}
                    empty={suggestions.data && !suggestions.data.suggestions.length ? "No location labels found on leads, vehicles or review links yet." : false}
                  >
                    {suggestions.data && (
                      <ul aria-label="Location labels" className="space-y-2">
                        {suggestions.data.suggestions.map((suggestion) => (
                          <SuggestionRow
                            key={suggestion.key}
                            suggestion={suggestion}
                            canManage={canManage}
                            activeLocations={activeLocations}
                            onCreate={(item) => setEditor({ mode: "create", prefill: { name: item.label, aliases: item.variants.slice(1) } })}
                            onAddAlias={(location, label) => setEditor({ mode: "edit", location, appendAlias: label })}
                          />
                        ))}
                      </ul>
                    )}
                  </HubState>
                </HubCard>
              </>
            )}
          </div>
        </div>
      </main>

      {allowed && (
        <LocationEditorSheet
          target={editor}
          canManage={canManage}
          allLocations={allLocations}
          getToken={getCrmToken}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            refresh()
          }}
        />
      )}
      <AlertComponent />
    </div>
  )
}

export default function LocationsSettingsPage() {
  return <LocationsContent />
}
