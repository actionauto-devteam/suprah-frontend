import SuprahCalendar from "@/components/SuprahCalendar";
import { CalendarNotificationProvider } from "@/context/CalendarNotificationContext";

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
    <div className="h-full min-h-0 p-4">
      <CalendarNotificationProvider>
        <SuprahCalendar />
      </CalendarNotificationProvider>
    </div>
  );
}
