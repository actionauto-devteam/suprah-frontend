"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/admin/primitives"
import { Activity } from "lucide-react"

interface AuditLog {
    _id: string;
    entityType: string;
    action: string;
    reason: string;
    timestamp: string;
    performedBy?: {
        name: string;
        email: string;
    } | null;
}

interface ApiResponse {
    data: {
        logs: AuditLog[];
    };
}

const initials = (name?: string) => {
    if (!name) return "SY";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
};

const humanize = (value?: string) =>
    String(value || "").replace(/_/g, " ").toLowerCase();

const relativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
};

export function RecentActivity() {
    const { getToken } = useAuth()

    const { data, isLoading } = useQuery({
        queryKey: ['admin-recent-activity'],
        queryFn: async () => {
            const token = await getToken()
            const res = await apiClient.get<ApiResponse>('/api/admin/audit-logs?limit=6', {
                headers: { Authorization: `Bearer ${token}` }
            })
            return res.data?.data?.logs || []
        },
        refetchInterval: 30000
    })

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3 w-2/5" />
                            <Skeleton className="h-3 w-3/5" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <EmptyState
                icon={Activity}
                title="No recent activity"
                description="Admin actions and system events will appear here as they happen."
                className="py-8"
            />
        )
    }

    return (
        <div className="space-y-1">
            {data.map((log: AuditLog) => (
                <div key={log._id} className="flex items-start gap-3 rounded-md px-1 py-2">
                    <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="text-[10px] font-medium">
                            {initials(log.performedBy?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                            <span className="font-medium">{log.performedBy?.name || 'System'}</span>
                            <span className="text-muted-foreground"> {humanize(log.action)} </span>
                            <span className="text-muted-foreground">{humanize(log.entityType)}</span>
                        </p>
                        {log.reason && (
                            <p className="truncate text-xs text-muted-foreground">{log.reason}</p>
                        )}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {relativeTime(log.timestamp)}
                    </span>
                </div>
            ))}
        </div>
    )
}
