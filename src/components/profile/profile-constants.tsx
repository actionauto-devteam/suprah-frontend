import { OnlineStatus } from '@/types/user';
import {
    LogOut,
    Edit3,
    Lock,
    Mail,
    Settings,
    Package,
    Truck,
    Calendar,
    Activity,
    Camera,
    TrendingUp,
    X,
    MapPin,
    User,
    ShieldAlert,
    Car,
    UserPlus,
    DollarSign,
    Users,
    Award,
    Circle,
    Moon,
    Coffee,
    MinusCircle,
    BellOff,
    EyeOff,
} from 'lucide-react';
import React from 'react';

// Helper icons that were used in the categories but not explicitly exported individually if needed
const XCircle = (props: any) => <X className="size-4" {...props} />;
const Shield = (props: any) => <Lock className="size-4" {...props} />;

// Country codes for phone
export const countryCodes = [
    { code: '+1', country: 'US / Canada' },
    { code: '+63', country: 'Philippines' },
    { code: '+44', country: 'United Kingdom' },
    { code: '+61', country: 'Australia' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+81', country: 'Japan' },
    { code: '+82', country: 'South Korea' },
    { code: '+86', country: 'China' },
    { code: '+91', country: 'India' },
    { code: '+52', country: 'Mexico' },
    { code: '+55', country: 'Brazil' },
    { code: '+234', country: 'Nigeria' },
    { code: '+27', country: 'South Africa' },
    { code: '+971', country: 'United Arab Emirates' },
];

// Standard timezone abbreviations
export const timezoneOptions = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)', abbr: 'UTC' },
    { value: 'EST', label: 'EST (Eastern Standard Time)', abbr: 'EST/EDT' },
    { value: 'CST', label: 'CST (Central Standard Time)', abbr: 'CST/CDT' },
    { value: 'MST', label: 'MST (Mountain Standard Time)', abbr: 'MST/MDT' },
    { value: 'PST', label: 'PST (Pacific Standard Time)', abbr: 'PST/PDT' },
    { value: 'AKST', label: 'AKST (Alaska Standard Time)', abbr: 'AKST' },
    { value: 'HST', label: 'HST (Hawaii Standard Time)', abbr: 'HST' },
    { value: 'GMT', label: 'GMT (Greenwich Mean Time)', abbr: 'GMT' },
    { value: 'CET', label: 'CET (Central European Time)', abbr: 'CET' },
    { value: 'IST', label: 'IST (India Standard Time)', abbr: 'IST' },
    { value: 'JST', label: 'JST (Japan Standard Time)', abbr: 'JST' },
    { value: 'KST', label: 'KST (Korea Standard Time)', abbr: 'KST' },
    { value: 'PHT', label: 'PHT (Philippine Time)', abbr: 'PHT' },
    { value: 'SGT', label: 'SGT (Singapore Time)', abbr: 'SGT' },
    { value: 'AEST', label: 'AEST (Australian Eastern)', abbr: 'AEST' },
    { value: 'GST', label: 'GST (Gulf Standard Time)', abbr: 'GST' },
];

// Most commonly used languages in the US
export const languageOptions = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'zh', name: 'Chinese (Mandarin)' },
    { code: 'fil', name: 'Filipino (Tagalog)' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'ko', name: 'Korean' },
    { code: 'fr', name: 'French' },
    { code: 'ar', name: 'Arabic' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ru', name: 'Russian' },
];

// Curse word filter
export const curseWords = ['fuck', 'shit', 'ass', 'damn', 'bitch', 'crap', 'dick', 'piss', 'bastard', 'cunt'];
export const containsCurseWord = (text: string): boolean => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return curseWords.some(word => lowerText.includes(word));
};

// Online status options
export const onlineStatusOptions: {
    value: OnlineStatus;
    label: string;
    color: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}[] = [
    { value: 'online', label: 'Online', color: 'bg-green-500', description: 'Available', icon: Circle },
    { value: 'idle', label: 'Idle', color: 'bg-amber-500', description: 'Away from keyboard', icon: Moon },
    { value: 'away', label: 'Away', color: 'bg-yellow-500', description: 'Stepped away', icon: Coffee },
    { value: 'busy', label: 'Busy', color: 'bg-red-500', description: 'Do not interrupt', icon: MinusCircle },
    { value: 'do_not_disturb', label: 'DND', color: 'bg-purple-500', description: 'No notifications', icon: BellOff },
    { value: 'offline', label: 'Invisible', color: 'bg-gray-500', description: 'Appear offline', icon: EyeOff },
];

