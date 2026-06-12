import { apiClient } from "../api-client";

export interface CustomerBookingPayload {
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  type: string;
  entryType: string;
  notes?: string;
  slotId?: string;
  participants?: string[];
  guestEmails?: string[];
  customerBooking: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    isCustomerBooking: true;
  };
}

export interface BookedAppointment {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  customerBooking: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export const createCustomerAppointment = async (
  payload: CustomerBookingPayload,
): Promise<BookedAppointment> => {
  const res = await apiClient.post("/api/appointments", payload);
  return res.data.data;
};

export const getCustomerAppointments = async (): Promise<BookedAppointment[]> => {
  const res = await apiClient.get("/api/appointments?includeCustomerBookings=true&entryType=appointment");
  const payload = res.data?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.appointments)) return payload.appointments;
  return [];
};
