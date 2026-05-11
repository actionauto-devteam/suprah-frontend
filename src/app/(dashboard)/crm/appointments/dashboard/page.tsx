"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppointmentDashboard } from "@/components/AppointmentDashboard";

export default function AppointmentDashboardPage() {
  return (
    <TooltipProvider>
      <AppointmentDashboard />
    </TooltipProvider>
  );
}