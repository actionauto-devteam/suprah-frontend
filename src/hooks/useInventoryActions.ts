"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Vehicle } from "@/types/inventory";

export type ModalType =
  | "details"
  | "inquiry"
  | "finance"
  | "video"
  | "shipping";

const CLOSED_MODALS: Record<ModalType, boolean> = {
  details: false,
  inquiry: false,
  finance: false,
  video: false,
  shipping: false,
};

export function useInventoryActions() {
  const router = useRouter();
  const pathname = usePathname();
  // Single source of truth for which vehicle is being interacted with
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(
    null,
  );

  // States for different types of modals
  const [openModals, setOpenModals] =
    React.useState<Record<ModalType, boolean>>(CLOSED_MODALS);

  const toggleModal = React.useCallback(
    (type: ModalType, isOpen: boolean, vehicle?: Vehicle) => {
      if (vehicle) setSelectedVehicle(vehicle);
      setOpenModals((prev) => {
        if (isOpen) {
          return { ...CLOSED_MODALS, [type]: true };
        }
        return { ...prev, [type]: false };
      });
    },
    [],
  );

  const handleVehicleClick = React.useCallback(
    (vehicle: Vehicle) => {
      toggleModal("details", true, vehicle);
    },
    [toggleModal],
  );

  const handleCheckAvailability = React.useCallback(
    (vehicle: Vehicle) => {
      toggleModal("inquiry", true, vehicle);
    },
    [toggleModal],
  );

  const handleApplyNow = React.useCallback(
    (vehicle: Vehicle) => {
      // Context-aware routing: Stay in the dashboard if we are already there
      const isDashboard = pathname.includes("/inventory");
      if (isDashboard) {
        router.push(`/inventory/finance-application/${vehicle.id}`);
      } else {
        router.push(`/customer/finance-application/${vehicle.id}`);
      }
    },
    [pathname, router],
  );

  const handleCallUs = React.useCallback(() => {
    window.open("tel:8017661736", "_self");
  }, []);

  const handleVideo = React.useCallback(
    (vehicle: Vehicle) => {
      toggleModal("video", true, vehicle);
    },
    [toggleModal],
  );

  const handleGetQuote = React.useCallback(
    (vehicle: Vehicle) => {
      const isDashboard = pathname.includes("/inventory");
      if (isDashboard) {
        router.push(`/transportation?tab=create-load&vin=${vehicle.vin}`);
      } else {
        toggleModal("shipping", true, vehicle);
      }
    },
    [pathname, router, toggleModal],
  );

  const setDetailsOpen = React.useCallback(
    (open: boolean) => toggleModal("details", open),
    [toggleModal],
  );
  const setInquiryOpen = React.useCallback(
    (open: boolean) => toggleModal("inquiry", open),
    [toggleModal],
  );
  const setFinanceOpen = React.useCallback(
    (open: boolean) => toggleModal("finance", open),
    [toggleModal],
  );
  const setVideoOpen = React.useCallback(
    (open: boolean) => toggleModal("video", open),
    [toggleModal],
  );
  const setShippingOpen = React.useCallback(
    (open: boolean) => toggleModal("shipping", open),
    [toggleModal],
  );

  return React.useMemo(
    () => ({
      // State
      selectedVehicle,
      openModals,

      // Modal togglers
      setDetailsOpen,
      setInquiryOpen,
      setFinanceOpen,
      setVideoOpen,
      setShippingOpen,

      // Action Handlers
      handleVehicleClick,
      handleCheckAvailability,
      handleApplyNow,
      handleCallUs,
      handleVideo,
      handleGetQuote,
    }),
    [
      selectedVehicle,
      openModals,
      setDetailsOpen,
      setInquiryOpen,
      setFinanceOpen,
      setVideoOpen,
      setShippingOpen,
      handleVehicleClick,
      handleCheckAvailability,
      handleApplyNow,
      handleCallUs,
      handleVideo,
      handleGetQuote,
    ],
  );
}
