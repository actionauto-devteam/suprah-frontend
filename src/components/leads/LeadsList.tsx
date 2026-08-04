"use client";

import * as React from "react";
import { SupraLeoReadButton } from "@/components/supra-leo-ai/SupraLeoReadButton";
import { ConversationListPanel } from "@/components/conversation-workspace/ConversationListPanel";
import { leadToWorkspaceContact } from "@/components/conversation-workspace/adapters/lead-inbox-adapter";
import type { WorkspaceContact } from "@/components/conversation-workspace/workspace-types";

interface LeadsListProps {
  leads: any[];
  isLoading: boolean;
  total: number;
  pages: number;
  currentPage: number;
  selectedLeadId?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onPageChange: (p: number) => void;
  onLeadSelect: (lead: any) => void;
  highlightedLeadIds: Set<string>;
  itemsPerPage: number;
  sourceEmail: string;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (lead: any) => void;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  topContent?: React.ReactNode;
}

export const LeadsList = React.memo(
  ({
    leads,
    isLoading,
    total,
    pages,
    currentPage,
    selectedLeadId,
    searchQuery,
    onSearchChange,
    onPageChange,
    onLeadSelect,
    highlightedLeadIds,
    itemsPerPage,
    sourceEmail,
    selectMode = false,
    selectedIds,
    onToggleSelect,
    title = "Inquiries & Leads",
    subtitle = sourceEmail,
    headerAction,
    topContent,
  }: LeadsListProps) => {
    const contacts = React.useMemo(
      () => leads.map((lead) => leadToWorkspaceContact(lead)),
      [leads],
    );

    const getLead = React.useCallback(
      (contact: WorkspaceContact) =>
        (contact.raw as any) || leads.find((lead) => lead._id === contact.id),
      [leads],
    );

    return (
      <ConversationListPanel
        title={title}
        subtitle={subtitle}
        contacts={contacts}
        selectedContactId={selectedLeadId}
        isLoading={isLoading}
        total={total}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onContactSelect={(contact) => {
          const lead = getLead(contact);
          if (lead) onLeadSelect(lead);
        }}
        highlightedContactIds={highlightedLeadIds}
        emptyLabel="No leads found"
        currentPage={currentPage}
        totalPages={pages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={(contact) => {
          const lead = getLead(contact);
          if (lead) onToggleSelect?.(lead);
        }}
        headerAction={headerAction}
        topContent={topContent}
        renderTrailing={(contact) => {
          const lead = getLead(contact);
          return lead ? <SupraLeoReadButton lead={lead} size="sm" /> : null;
        }}
      />
    );
  },
);

LeadsList.displayName = "LeadsList";
