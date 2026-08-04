import { fmtFull, fmtShort, getInitials } from "@/lib/lead-utils";
import type { WorkspaceContact } from "./workspace-types";

export const workspaceInitials = (contact?: WorkspaceContact | null) =>
  getInitials(contact?.firstName, contact?.lastName);

export const workspaceContactName = (contact?: WorkspaceContact | null) =>
  contact?.name?.trim() ||
  [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
  "Unknown contact";

export const workspaceContactSubtitle = (contact?: WorkspaceContact | null) =>
  contact?.phone || contact?.email || contact?.subtitle || "No contact information";

export const formatWorkspaceShortDate = (value?: string | Date) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return fmtShort(date);
};

export const formatWorkspaceFullDate = (value?: string | Date) => {
  if (!value) return "Not provided";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return fmtFull(date);
};
