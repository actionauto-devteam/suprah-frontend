"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ChevronRight, Truck, CheckCircle2, Globe2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { LoadFormLayout } from "@/components/create-load/LoadFormLayout"
import {
  emptyLocation,
  emptyVehicle,
  emptyDates,
  emptyAdditionalInfo,
  emptyContract,
  LocationBlock,
  LoadVehicle,
  LoadDates,
  LoadAdditionalInfo,
  LoadContract,
} from "@/components/create-load/types"

const POST_TYPES = [
  {
    value: "load-board",
    icon: Globe2,
    title: "Load Board",
    desc: "Post to your driver pool",
  },
  {
    value: "assign-carrier",
    icon: UserCheck,
    title: "Assign Carrier",
    desc: "Direct dispatch to a driver",
  },
] as const

export default function CreateLoadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = React.useState<"load-board" | "assign-carrier">("load-board")
  const [successInfo, setSuccessInfo] = React.useState<{ loadNumber: string } | null>(null)

  const [lbPickup, setLbPickup] = React.useState<LocationBlock>(emptyLocation())
  const [lbDelivery, setLbDelivery] = React.useState<LocationBlock>(emptyLocation())
  const [lbVehicles, setLbVehicles] = React.useState<LoadVehicle[]>([emptyVehicle()])
  const [lbDates, setLbDates] = React.useState<LoadDates>(emptyDates())
  const [lbAdditionalInfo, setLbAdditionalInfo] = React.useState<LoadAdditionalInfo>(emptyAdditionalInfo())
  const [lbContract, setLbContract] = React.useState<LoadContract>(emptyContract())
  const [lbTrailerType, setLbTrailerType] = React.useState<string>("open_3car_wedge")

  const [acPickup, setAcPickup] = React.useState<LocationBlock>(emptyLocation())
  const [acDelivery, setAcDelivery] = React.useState<LocationBlock>(emptyLocation())
  const [acVehicles, setAcVehicles] = React.useState<LoadVehicle[]>([emptyVehicle()])
  const [acDates, setAcDates] = React.useState<LoadDates>(emptyDates())
  const [acAdditionalInfo, setAcAdditionalInfo] = React.useState<LoadAdditionalInfo>(emptyAdditionalInfo())
  const [acContract, setAcContract] = React.useState<LoadContract>(emptyContract())
  const [acTrailerType, setAcTrailerType] = React.useState<string>("open_3car_wedge")

  const buildBackUrl = () => {
    const params = new URLSearchParams()
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const tab = searchParams.get("tab")
    if (search) params.set("search", search)
    if (status) params.set("status", status)
    if (tab) params.set("tab", tab)
    const query = params.toString()
    return `/transportation${query ? `?${query}` : ""}`
  }

  const handleBack = () => router.push(buildBackUrl())

  const handleSuccess = (_loadId: string, loadNumber: string) => {
    setSuccessInfo({ loadNumber })
    router.refresh()
    setTimeout(() => router.push(buildBackUrl()), 2000)
  }

  if (successInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-green-500" />
          <p className="text-lg font-semibold text-foreground">Load Created!</p>
          <p className="text-sm text-muted-foreground">
            Load <span className="font-mono font-medium text-foreground">{successInfo.loadNumber}</span> has been posted.
          </p>
          <p className="text-xs text-muted-foreground">Redirecting to Transportation…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      { }
      <div className="sticky top-0 z-20 bg-card border-b border-border px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 border-none hover:bg-secondary"
              onClick={handleBack}
              aria-label="Go back to Transportation"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <nav className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground min-w-0">
              <button onClick={handleBack} className="hover:text-foreground transition-colors truncate">
                Transport
              </button>
              <ChevronRight className="size-3 shrink-0" />
              <span className="text-foreground font-medium truncate">Create Load</span>
            </nav>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <div className="bg-green-500 p-1.5 rounded shrink-0">
              <Truck className="size-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground hidden md:block">Create Load</span>
          </div>
        </div>
      </div>

      { }
      <div className="px-3 sm:px-4 md:px-6 pt-4 pb-0">
        <div className="grid grid-cols-2 gap-2 max-w-5xl mx-auto">
          {POST_TYPES.map(({ value, icon: Icon, title, desc }) => {
            const active = activeTab === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${active
                    ? "border-green-500 bg-green-50/40 dark:bg-green-950/20"
                    : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
              >
                <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${active ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-tight ${active ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                    {title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{desc}</p>
                </div>
                {active && <CheckCircle2 className="size-4 text-green-500 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Form content ────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 md:px-6 pt-4 pb-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "load-board" | "assign-carrier")}>
          <TabsContent value="load-board" className="mt-0 outline-none">
            <LoadFormLayout
              postType="load-board"
              pickup={lbPickup} setPickup={setLbPickup}
              delivery={lbDelivery} setDelivery={setLbDelivery}
              vehicles={lbVehicles} setVehicles={setLbVehicles}
              dates={lbDates} setDates={setLbDates}
              additionalInfo={lbAdditionalInfo} setAdditionalInfo={setLbAdditionalInfo}
              contract={lbContract} setContract={setLbContract}
              trailerType={lbTrailerType} setTrailerType={setLbTrailerType}
              onCancel={handleBack}
              onSuccess={handleSuccess}
              submitLabel="POST LOAD"
            />
          </TabsContent>

          <TabsContent value="assign-carrier" className="mt-0 outline-none">
            <LoadFormLayout
              postType="assign-carrier"
              pickup={acPickup} setPickup={setAcPickup}
              delivery={acDelivery} setDelivery={setAcDelivery}
              vehicles={acVehicles} setVehicles={setAcVehicles}
              dates={acDates} setDates={setAcDates}
              additionalInfo={acAdditionalInfo} setAdditionalInfo={setAcAdditionalInfo}
              contract={acContract} setContract={setAcContract}
              trailerType={acTrailerType} setTrailerType={setAcTrailerType}
              onCancel={handleBack}
              onSuccess={handleSuccess}
              submitLabel="ASSIGN"
            />
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}
