"use client";

import * as React from "react";
import { Phone, Video, PhoneCall, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function ModeCard({ mode }: { mode: "voice" | "video" }) {
  const isVoice = mode === "voice";
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border p-6",
        "border-border/60 bg-card",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {isVoice ? <Phone className="h-6 w-6" /> : <Video className="h-6 w-6" />}
      </div>
      <div className="text-center">
        <p className="font-semibold text-sm">{isVoice ? "Voice Call" : "Video Call"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isVoice ? "Audio only" : "Audio and video"}
        </p>
      </div>
    </div>
  );
}

export default function CustomerCallCenterPage() {
  return (
    <div className="space-y-6 h-full flex flex-col relative">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Call Center</h1>
        <p className="text-muted-foreground mt-1">
          Start a voice or video call with our team. We&apos;ll keep you posted with live updates.
        </p>
      </div>

      <div className="flex-1 min-h-0 relative">
        {/* Blurred preview of the upcoming feature */}
        <div className="mx-auto flex max-w-xl flex-col gap-6 rounded-2xl border border-border/50 bg-background p-6 blur-sm pointer-events-none select-none opacity-60">
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Current status</p>
              <p className="text-sm font-semibold text-muted-foreground">Ready</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-3">Choose how you&apos;d like to connect</p>
            <div className="flex gap-3">
              <ModeCard mode="voice" />
              <ModeCard mode="video" />
            </div>
          </div>

          <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">
            <PhoneCall className="h-4 w-4" />
            Request Video Call
          </div>
        </div>

        {/* Future update overlay */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md px-8 py-10 text-center shadow-lg max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Future Update</h2>
            <p className="text-sm text-muted-foreground">
              Live voice and video calls with our team are coming soon. Stay tuned!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
