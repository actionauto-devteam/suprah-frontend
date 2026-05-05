export type AppointmentType = 'in-person' | 'phone' | 'video' | 'other';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
export type EntryType = 'event' | 'task' | 'reminder' | 'appointment';

export interface GuestResponse {
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  respondedAt?: string;
  googleCalendarEventId?: string;
  guestName?: string;
  guestPhone?: string;
}

export interface Participant {
  _id: string;
  name: string;
  fullName?: string;
  email: string;
  avatar?: string;
}

export interface CustomerBooking {
  isCustomerBooking: boolean;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  bookingSource?: string;
  bookingNotes?: string;
}

export interface Appointment {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  entryType: EntryType;

  createdBy: Participant;
  participants: Participant[];
  guestEmails: GuestResponse[];

  conversationId?: string;
  vehicleId?: string;
  quoteId?: string;
  shipmentId?: string;

  reminderSent: boolean;
  reminderTime?: string;
  googleCalendarEventId?: string;
  meetingLink?: string;
  notes?: string;
  outcomeNotes?: string;

  createdByModel?: string;
  participantModel?: string;

  // Customer booking information
  customerBooking?: CustomerBooking;

  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  sender?: Participant | string;
  senderId?: string;
  content: string;
  type?: 'text' | 'file' | 'image' | 'appointment';
  metadata?: any;
  readBy: string[];
  createdAt: string;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group' | 'individual';
  name?: string;
  participants: Participant[];
  messages: Message[];

  hasAppointment?: boolean;
  appointmentId?: Appointment | string | any;

  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageBy?: Participant;

  createdBy?: Participant;
  avatar?: string;

  isArchived?: boolean;
  archivedBy?: string[];

  createdAt?: string;
  updatedAt: string;
}
