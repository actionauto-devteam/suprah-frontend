"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { HelpTopic } from "./help";

export function HowItWorks({ topic }: { topic: HelpTopic }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-10 shrink-0 gap-2" aria-label={`How it works: ${topic.title}`}>
          <CircleHelp className="h-4 w-4" />
          How it works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{topic.title}</DialogTitle>
          <DialogDescription>{topic.intro}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3" aria-label="Steps">
          {topic.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{index + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        {topic.goodToKnow.length > 0 && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-semibold">Good to know</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {topic.goodToKnow.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
