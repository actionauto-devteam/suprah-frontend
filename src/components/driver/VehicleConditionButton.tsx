"use client"

import * as React from "react"
import { ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VehicleConditionDialog } from "@/components/driver/VehicleConditionDialog"
import type { Load } from "@/types/load"

const CONDITION_REPORT_STATUSES = ["Accepted", "Picked Up", "In-Transit", "Delivered"]

/** Opens the driver's vehicle condition report for this load (optional step). */
export function VehicleConditionButton({
  load,
  className,
  showHint = false,
}: {
  load: Pick<Load, "_id" | "status">
  className?: string
  /** Show the plain-English "this is optional" line under the button. */
  showHint?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  if (!CONDITION_REPORT_STATUSES.includes(load.status)) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("h-11 w-full gap-2 rounded-xl font-bold", className)}
        onClick={() => setOpen(true)}
      >
        <ClipboardCheck className="size-4" />
        Vehicle Condition Report
        <span className="font-medium text-muted-foreground">(Optional)</span>
      </Button>
      {showHint && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          You don&apos;t have to fill this in. You can mark the load Picked Up and Delivered without it.
          Adding photos helps protect you if a customer later says a vehicle was damaged.
        </p>
      )}
      {open && <VehicleConditionDialog loadId={String(load._id)} open={open} onOpenChange={setOpen} />}
    </>
  )
}
