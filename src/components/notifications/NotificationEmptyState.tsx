'use client';

import React from 'react';
import { Bell, Loader2, Inbox } from 'lucide-react';

export function NotificationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative w-20 h-20 mb-5">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/50 dark:to-teal-950/50 rounded-2xl rotate-6" />
        <div className="absolute inset-0 bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl -rotate-3" />
        <div className="relative w-full h-full flex items-center justify-center bg-linear-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
          <Inbox className="size-9 text-emerald-500/70 dark:text-emerald-400/60" />
        </div>
      </div>
      <h4 className="text-base font-semibold text-foreground mb-1.5">You're all caught up</h4>
      <p className="text-sm text-muted-foreground text-center max-w-60 leading-relaxed">
        No notifications right now. We'll let you know when something needs your attention.
      </p>
    </div>
  );
}

export function NotificationLoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Loader2 className="size-5 text-emerald-500 animate-spin" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading notifications...</p>
      </div>
    </div>
  );
}
