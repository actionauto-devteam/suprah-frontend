"use client"

import * as React from "react"
import { ExternalLink, VideoOff } from "lucide-react"
import type { Vehicle } from "@/types/inventory"
import { vehiclePageLink, vehicleVideo } from "@/lib/vehicle-video"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface VehicleVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehicle | null
}

/**
 * The Video button's window (2026-11-13). Plays the vehicle's video when it
 * has one (a video file, YouTube or Vimeo); otherwise says there's no video yet
 * and offers the vehicle's page on the dealership's website when there is one.
 * Text and the button wrap, so it reads on the smallest phones.
 */
export function VehicleVideoDialog({ open, onOpenChange, vehicle }: VehicleVideoDialogProps) {
  const video = vehicleVideo(vehicle?.videoUrl)
  const dealerPage = vehiclePageLink(vehicle?.videoUrl)
  const [failed, setFailed] = React.useState(false)
  const name = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") : "Vehicle"

  React.useEffect(() => {
    if (open) setFailed(false)
  }, [open, vehicle?.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-words pr-6 [overflow-wrap:anywhere]">{name} video</DialogTitle>
          <DialogDescription className="break-words">
            {video && !failed ? "Press play to watch. Full screen is in the player's corner." : "Videos the dealership adds for this vehicle play here."}
          </DialogDescription>
        </DialogHeader>

        {video && !failed ? (
          video.kind === "file" ? (
            <video
              key={video.src}
              src={video.src}
              controls
              playsInline
              preload="metadata"
              onError={() => setFailed(true)}
              className="aspect-video w-full rounded-lg bg-black"
            />
          ) : (
            <iframe
              key={video.src}
              src={video.src}
              title={`${name} video on ${video.provider}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="aspect-video w-full rounded-lg border-0 bg-black"
            />
          )
        ) : (
          <div role="status" className="flex flex-col items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-4 py-8 text-center">
            <VideoOff className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="break-words font-semibold text-foreground">
              {failed ? "This video can't play here." : "No video for this vehicle yet."}
            </p>
            <p className="max-w-sm break-words text-sm text-muted-foreground">
              {failed
                ? "Open it in a new tab to watch it."
                : dealerPage
                  ? "You can still see this vehicle's photos and details on the dealership's website."
                  : "Check the photos and details in the vehicle's listing instead."}
            </p>
            {(failed && video) || dealerPage ? (
              <Button asChild variant="outline" className="mt-2 h-auto min-h-11 max-w-full gap-2 whitespace-normal py-2 text-center">
                <a href={failed && video ? video.src : dealerPage ?? undefined} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  {failed ? "Open the video" : "View on the dealership's website"}
                </a>
              </Button>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
