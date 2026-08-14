"use client";

import * as React from "react";
import type { DriverStatus } from "@/types/driver-tracking";
import {
  useOptionalDriverLocationSharing,
} from "@/context/DriverLocationSharingContext";

const DEFAULT_STATUS: DriverStatus = "idle";

/**
 * Compatibility adapter for older Driver Account pages.
 *
 * Inside the Driver layout it forwards to DriverLocationSharingContext.
 * Outside that provider (for example the staff /driver-tracker route), it
 * returns a safe inactive state instead of throwing and crashing the page.
 *
 * The staff Driver Tracker should normally use the directory/socket data and
 * does not need to publish GPS itself.
 */
export function useDriverLocationSharing() {
  const sharing = useOptionalDriverLocationSharing();

  const noopStatus = React.useCallback((_status: DriverStatus) => {}, []);
  const noopStart = React.useCallback(() => {}, []);
  const noopStop = React.useCallback(async () => {}, []);

  if (!sharing) {
    return {
      isSharing: false,
      isStarting: false,
      status: DEFAULT_STATUS,
      lastShareAt: null,
      error: null,
      lastCoords: null,
      hasActiveLoad: false,
      isLocationRequired: false,
      locationRequirementReason: null,
      isLoadPolicyResolved: true,
      startSharing: noopStart,
      stopSharing: noopStop,
      updateStatus: noopStatus,
    };
  }

  return {
    isSharing: sharing.isSharing,
    isStarting: sharing.isStarting,
    status: sharing.shareStatus,
    lastShareAt: sharing.lastShareAt,
    error: sharing.shareError,
    lastCoords: sharing.lastCoords,
    hasActiveLoad: sharing.hasActiveLoad,
    isLocationRequired: sharing.isLocationRequired,
    locationRequirementReason: sharing.locationRequirementReason,
    isLoadPolicyResolved: sharing.isLoadPolicyResolved,
    startSharing: sharing.startSharing,
    stopSharing: sharing.stopSharing,
    updateStatus: sharing.setShareStatus,
  };
}