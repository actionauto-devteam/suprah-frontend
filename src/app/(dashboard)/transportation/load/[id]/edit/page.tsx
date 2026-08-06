"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Truck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getLoadById } from "@/lib/api/loads"
import { LoadFormLayout } from "@/components/create-load/LoadFormLayout"

// ─── Edit Load page ───────────────────────────────────────────────────────────
// Same wizard as Create Load, pre-filled from the existing load and saving
// via PUT instead of POST — see LoadFormLayout's mode="edit" branch.

export default function EditLoadPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const { data: load, isLoading, isError } = useQuery({
    queryKey: ["load", id],
    queryFn: () => getLoadById(id),
    enabled: !!id,
    refetchOnWindowFocus: false,
  })

  return (
    <div className="min-h-dvh p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => router.push(`/transportation/load/${id}`)}
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Truck className="size-5 text-emerald-500" />
              Edit Load
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mt-0.5">
              {load ? `#${load.loadNumber}` : "Loading…"}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="max-w-3xl mx-auto flex items-center justify-center h-64">
          <Truck className="size-5 text-emerald-500 motion-safe:animate-pulse" />
        </div>
      ) : isError || !load ? (
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center h-64 gap-3 text-center">
          <AlertCircle className="size-8 text-destructive opacity-80" />
          <p className="text-sm text-muted-foreground">
            We could not find this load. It may have been deleted.
          </p>
          <Button variant="outline" onClick={() => router.push("/transportation")}>
            Back to Transportation
          </Button>
        </div>
      ) : ["Delivered", "Cancelled"].includes(load.status) ? (
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center h-64 gap-3 text-center">
          <AlertCircle className="size-8 text-amber-500 opacity-80" />
          <p className="text-sm text-muted-foreground">
            A {load.status.toLowerCase()} load can no longer be edited.
          </p>
          <Button variant="outline" onClick={() => router.push(`/transportation/load/${id}`)}>
            Back to Load Details
          </Button>
        </div>
      ) : (
        <LoadFormLayout postType={load.postType} mode="edit" initialLoad={load} />
      )}
    </div>
  )
}
