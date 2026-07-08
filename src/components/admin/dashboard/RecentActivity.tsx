"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"

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

export function RecentActivity() {
    const { getToken } = useAuth()

    const { data, isLoading } = useQuery({
        queryKey: ['admin-recent-activity'],
        queryFn: async () => {
            const token = await getToken()
            const res = await apiClient.get<ApiResponse>('/api/admin/audit-logs?limit=5', {
                headers: { Authorization: `Bearer ${token}` }
            })
            return res.data?.data?.logs || []
        },
        refetchInterval: 30000 // Refresh every 30s
    })

    if (isLoading) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex h-[100px] items-center justify-center text-sm text-muted-foreground">
                No recent activity.
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {data.map((log: AuditLog) => (
                <div key={log._id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={`/avatars/01.png`} alt="Avatar" />
                        <AvatarFallback>
                            {log.performedBy?.name ? log.performedBy.name.substring(0, 2).toUpperCase() : 'SY'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {log.action} - {log.entityType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {log.reason}
                        </p>
                    </div>
                    <div className="ml-auto font-medium text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver' })}
                    </div>
                </div>
            ))}
        </div>
    )
}
