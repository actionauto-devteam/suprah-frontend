import {
    LucideIcon,
    Rocket,
    Bot,
    UsersRound,
    Infinity as InfinityIcon,
    Gem,
    Users,
    Sparkles,
    MessagesSquare,
    Car,
    Store,
    Wallet,
    LifeBuoy,
} from "lucide-react";

export type SubscriptionTierId =
    | "suprah_go"
    | "suprah_premium"
    | "suprah_premium_pro"
    | "suprah_premium_ultra"
    | "suprah_origin";

export interface TierDefinition {
    id: SubscriptionTierId;
    name: string;
    shortName: string;
    tagline: string;
    price: number;
    seatLimit: number | null;
    locationLimit: number | null;
    icon: LucideIcon;
    accent: string;
    purchasable: boolean;
    highlights: string[];
}

export const SUBSCRIPTION_TIERS: TierDefinition[] = [
    {
        id: "suprah_go",
        name: "Suprah Go",
        shortName: "Go",
        tagline: "Everything a new dealership needs to get on the platform.",
        price: 0,
        seatLimit: 5,
        locationLimit: 1,
        icon: Rocket,
        accent: "zinc",
        purchasable: true,
        highlights: [
            "5 team seats, 1 location",
            "CRM pipeline — up to 250 active leads",
            "Timeproof Clock & basic Team Engagement",
            "Vehicle inventory — up to 50 listings",
            "Suprah Calendar, Feeds & Conversations",
            "Community & email support",
        ],
    },
    {
        id: "suprah_premium",
        name: "Suprah Premium",
        shortName: "Premium",
        tagline: "Unlocks Autrix AI and unlimited day-to-day CRM capacity.",
        price: 30,
        seatLimit: 15,
        locationLimit: 1,
        icon: Bot,
        accent: "blue",
        purchasable: true,
        highlights: [
            "15 team seats",
            "Autrix AI assistant (chat + voice)",
            "Unlimited leads & inventory listings",
            "Inbound/outbound calling & SMS",
            "Suprah Mail unified inbox",
            "Team Pulse leaderboard",
            "Priority email support",
        ],
    },
    {
        id: "suprah_premium_pro",
        name: "Suprah Premium Pro",
        shortName: "Premium Pro",
        tagline: "+15 more seats plus the operational modules a growing team needs.",
        price: 50,
        seatLimit: 30,
        locationLimit: 3,
        icon: UsersRound,
        accent: "violet",
        purchasable: true,
        highlights: [
            "30 team seats (+15 over Premium), 3 locations",
            "Autrix AI Pro — priority speed & higher usage cap",
            "Project Management suite unlocked",
            "Transportation & Driver Tracker (Beacon GPS)",
            "Security module — biometrics & SSH key vault",
            "Team Pulse Performance, Deals Board & Scheduler",
            "Live chat support",
        ],
    },
    {
        id: "suprah_premium_ultra",
        name: "Suprah Premium Ultra",
        shortName: "Premium Ultra",
        tagline: "Unlimited scale plus the full customer-facing storefront suite.",
        price: 100,
        seatLimit: null,
        locationLimit: null,
        icon: InfinityIcon,
        accent: "emerald",
        purchasable: true,
        highlights: [
            "Unlimited seats & locations",
            "Autrix AI Unlimited — first access to new skills",
            "SuprahPay driver payouts",
            "Trade-In Estimator & Auction \"Sell Your Car\" intake",
            "Drivers Club loyalty program for your customers",
            "Multi-location roll-up reporting",
            "Dedicated account manager & phone support",
        ],
    },
    {
        id: "suprah_origin",
        name: "Suprah Origin",
        shortName: "Origin",
        tagline: "Internal tier for the Suprah platform's creator, ActionAutoUtah.",
        price: 0,
        seatLimit: null,
        locationLimit: null,
        icon: Gem,
        accent: "amber",
        purchasable: false,
        highlights: [
            "Everything in Premium Ultra, unlimited",
            "Earliest access to every feature in development",
            "Internal beta AI skills",
            "Assigned only by Suprah platform staff",
        ],
    },
];

