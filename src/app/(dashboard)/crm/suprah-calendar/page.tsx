import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import CalendarClient from "./_CalendarClient";

export const metadata = { title: "Suprah Calendar" };

/**
 * Suprah Calendar route.
 *
 * Scroll architecture note (per your app-shell conventions): this page owns
 * NO scroll container of its own — the calendar component manages its own
 * internal overflow. Keep the wrapper h-full/min-h-0 so it slots into
 * SidebarInset without creating a nested-scroll conflict.
 */
export default function SuprahCalendarPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 sm:h-9 sm:w-9">
          <CalendarDays className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-sm font-bold tracking-tight">Suprah Calendar</h1>
          <p className="hidden truncate text-[11px] text-muted-foreground/60 sm:block">
            Everyone&apos;s events, tasks, and meetings in one place
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Suspense fallback={null}>
          <CalendarClient />
        </Suspense>
      </div>
    </div>
  );
}
