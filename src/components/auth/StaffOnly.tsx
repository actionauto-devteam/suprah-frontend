"use client";

import * as React from "react";
import { useUser } from "@/providers/AuthProvider";
import { isStaffRole } from "@/lib/staff-only";

/**
 * Shows its contents only to dealership staff and super admins (2026-11-13).
 * Used around staff-only pieces mounted in shared layouts, such as Suprah
 * Meet's meeting alerts, which customers and drivers briefly passed through on
 * their way to their own portal and then saw for a minute.
 */
export function StaffOnly({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  if (!isStaffRole(user?.role)) return null;
  return <>{children}</>;
}
