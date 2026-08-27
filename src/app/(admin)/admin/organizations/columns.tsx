'use client';

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowRight, ShieldBan, ShieldCheck, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Organization } from "@/types/organization" // We might need to extend this type locally if status is missing
import { apiClient } from "@/lib/api-client"
import { adminStore } from "@/store/admin-store"
import { useRouter } from "next/navigation"
import { toast } from "sonner" // Assuming sonner or useToast is available. If not, console.log for now or check package.json
import { SUBSCRIPTION_TIERS, getTierDefinition } from "@/data/subscriptionTiers"

// Extend Organization type to include status if not present
export interface AdminOrganization extends Organization {
    status?: 'active' | 'suspended' | 'archived';
    ownerId?: any; // populated
}

export const TIER_BADGE_CLASSES: Record<string, string> = {
    zinc: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-none",
    blue: "bg-blue-500/10 text-blue-600 border-none",
    violet: "bg-violet-500/10 text-violet-600 border-none",
    emerald: "bg-emerald-500/10 text-emerald-600 border-none",
    amber: "bg-amber-500/10 text-amber-600 border-none",
};

export const columns: ColumnDef<AdminOrganization>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "slug",
        header: "Slug",
    },
    {
        id: "plan",
        header: "Plan",
        cell: ({ row }) => {
            const tier = getTierDefinition(row.original.subscription?.tier);
            return (
                <Badge className={TIER_BADGE_CLASSES[tier.accent] ?? TIER_BADGE_CLASSES.zinc}>
                    {tier.name}
                </Badge>
            )
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return (
                <Badge variant={status === 'active' ? 'default' : 'destructive'}>
                    {status || 'active'}0
                </Badge>
            )
        },
    },
    {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => {
            return new Date(row.getValue("createdAt")).toLocaleDateString('en-US', { timeZone: 'America/Denver' })
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <OrgActionsCell org={row.original} />,
    },
]

export function OrgActionsCell({ org }: { org: AdminOrganization }) {
    const router = useRouter();
    const { startImpersonation } = adminStore.useStore();
    const { getToken } = useAuth();

    const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState(org.subscription?.tier || "suprah_go");
    const [isSavingTier, setIsSavingTier] = useState(false);

    const handleImpersonate = () => {
        startImpersonation(org._id);
        toast.success(`Impersonating ${org.name}`);
        router.push('/'); // Redirect to dashboard as that org
    };

    const handleSuspend = async () => {
        try {
            const token = await getToken();
            await apiClient.put(`/api/admin/organizations/${org._id}/status`, { status: 'suspended' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Organization suspended');
            window.location.reload();
        } catch {
            toast.error('Failed to suspend');
        }
    };

    const handleActivate = async () => {
        try {
            const token = await getToken();
            await apiClient.put(`/api/admin/organizations/${org._id}/status`, { status: 'active' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Organization activated');
            window.location.reload();
        } catch {
            toast.error('Failed to activate');
        }
    };

    const handleSaveSubscription = async () => {
        setIsSavingTier(true);
        try {
            const token = await getToken();
            await apiClient.adminUpdateOrganizationSubscription(org._id, { tier: selectedTier }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Subscription updated');
            setSubscriptionDialogOpen(false);
            window.location.reload();
        } catch {
            toast.error('Failed to update subscription');
        } finally {
            setIsSavingTier(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleImpersonate}>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Impersonate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSubscriptionDialogOpen(true)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Edit Subscription
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {org.status === 'suspended' ? (
                        <DropdownMenuItem onClick={handleActivate}>
                            <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                            Activate Organization
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={handleSuspend} className="text-red-600">
                            <ShieldBan className="mr-2 h-4 w-4" />
                            Suspend Organization
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Subscription — {org.name}</DialogTitle>
                        <DialogDescription>
                            Change which Suprah plan this organization is on. Suprah Origin is reserved
                            for the platform&apos;s own internal use.
                        </DialogDescription>
                    </DialogHeader>
                    <Select value={selectedTier} onValueChange={(value) => setSelectedTier(value as typeof selectedTier)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                            {SUBSCRIPTION_TIERS.map((tier) => (
                                <SelectItem key={tier.id} value={tier.id}>
                                    {tier.name} {tier.price > 0 ? `— $${tier.price}/mo` : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)} disabled={isSavingTier}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveSubscription} disabled={isSavingTier}>
                            {isSavingTier ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Plan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
