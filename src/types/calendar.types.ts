export type CalendarItemType =
  | "event"
  | "task"
  | "reminder"
  | "meeting"
  | "appointment";

export type CalendarView = "day" | "week" | "month" | "agenda";

export interface CrmUserLite {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
}

export interface CalendarItem {
  id: string;
  source: "calendarEvent" | "appointment";
  type: CalendarItemType;
  title: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  repeatsDailyWindow: boolean;
  dailyStartTime?: string; // "HH:mm"
  dailyEndTime?: string;
  status: "scheduled" | "completed" | "cancelled";
  color?: string;
  meetingLink?: string;
  createdBy?: CrmUserLite;
  assignees?: CrmUserLite[];
}

export interface EventDraft {
  id?: string;
  type: Exclude<CalendarItemType, "appointment">;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  repeatsDailyWindow: boolean;
  dailyStartTime: string;
  dailyEndTime: string;
  assignees: string[];
  generateMeetingLink: boolean;
}

export interface MySchedulePayload {
  upcoming: CalendarItem[];
  pendingTasks: CalendarItem[];
  meetings: CalendarItem[];
}

export const TYPE_ACCENTS: Record<CalendarItemType, string> = {
  event: "emerald",
  meeting: "cyan",
  task: "amber",
  reminder: "violet",
  appointment: "mint",
};
