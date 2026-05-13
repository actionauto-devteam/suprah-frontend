'use client';

import { useAuth } from "@/providers/AuthProvider";
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowRight, ShieldBan, ShieldCheck, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Organization } from "@/types/organization" // We might need to extend this type locally if status is missing
import { apiClient } from "@/lib/api-client"
import { adminStore } from "@/store/admin-store"
import { useRouter } from "next/navigation"
import { toast } from "sonner" // Assuming sonner or useToast is available. If not, console.log for now or check package.json

// Extend Organization type to include status if not present
interface AdminOrganization extends Organization {
    status?: 'active' | 'suspended' | 'archived';
    ownerId?: any; // populated
}

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
            return new Date(row.getValue("createdAt")).toLocaleDateString()
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const org = row.original;
            const router = useRouter();
            const { startImpersonation } = adminStore.useStore();
            const { getToken } = useAuth();

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
                    // Refresh data logic needed here (invalidate query)
                    window.location.reload();
                } catch (error) {
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
                } catch (error) {
                    toast.error('Failed to activate');
                }
            };

            return (
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
                        <DropdownMenuItem>
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
            )
        },
    },
]
