"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { initializeSocket } from "@/lib/socket.client";
import type {
  DriverOperationalStatus,
  DriverStatusRequestPriority,
  DriverStatusRequestState,
} from "@/types/driver-tracking";

export interface DriverStatusRequestSnapshot {
  id?: string;
  _id?: string;
  requestedStatus: "on_leave" | "maintenance";
  priority: DriverStatusRequestPriority;
  status: DriverStatusRequestState;
  reason?: string | null;
  message?: string | null;
  effectiveAt?: string | null;
  estimatedReturnAt?: string | null;
  submittedAt?: string | null;
  transitionGroupId?: string | null;
  coordinatedOrganizationCount?: number;
  coordinatedOpenOrganizationCount?: number;
  coordinatedActiveLoadCount?: number;
  attachments?: Array<{
    id?: string;
    fileName: string;
    mimeType?: string;
    fileSize?: number;
    url?: string;
  }>;
}

function buildBlockReason(
  operationalStatus: DriverOperationalStatus,
  request: DriverStatusRequestSnapshot | null,
) {
  if (operationalStatus === "on_leave") {
    return "Your Work Availability is On Leave. Return to Active before accepting or requesting new loads.";
  }
  if (operationalStatus === "maintenance") {
    return "Your Work Availability is In Shop. Return to Active before accepting or requesting new loads.";
  }
  if (request?.priority === "emergency" && ["pending", "approved_awaiting_reassignment"].includes(request.status)) {
    return "Your emergency release request is active. Dispatch is handling your current loads, and new work is blocked.";
  }
  if (
    request?.transitionGroupId &&
    ["pending", "approved_awaiting_reassignment"].includes(request.status)
  ) {
    const count = Math.max(1, Number(request.coordinatedOrganizationCount ?? 1));
    return count > 1
      ? `Your Work Availability change is being coordinated across ${count} Dispatch teams. New work is paused until every affected team resolves its part.`
      : "Your Work Availability request is under Dispatch review. New work is paused until the transition is resolved.";
  }
  if (request?.status === "approved_awaiting_reassignment") {
    return "Your Work Availability change is approved and awaiting load reassignment. New work is blocked until the transition is complete.";
  }
  return null;
}

export function useDriverWorkEligibility() {
  const { getToken, isSignedIn } = useAuth();
  const [operationalStatus, setOperationalStatus] =
    React.useState<DriverOperationalStatus>("active");
  const [statusRequest, setStatusRequest] =
    React.useState<DriverStatusRequestSnapshot | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      if (!token) return;
      const [profileRes, requestRes] = await Promise.all([
        apiClient.get("/api/driver-profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get("/api/driver-profile/status-requests/my-current", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      const profileStatus = profileRes.data?.data?.operationalStatus;
      setOperationalStatus(
        profileStatus === "on_leave" || profileStatus === "maintenance"
          ? profileStatus
          : "active",
      );
      setStatusRequest(requestRes?.data?.data ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isSignedIn]);

  React.useEffect(() => {
    void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  React.useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    const handleUpdate = () => {
      if (!cancelled) void refresh();
    };

    const setup = async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      socket = initializeSocket(token);
      socket.on("driver:status_request_updated", handleUpdate);
      socket.on("driver:operational_status_updated", handleUpdate);
    };
    void setup();
    return () => {
      cancelled = true;
      socket?.off("driver:status_request_updated", handleUpdate);
      socket?.off("driver:operational_status_updated", handleUpdate);
    };
  }, [getToken, isSignedIn, refresh]);

  const blockReason = React.useMemo(
    () => buildBlockReason(operationalStatus, statusRequest),
    [operationalStatus, statusRequest],
  );

  const emergencyReleaseActive = Boolean(
    statusRequest?.priority === "emergency" &&
      ["pending", "approved_awaiting_reassignment"].includes(statusRequest.status),
  );

  return {
    operationalStatus,
    statusRequest,
    isLoading,
    blockReason,
    canTakeNewWork: blockReason == null,
    emergencyReleaseActive,
    refresh,
  };
}