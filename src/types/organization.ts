export type SubscriptionTierId =
    | "suprah_go"
    | "suprah_premium"
    | "suprah_premium_pro"
    | "suprah_premium_ultra"
    | "suprah_origin";

export interface OrganizationSubscription {
    tier: SubscriptionTierId;
    status: "active" | "past_due" | "cancelled";
    seatLimit: number | null;
    startedAt: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface Organization {
    _id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    members?: string[];
    subscription?: OrganizationSubscription;
    createdAt: string;
    updatedAt: string;
}

export interface OrganizationMember {
    _id: string;
    userId: string;
    organizationId: string;
    role: string; // Global system role
    organizationRole: 'admin' | 'member'; // Context-specific role
    isDispatcher?: boolean; // Transportation / Driver Review capability for this organization only
    email: string;
    fullName: string;
    imageUrl?: string;
    joinedAt: string;
}

export interface OrganizationInvitation {
    _id: string;
    email: string;
    role: 'admin' | 'member';
    token: string;
    expiresAt: string;
    status: 'pending' | 'accepted' | 'expired';
    organizationId: string;
    inviterId: string;
    createdAt: string;
}