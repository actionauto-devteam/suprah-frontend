"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ReviewsBoard from "@/components/reviews/ReviewsBoard";

export default function ReviewsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border/60 bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/crm/dashboard")}
          className="h-8 w-8 shrink-0 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 p-0 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-tight">Reviews</h1>
          <p className="text-xs text-muted-foreground">Track Google, Yelp, and Facebook reviews in one place</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ReviewsBoard />
      </div>
    </div>
  );
}
