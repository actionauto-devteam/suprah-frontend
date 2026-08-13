"use client";

import * as React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useOrg } from "@/hooks/useOrg";
import { apiClient } from "@/lib/api-client";
import { DriverRequest } from "@/types/driver-request";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  UserPlus,
  Mail,
  ChevronRight,
} from "lucide-react";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/10 text-green-600 border-green-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-600 border-red-200",
  },
};

export function DriverRequestsSettings() {
  const { getToken } = useAuth();
  const { isAdmin } = useOrg();
  const [requests, setRequests] = React.useState<DriverRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "pending">("pending");

  const fetchRequests = React.useCallback(async () => {
    try {
      const token = await getToken();
      const params = filter === "pending" ? { status: "pending" } : undefined;
      const res = await apiClient.getDriverRequests(params, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data?.data || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [getToken, filter]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const token = await getToken();
      await apiClient.approveDriverRequest(id, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRequests();
    } catch {
      // silent
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      const token = await getToken();
      await apiClient.rejectDriverRequest(id, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRequests();
    } catch {
      // silent
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-linear-to-b from-background to-muted/20 p-3 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserPlus className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-none">Driver Requests</h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Review incoming access requests and respond quickly.
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5 ml-1">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <div className="flex gap-1 bg-muted/70 rounded-lg p-0.5 shrink-0 border border-border/50">
          <button
            onClick={() => setFilter("pending")}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${filter === "pending"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${filter === "all"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            All
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <UserPlus className="size-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">No driver requests</p>
          <p className="text-xs">
            {filter === "pending"
              ? "No pending requests right now."
              : "No requests found."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => {
            const driver = request.driverUserId;
            const config = statusConfig[request.status];
            const isPending = request.status === "pending";
            const isActioning = actionId === request._id;

            return (
              <div
                key={request._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/70 gap-3 bg-card/75 hover:bg-card transition-colors"
              >
                <Link
                  href={`/settings/drivers/${driver?._id}`}
                  className="flex items-center gap-3 min-w-0 group"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={driver?.avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {driver?.name?.substring(0, 2).toUpperCase() || "DR"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:underline">
                      {driver?.name || "Unknown Driver"}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="size-3" />
                      <span className="truncate">
                        {driver?.email || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Clock className="size-3" />
                      {new Date(request.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/50 shrink-0 ml-auto group-hover:text-muted-foreground transition-colors sm:hidden" />
                </Link>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                  {isPending && isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 sm:h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(request._id)}
                        disabled={isActioning}
                      >
                        {isActioning ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <XCircle className="size-3.5 mr-1" />
                        )}
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 sm:h-7 text-xs"
                        onClick={() => handleApprove(request._id)}
                        disabled={isActioning}
                      >
                        {isActioning ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5 mr-1" />
                        )}
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
