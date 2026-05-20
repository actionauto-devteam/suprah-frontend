import {
  Bell, Package, Truck, ShieldCheck, Mail, User, UserPlus,
  CheckCircle2, XCircle, DollarSign, Calendar, Car, MapPin,
  CreditCard, Users, Megaphone, MessageSquare, Clock, Tag,
  TrendingUp, AlertTriangle, Shield, Award, Send, LogIn,
  BarChart3, Boxes, Fingerprint, Timer, type LucideIcon,
} from 'lucide-react';
import { Notification } from '@/types/notification';

type IconColorMap = {
  icon: LucideIcon;
  gradient: string;
  bg: string;
};

const TYPE_MAP: Record<string, IconColorMap> = {
  quote_created: { icon: Package, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  quote_updated: { icon: TrendingUp, gradient: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500' },
  quote_deleted: { icon: Package, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500' },
  quote_converted: { icon: Tag, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500' },
  shipment_created: { icon: Truck, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  shipment_updated: { icon: Truck, gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-500' },
  shipment_deleted: { icon: Truck, gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-500' },
  shipment_status_changed: { icon: BarChart3, gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-500' },
  shipment_assigned: { icon: Send, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500' },
  shipment_picked_up: { icon: Truck, gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500' },
  shipment_delivered: { icon: CheckCircle2, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-500' },
  proof_of_delivery: { icon: ShieldCheck, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500' },
  vehicle_added: { icon: Car, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  vehicle_updated: { icon: Car, gradient: 'from-sky-500 to-cyan-500', bg: 'bg-sky-500' },
  vehicle_sold: { icon: DollarSign, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  vehicle_status_changed: { icon: Car, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  inventory_sync: { icon: Boxes, gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  new_inventory_alert: { icon: Boxes, gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-500' },
  appointment_created: { icon: Calendar, gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  appointment_updated: { icon: Calendar, gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-500' },
  appointment_cancelled: { icon: Calendar, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500' },
  appointment_reminder: { icon: Clock, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  guest_response: { icon: Users, gradient: 'from-teal-500 to-emerald-500', bg: 'bg-teal-500' },
  new_lead: { icon: UserPlus, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  lead_assigned: { icon: User, gradient: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500' },
  lead_status_changed: { icon: TrendingUp, gradient: 'from-teal-500 to-green-500', bg: 'bg-teal-500' },
  crm_message: { icon: MessageSquare, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  crm_task_assigned: { icon: Clock, gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500' },
  crm_task_due: { icon: AlertTriangle, gradient: 'from-red-500 to-orange-500', bg: 'bg-red-500' },
  crm_biometric: { icon: Fingerprint, gradient: 'from-violet-500 to-indigo-500', bg: 'bg-violet-500' },
  crm_timeproof: { icon: Timer, gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-500' },
  driver_request: { icon: UserPlus, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500' },
  driver_request_approved: { icon: CheckCircle2, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  driver_request_rejected: { icon: XCircle, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500' },
  driver_assigned: { icon: Truck, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500' },
  driver_location_update: { icon: MapPin, gradient: 'from-blue-500 to-sky-500', bg: 'bg-blue-500' },
  driver_payout: { icon: DollarSign, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-500' },
  payment_received: { icon: CreditCard, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  payment_pending: { icon: CreditCard, gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500' },
  payment_failed: { icon: CreditCard, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500' },
  payment_request: { icon: CreditCard, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  payout_processed: { icon: DollarSign, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500' },
  team_invite_sent: { icon: Send, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  team_member_joined: { icon: UserPlus, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  team_member_left: { icon: User, gradient: 'from-gray-500 to-slate-500', bg: 'bg-gray-500' },
  role_changed: { icon: Shield, gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  password_changed: { icon: ShieldCheck, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  email_changed: { icon: Mail, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  profile_updated: { icon: User, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500' },
  login_alert: { icon: LogIn, gradient: 'from-red-500 to-orange-500', bg: 'bg-red-500' },
  system_announcement: { icon: Megaphone, gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-500' },
  message_received: { icon: MessageSquare, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  reminder: { icon: Clock, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  general: { icon: Bell, gradient: 'from-gray-500 to-slate-500', bg: 'bg-gray-500' },
  referral_joined: { icon: Award, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  referral_rewarded: { icon: DollarSign, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500' },
  delivery_confirmed: { icon: CheckCircle2, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  proof_submitted: { icon: ShieldCheck, gradient: 'from-teal-500 to-emerald-500', bg: 'bg-teal-500' },
};

const DEFAULT_MAP: IconColorMap = {
  icon: Bell,
  gradient: 'from-gray-500 to-slate-500',
  bg: 'bg-gray-500',
};

export function getNotificationMeta(type: string): IconColorMap {
  return TYPE_MAP[type] || DEFAULT_MAP;
}

export function getNotificationCategory(type: string): string {
  if (type.startsWith('quote_')) return 'Quotes';
  if (type.startsWith('shipment_') || type === 'proof_of_delivery') return 'Shipments';
  if (type.startsWith('vehicle_') || type.startsWith('inventory_') || type === 'new_inventory_alert') return 'Vehicles';
  if (type.startsWith('appointment_') || type === 'guest_response') return 'Appointments';
  if (type.startsWith('new_lead') || type.startsWith('lead_') || type.startsWith('crm_')) return 'CRM';
  if (type.startsWith('driver_')) return 'Driver';
  if (type.startsWith('payment_') || type.startsWith('payout_')) return 'Payments';
  if (type.startsWith('team_') || type === 'role_changed') return 'Team';
  if (['password_changed', 'email_changed', 'profile_updated', 'login_alert'].includes(type)) return 'Account';
  if (type.startsWith('referral_')) return 'Referrals';
  if (['system_announcement', 'message_received', 'reminder', 'general'].includes(type)) return 'System';
  return 'Other';
}

const ROUTE_MAP: Record<string, string> = {
  quote_created: '/transportation', quote_updated: '/transportation', quote_deleted: '/transportation', quote_converted: '/transportation',
  shipment_created: '/transportation', shipment_updated: '/transportation', shipment_deleted: '/transportation',
  shipment_status_changed: '/transportation', shipment_assigned: '/transportation', shipment_picked_up: '/transportation',
  shipment_delivered: '/transportation', proof_of_delivery: '/transportation',
  vehicle_added: '/inventory', vehicle_updated: '/inventory', vehicle_sold: '/inventory',
  vehicle_status_changed: '/inventory', inventory_sync: '/inventory', new_inventory_alert: '/inventory',
  appointment_created: '/crm/appointments', appointment_updated: '/crm/appointments',
  appointment_cancelled: '/crm/appointments', appointment_reminder: '/crm/appointments', guest_response: '/crm/appointments',
  new_lead: '/crm', lead_assigned: '/crm', lead_status_changed: '/crm',
  crm_message: '/crm/supra-space', crm_task_assigned: '/crm', crm_task_due: '/crm',
  crm_biometric: '/crm/biometrics', crm_timeproof: '/crm/biometrics',
  message_received: '/crm/supra-space',
  driver_location_update: '/driver-tracker',
  payment_received: '/billing', payment_pending: '/billing', payment_failed: '/billing',
  payout_processed: '/billing',
  team_invite_sent: '/settings', team_member_joined: '/settings', team_member_left: '/settings', role_changed: '/settings',
  password_changed: '/profile', email_changed: '/profile', profile_updated: '/profile', login_alert: '/profile',
};

const DRIVER_ROUTE_MAP: Record<string, string> = {
  driver_request_approved: '/driver/loads', driver_request_rejected: '/driver/loads',
  driver_assigned: '/driver/loads', driver_payout: '/driver/earnings',
  shipment_assigned: '/driver/loads', shipment_picked_up: '/driver/loads', shipment_delivered: '/driver/loads',
  password_changed: '/driver/profile', email_changed: '/driver/profile', profile_updated: '/driver/profile', login_alert: '/driver/profile',
};

const CUSTOMER_ROUTE_MAP: Record<string, string> = {
  payment_request: '/customer/payments', payment_received: '/customer/payments',
  payment_pending: '/customer/payments', payment_failed: '/customer/payments',
  referral_joined: '/customer/refer', referral_rewarded: '/customer/refer',
  password_changed: '/customer/settings', email_changed: '/customer/settings',
  profile_updated: '/customer/settings', login_alert: '/customer/settings',
};

const ADMIN_ROUTE_MAP: Record<string, string> = {
  payout_processed: '/admin/payouts', driver_payout: '/admin/payouts',
  password_changed: '/admin/dashboard', email_changed: '/admin/dashboard',
  profile_updated: '/admin/dashboard', login_alert: '/admin/dashboard',
};

function getRoleContext(pathname: string): 'driver' | 'customer' | 'admin' | 'dashboard' {
  if (pathname.startsWith('/driver')) return 'driver';
  if (pathname.startsWith('/customer')) return 'customer';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'dashboard';
}

export function getNotificationRoute(notification: Notification, pathname?: string): string | null {
  if (!pathname) return ROUTE_MAP[notification.type] || null;

  const role = getRoleContext(pathname);

  if (role === 'driver') return DRIVER_ROUTE_MAP[notification.type] || null;
  if (role === 'customer') return CUSTOMER_ROUTE_MAP[notification.type] || null;
  if (role === 'admin') return ADMIN_ROUTE_MAP[notification.type] || ROUTE_MAP[notification.type] || null;
  return ROUTE_MAP[notification.type] || null;
}

export function formatNotificationDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
