import { apiClient } from "../api-client";

export interface TestDriveBookingPayload {
  vehicleId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  startTime: string;
  notes?: string;
}

export interface TestDriveBookingResult {
  leadId: string;
  appointmentId: string;
}

export const submitTestDriveBooking = async (
  payload: TestDriveBookingPayload,
): Promise<TestDriveBookingResult> => {
  const res = await apiClient.post("/api/appointments/public/book-test-drive", payload);
  return res.data.data;
};
