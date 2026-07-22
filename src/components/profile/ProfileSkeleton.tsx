import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8 overflow-x-hidden">
      <div className="relative mb-6 sm:mb-8 w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200/60 dark:border-white/10 bg-gray-900 dark:bg-zinc-950">
        <div className="px-4 py-5 sm:px-8 sm:py-8 md:px-10 md:py-10 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-8">
          <Skeleton className="w-20 h-20 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl sm:rounded-3xl bg-white/10 shrink-0" />
          <div className="flex-1 w-full space-y-3">
            <Skeleton className="h-6 sm:h-8 w-40 sm:w-64 bg-white/10" />
            <Skeleton className="h-3 sm:h-4 w-32 sm:w-48 bg-white/10" />
            <Skeleton className="h-7 w-36 rounded-lg bg-white/10" />
          </div>
        </div>
        <div className="border-t border-white/5 px-4 py-3.5 sm:px-8 sm:py-4 grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-16 bg-white/10" />
              <Skeleton className="h-4 w-20 bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 sm:mb-8 bg-white/80 dark:bg-gray-900/70 p-1 sm:p-2 rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 flex-1 rounded-md sm:rounded-xl" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 sm:h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
};
