import type * as React from "react";

export type WorkspaceViewportMode = "narrow" | "compact" | "wide";
export type WorkspaceDetailsTab = "details" | "activity";

export interface WorkspaceContact {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  phone?: string;
  subtitle?: string;
  preview?: string;
  timestamp?: string | Date;
  status?: string;
  channel?: string;
  source?: string;
  isRead?: boolean;
  count?: number;
  raw?: unknown;
}

export interface WorkspaceActivityItem {
  id: string;
  kind: "inquiry" | "note" | "status" | "call" | "sms" | "email" | "communication";
  title: string;
  description?: string;
  createdAt?: string | Date;
}

export interface WorkspaceDetailRow {
  id: string;
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  /** Plain text copied by the optional per-row copy action. */
  copyText?: string;
  copyLabel?: string;
}

export interface WorkspaceDetailSection {
  id: string;
  title: string;
  rows: WorkspaceDetailRow[];
  defaultOpen?: boolean;
}


export interface WorkspaceSectionEditor {
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  content: React.ReactNode;
}

export interface WorkspaceQuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: "default" | "accent" | "warning" | "danger";
  /** Identifies the action currently represented by the active conversation composer. */
  isActive?: boolean;
}

export interface WorkspaceContactDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface WorkspaceContactEditor {
  value: WorkspaceContactDraft;
  onChange: (value: WorkspaceContactDraft) => void;
  onSave: () => void | Promise<void>;
  isSaving?: boolean;
  firstNameRequired?: boolean;
}

export interface WorkspaceStatusOption {
  value: string;
  label: string;
}