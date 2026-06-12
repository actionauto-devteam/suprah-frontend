import { apiClient } from "../api-client";

export interface SlotAvailability {
  _id: string;
  time: string;    // "08:00"
  label: string;   // "8:00 AM"
  maxBookings: number;
  currentBookings: number;
  isFull: boolean;
}

export interface CrmSlot {
  _id: string;
  organizationId: string;
  date: string;
  time: string;
  label: string;
  maxBookings: number;
  currentBookings: number;
  isBlocked: boolean;
  createdBy?: string;
}

// ─── Customer-facing (user auth via apiClient cookie/header) ──────────────────

export const fetchAvailableSlots = async (date: string): Promise<SlotAvailability[]> => {
  const res = await apiClient.get("/api/service/slots/available", { params: { date } });
  return res.data?.data ?? [];
};

export const fetchMonthAvailability = async (month: string): Promise<string[]> => {
  const res = await apiClient.get("/api/service/slots/calendar", { params: { month } });
  return res.data?.data ?? [];
};

// ─── CRM-facing (CRM token, passed explicitly) ────────────────────────────────

const crmHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const fetchCrmSlots = async (token: string, month: string): Promise<CrmSlot[]> => {
  const res = await apiClient.get("/api/crm/service-slots", {
    params: { month },
    headers: crmHeaders(token),
  });
  return res.data?.data ?? [];
};

export const createCrmSlot = async (
  token: string,
  payload: { date: string; time: string; maxBookings?: number }
): Promise<CrmSlot> => {
  const res = await apiClient.post("/api/crm/service-slots", payload, {
    headers: crmHeaders(token),
  });
  return res.data?.data;
};

export const updateCrmSlot = async (
  token: string,
  id: string,
  payload: Partial<{ isBlocked: boolean; maxBookings: number; time: string }>
): Promise<CrmSlot> => {
  const res = await apiClient.patch(`/api/crm/service-slots/${id}`, payload, {
    headers: crmHeaders(token),
  });
  return res.data?.data;
};

export const deleteCrmSlot = async (token: string, id: string): Promise<void> => {
  await apiClient.delete(`/api/crm/service-slots/${id}`, {
    headers: crmHeaders(token),
  });
};

export interface DateBooking {
  _id: string;
  title: string;
  startTime: string;
  status: string;
  notes?: string;
  customer: { _id: string; name: string; email: string; avatar: string | null } | null;
}

export const fetchDateBookings = async (token: string, date: string): Promise<DateBooking[]> => {
  const res = await apiClient.get("/api/crm/service-slots/bookings", {
    params: { date },
    headers: crmHeaders(token),
  });
  return res.data?.data ?? [];
};

export const updateBookingStatus = async (
  token: string,
  id: string,
  status: string,
  outcomeNotes?: string
): Promise<void> => {
  await apiClient.post(
    `/api/crm/calendar/appointments/${id}/status`,
    { status, ...(outcomeNotes ? { outcomeNotes } : {}) },
    { headers: crmHeaders(token) }
  );
};
