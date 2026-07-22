import { NotificationPreferences } from './notification';

export type OnlineStatus = 'online' | 'away' | 'busy' | 'idle' | 'offline' | 'do_not_disturb';

export interface SocialLink {
  label: string;
  url: string;
}

export interface PersonalInfo {
  bio?: string;
  phone?: string;
  phoneCountryCode?: string;
  location?: string;
  timezone?: string;
  language?: string;
  dateOfBirth?: string;
  gender?: string;
  pronouns?: string;
  jobTitle?: string;
  department?: string;
  linkedIn?: string;
  website?: string;
  socialLinks?: SocialLink[];
}

export interface SecurityStatus {
  emailVerified: boolean;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  lastPasswordChange?: string;
  lastLogin?: string;
  loginHistory?: {
    date: string;
    ipAddress?: string;
    device?: string;
    location?: string;
  }[];
}

export interface RecentActivity {
  _id: string;
  type: 'login' | 'logout' | 'profile_update' | 'password_change' | 'email_change' | 'settings_change' | 'quote_created' | 'shipment_created' | 'appointment_created' | 'vehicle_added' | 'avatar_updated' | 'google_calendar_connected' | 'other';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AccountStatus {
  isActive: boolean;
  isVerified: boolean;
  isPremium: boolean;
  accountType: 'standard' | 'premium' | 'enterprise';
  lastActive?: string;
  memberSince: string;
  totalQuotes?: number;
  totalShipments?: number;
  totalAppointments?: number;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  connectedAt?: string;
  email?: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'super_admin' | 'driver' | 'customer';
  onlineStatus: OnlineStatus;
  customStatus?: string;
  lastDeviceType?: 'mobile' | 'desktop';
  personalInfo?: PersonalInfo;
  securityStatus?: SecurityStatus;
  accountStatus?: AccountStatus;
  recentActivities?: RecentActivity[];
  socialLinks?: SocialLink[];
  googleCalendar?: GoogleCalendarStatus;
  notificationPreferences: NotificationPreferences;
  theme: 'light' | 'dark';
  organizationId?: string;
  organizationRole?: 'admin' | 'member' | 'driver';
  createdAt: string;
  updatedAt: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateEmailRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
  onlineStatus?: OnlineStatus;
  customStatus?: string;
  personalInfo?: Partial<PersonalInfo>;
  notificationPreferences?: Partial<NotificationPreferences>;
  theme?: 'light' | 'dark';
  organizationId?: string;
}