// Activity type icons
export const activityIcons: Record<string, React.ReactNode> = {
    login: <LogOut className="size-4" />,
    logout: <LogOut className="size-4" />,
    profile_update: <Edit3 className="size-4" />,
    password_change: <Lock className="size-4" />,
    email_change: <Mail className="size-4" />,
    settings_change: <Settings className="size-4" />,
    quote_created: <Package className="size-4" />,
    shipment_created: <Truck className="size-4" />,
    appointment_created: <Calendar className="size-4" />,
    vehicle_added: <Truck className="size-4" />,
    avatar_updated: <Camera className="size-4" />,
    google_calendar_connected: <Calendar className="size-4" />,
    other: <Activity className="size-4" />,
};

// Notification categories
export const allNotificationCategories = [
    {
        title: 'Quotes & Sales',
        icon: Package,
        color: 'from-blue-500 to-cyan-500',
        roles: ['admin', 'super_admin'],
        items: [
            { key: 'quoteCreated', label: 'New Quotes', description: 'When a quote is created', icon: Package },
            { key: 'quoteUpdated', label: 'Quote Updates', description: 'When a quote is modified', icon: TrendingUp },
            { key: 'quoteDeleted', label: 'Quote Removed', description: 'When a quote is deleted', icon: X },
        ]
    },
    {
        title: 'Shipments & Logistics',
        icon: Truck,
        color: 'from-emerald-500 to-teal-500',
        roles: ['admin', 'super_admin', 'driver'],
        items: [
            { key: 'shipmentCreated', label: 'New Shipments', description: 'When a shipment is created', icon: Truck },
            { key: 'shipmentUpdated', label: 'Shipment Updates', description: 'When shipment status changes', icon: MapPin },
            { key: 'shipmentDeleted', label: 'Shipment Removed', description: 'When a shipment is removed', icon: X },
        ]
    },
    {
        title: 'Appointments',
        icon: Calendar,
        color: 'from-purple-500 to-violet-500',
        roles: ['admin', 'super_admin', 'driver'],
        items: [
            { key: 'appointmentCreated', label: 'New Appointments', description: 'When an appointment is booked', icon: Calendar },
            { key: 'appointmentUpdated', label: 'Appointment Changes', description: 'When an appointment is modified', icon: Edit3 },
            { key: 'appointmentCancelled', label: 'Cancellations', description: 'When an appointment is cancelled', icon: XCircle },
        ]
    },
    {
        title: 'Account & Security',
        icon: Shield,
        color: 'from-rose-500 to-red-500',
        roles: ['admin', 'super_admin', 'driver'],
        items: [
            { key: 'passwordChanged', label: 'Password Changes', description: 'Security alerts for password', icon: Lock },
            { key: 'emailChanged', label: 'Email Changes', description: 'When email is updated', icon: Mail },
            { key: 'profileUpdated', label: 'Profile Updates', description: 'When profile is modified', icon: User },
            { key: 'loginAlerts', label: 'Login Alerts', description: 'When someone logs into your account', icon: ShieldAlert },
        ]
    },
    {
        title: 'Team & CRM',
        icon: Users,
        color: 'from-amber-500 to-orange-500',
        roles: ['admin', 'super_admin'],
        items: [
            { key: 'driverRequests', label: 'Driver Requests', description: 'New driver join requests', icon: Car },
            { key: 'crmActivity', label: 'CRM Activity', description: 'Leads and customer updates', icon: Users },
        ]
    },
    {
        title: 'Referrals & Rewards',
        icon: Award,
        color: 'from-green-500 to-emerald-600',
        roles: [],
        items: [
            { key: 'referral_joined', label: 'New Referral', description: 'When someone signs up with your link', icon: UserPlus },
            { key: 'referral_rewarded', label: 'Reward Earned', description: 'When you earn $100 bonus', icon: DollarSign },
        ]
    }
];