export const TIER_LABELS: Record<SubscriptionTierId, string> = Object.fromEntries(
    SUBSCRIPTION_TIERS.map((t) => [t.id, t.name]),
) as Record<SubscriptionTierId, string>;

export function getTierDefinition(id: SubscriptionTierId | undefined | null): TierDefinition {
    return SUBSCRIPTION_TIERS.find((t) => t.id === id) ?? SUBSCRIPTION_TIERS[0];
}

export type FeatureValue = boolean | string;

export interface FeatureRow {
    id: string;
    label: string;
    values: Record<SubscriptionTierId, FeatureValue>;
}

export interface FeatureCategory {
    id: string;
    name: string;
    icon: LucideIcon;
    features: FeatureRow[];
}

export const FEATURE_MATRIX: FeatureCategory[] = [
    {
        id: "team",
        name: "Team",
        icon: Users,
        features: [
            {
                id: "seats",
                label: "Team member seats",
                values: {
                    suprah_go: "5",
                    suprah_premium: "15",
                    suprah_premium_pro: "30",
                    suprah_premium_ultra: "Unlimited",
                    suprah_origin: "Unlimited",
                },
            },
            {
                id: "locations",
                label: "Locations per organization",
                values: {
                    suprah_go: "1",
                    suprah_premium: "1",
                    suprah_premium_pro: "3",
                    suprah_premium_ultra: "Unlimited",
                    suprah_origin: "Unlimited",
                },
            },
            {
                id: "hr",
                label: "Team Engagement / HR (attendance, absences, departments)",
                values: {
                    suprah_go: "Basic",
                    suprah_premium: "Full",
                    suprah_premium_pro: "Full",
                    suprah_premium_ultra: "Full",
                    suprah_origin: "Full",
                },
            },
            {
                id: "timeproof",
                label: "Timeproof Clock",
                values: {
                    suprah_go: true,
                    suprah_premium: true,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
        ],
    },
    {
        id: "autrix",
        name: "Autrix AI",
        icon: Sparkles,
        features: [
            {
                id: "autrix-availability",
                label: "Autrix AI (SupraLeo voice + chat assistant)",
                values: {
                    suprah_go: false,
                    suprah_premium: "Standard, ~500 interactions/mo",
                    suprah_premium_pro: "Pro, ~2,000/mo + priority speed",
                    suprah_premium_ultra: "Unlimited, first access to new skills",
                    suprah_origin: "Unlimited + internal betas",
                },
            },
            {
                id: "autrix-modules",
                label: "Modules covered",
                values: {
                    suprah_go: "—",
                    suprah_premium: "CRM, Timeproof, Suprah Space, Feeds",
                    suprah_premium_pro: "+ Biometrics / security module",
                    suprah_premium_ultra: "All modules",
                    suprah_origin: "All modules",
                },
            },
        ],
    },
    {
        id: "crm",
        name: "CRM & Sales",
        icon: Bot,
        features: [
            {
                id: "leads",
                label: "Lead / deal pipeline",
                values: {
                    suprah_go: "Capped 250 active leads",
                    suprah_premium: "Unlimited",
                    suprah_premium_pro: "Unlimited",
                    suprah_premium_ultra: "Unlimited",
                    suprah_origin: "Unlimited",
                },
            },
            {
                id: "calling",
                label: "Inbound/outbound calling & SMS",
                values: {
                    suprah_go: false,
                    suprah_premium: true,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "pulse-ack",
                label: "Team Pulse — reactions & ack",
                values: {
                    suprah_go: true,
                    suprah_premium: true,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "pulse-leaderboard",
                label: "Team Pulse — leaderboard",
                values: {
                    suprah_go: false,
                    suprah_premium: true,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "pulse-full",
                label: "Team Pulse — Performance, Deals Board (Kanban), Shift Scheduler",
                values: {
                    suprah_go: false,
                    suprah_premium: false,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
        ],
    },
    {
        id: "collaboration",
        name: "Collaboration",
        icon: MessagesSquare,
        features: [
            {
                id: "core-apps",
                label: "Suprah Calendar, Feeds, Conversations",
                values: {
                    suprah_go: true,
                    suprah_premium: true,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "supraspace",
                label: "Suprah Space team chat",
                values: {
                    suprah_go: "1 channel",
                    suprah_premium: "Unlimited channels + calling",
                    suprah_premium_pro: "Unlimited",
                    suprah_premium_ultra: "Unlimited",
                    suprah_origin: "Unlimited",
                },
            },
            {
                id: "mail",
                label: "Suprah Mail unified inbox",
                values: {
                    suprah_go: false,
                    suprah_premium: true,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "projects",
                label: "Project Management suite",
                values: {
                    suprah_go: "2 active projects",
                    suprah_premium: "2 active projects",
                    suprah_premium_pro: "Unlimited",
                    suprah_premium_ultra: "Unlimited",
                    suprah_origin: "Unlimited",
                },
            },
        ],
    },
    {
        id: "field-ops",
        name: "Inventory & Field Ops",
        icon: Car,
        features: [
            {
                id: "inventory",
                label: "Vehicle inventory listings",
                values: {
                    suprah_go: "Capped 50",
                    suprah_premium: "Unlimited",
                    suprah_premium_pro: "Unlimited",
                    suprah_premium_ultra: "Unlimited",
                    suprah_origin: "Unlimited",
                },
            },
            {
                id: "transportation",
                label: "Transportation / load management",
                values: {
                    suprah_go: false,
                    suprah_premium: false,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "beacon",
                label: "Driver Tracker (\"Beacon\" GPS, geofencing, SOS)",
                values: {
                    suprah_go: false,
                    suprah_premium: false,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "security",
                label: "Security module (biometric auth, SSH key vault, audit log)",
                values: {
                    suprah_go: false,
                    suprah_premium: false,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
        ],
    },
    {
        id: "storefront",
        name: "Storefront",
        icon: Store,
        features: [
            {
                id: "saved-compare",
                label: "Saved Vehicles, Compare Tool",
                values: {
                    suprah_go: false,
                    suprah_premium: true,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "booking",
                label: "Test Drive & Service Booking",
                values: {
                    suprah_go: false,
                    suprah_premium: true,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "trade-in",
                label: "Trade-In Estimator, Auction \"Sell Your Car\" intake",
                values: {
                    suprah_go: false,
                    suprah_premium: false,
                    suprah_premium_pro: false,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "drivers-club",
                label: "Drivers Club loyalty program for your customers",
                values: {
                    suprah_go: false,
                    suprah_premium: false,
                    suprah_premium_pro: false,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
        ],
    },
    {
        id: "payments",
        name: "Payments & Reports",
        icon: Wallet,
        features: [
            {
                id: "suprahpay",
                label: "SuprahPay driver payouts",
                values: {
                    suprah_go: false,
                    suprah_premium: false,
                    suprah_premium_pro: true,
                    suprah_premium_ultra: true,
                    suprah_origin: true,
                },
            },
            {
                id: "reports",
                label: "Reports",
                values: {
                    suprah_go: "Last 30 days",
                    suprah_premium: "12-mo history + CSV export",
                    suprah_premium_pro: "Advanced analytics + custom export",
                    suprah_premium_ultra: "Multi-location roll-up + scheduled reports",
                    suprah_origin: "Everything",
                },
            },
        ],
    },
    {
        id: "support",
        name: "Support",
        icon: LifeBuoy,
        features: [
            {
                id: "support-level",
                label: "Support level",
                values: {
                    suprah_go: "Community / email",
                    suprah_premium: "Priority email",
                    suprah_premium_pro: "Live chat",
                    suprah_premium_ultra: "Dedicated account manager + phone",
                    suprah_origin: "Internal Slack line",
                },
            },
        ],
    },
];
