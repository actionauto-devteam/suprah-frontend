"use client";

import * as React from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/context/ThemeContext";
import { useLeads, Lead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import { getDashboardSocket } from "@/lib/dashboardSocket";
import { SupraLeoAI } from "@/components/supra-leo-ai/SupraLeoAI";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  Bot,
  Car,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Edit3,
  Filter,
  Inbox,
  LayoutTemplate,
  Mail,
  MessageSquare,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  StickyNote,
  Sun,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { StatusPill } from "@/components/leads/atomic/StatusPill";
import { ConversationWorkspace } from "@/components/conversation-workspace/ConversationWorkspace";
import { ConversationListPanel } from "@/components/conversation-workspace/ConversationListPanel";
import { ConversationHeader } from "@/components/conversation-workspace/ConversationHeader";
import { ContactDetailsPanel } from "@/components/conversation-workspace/ContactDetailsPanel";
import { injectConversationWorkspaceStyles } from "@/components/conversation-workspace/workspace-styles";
import {
  communicationActivities,
  communicationDetailSections,
  communicationLeadToContact,
  communicationQuickActions,
} from "@/components/conversation-workspace/adapters/communication-hub-adapter";
import { resolveCustomerEmail } from "@/components/conversation-workspace/customer-email";
import type { WorkspaceContact } from "@/components/conversation-workspace/workspace-types";
import { WorkspaceEmptyState } from "@/components/conversation-workspace/WorkspaceEmptyState";

type CommChannel = "sms" | "email" | "call";
type CommDirection = "inbound" | "outbound";
type ComposerMode = "sms" | "email";
type ViewportMode = "narrow" | "compact" | "wide";
type DetailsTab = "details" | "activity";
type LeadSortOption = "newest" | "oldest" | "waiting_longest";

interface CommunicationCapabilities {
  sms: {
    mode: "live" | "simulation";
    provider: string;
  };
  email: {
    mode: "live";
    provider: string;
  };
  calling: {
    mode: "logging-only";
    provider: string;
  };
}

interface CommLog {
  _id: string;
  leadId?: string;
  channel: CommChannel;
  direction: CommDirection;
  status: string;
  from?: string;
  to?: string;
  body?: string;
  durationSeconds?: number;
  provider?: string;
  metadata?: {
    mode?: string;
    subject?: string;
    source?: string;
    providerError?: string;
  };
  createdAt: string;
}

interface ContactDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface CustomerVehicleDraft {
  source: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
}

interface ActivityEntry {
  id: string;
  kind: "note" | "call" | "status" | "communication";
  title: string;
  description: string;
  createdAt?: string;
}

const DEFAULT_CAPABILITIES: CommunicationCapabilities = {
  sms: { mode: "simulation", provider: "internal-simulated" },
  email: { mode: "live", provider: "organization-gmail-or-smtp" },
  calling: { mode: "logging-only", provider: "internal" },
};


const COMMUNICATION_STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "New", label: "New" },
  { value: "Pending", label: "Pending" },
  { value: "Contacted", label: "Contacted" },
  { value: "Appointment Set", label: "Appointment Set" },
  { value: "Closed", label: "Closed" },
] as const;

const SMS_TEMPLATES: {
  label: string;
  text: (lead: Lead | null) => string;
}[] = [
  {
    label: "Follow-up",
    text: (lead) =>
      `Hi ${lead?.firstName || "there"}, just following up on your interest in the ${vehicleLabel(lead)}. Let me know if you have any questions!`,
  },
  {
    label: "Appointment",
    text: (lead) =>
      `Hi ${lead?.firstName || "there"}, this is a reminder about your upcoming appointment. Looking forward to seeing you!`,
  },
  {
    label: "Test drive",
    text: (lead) =>
      `Hi ${lead?.firstName || "there"}, would you like to schedule a test drive for the ${vehicleLabel(lead)}? Let me know a time that works.`,
  },
  {
    label: "Thank you",
    text: (lead) =>
      `Thank you, ${lead?.firstName || "there"}! It was great speaking with you. Please reach out with any questions.`,
  },
  {
    label: "Pricing",
    text: (lead) =>
      `Hi ${lead?.firstName || "there"}, I have pricing details ready for the ${vehicleLabel(lead)}. Would you like me to send them over?`,
  },
];

function vehicleLabel(lead: Lead | null) {
  const vehicle = lead?.vehicle;
  const label = [vehicle?.year, vehicle?.make, vehicle?.model]
    .filter(Boolean)
    .join(" ");
  return label || "vehicle you asked about";
}

function fullName(lead: Lead | null) {
  if (!lead) return "No lead selected";
  return `${lead.firstName || "Unknown"} ${lead.lastName || ""}`.trim();
}

function initials(lead: Lead | null) {
  if (!lead) return "--";
  return (
    `${lead.firstName?.[0] || ""}${lead.lastName?.[0] || ""}`.toUpperCase() ||
    "--"
  );
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "0m 00s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "Unknown time";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(dateStr);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return "No activity yet";
  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000),
  );
  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function errorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
}

function responseMessage(response: any, fallback: string) {
  return response?.data?.message || fallback;
}

function unwrapLead(response: any): Lead | null {
  return (
    response?.data?.data?.lead ||
    response?.data?.data ||
    response?.data?.lead ||
    response?.data ||
    null
  );
}

function upsertLog(current: CommLog[], incoming: CommLog) {
  const withoutDuplicate = current.filter((log) => log._id !== incoming._id);
  return [incoming, ...withoutDuplicate]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 150);
}

function statusLabel(log: CommLog) {
  if (log.channel === "sms" && log.metadata?.mode === "simulation") {
    return log.direction === "inbound"
      ? "Simulated inbound"
      : "Simulation logged";
  }
  if (log.channel === "call") {
    return log.status === "completed" ? "Call logged" : log.status;
  }
  return log.status;
}

function channelIcon(log: CommLog) {
  if (log.channel === "email") return Mail;
  if (log.channel === "sms") return MessageSquare;
  return log.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
}

function contactDraftFromLead(lead: Lead | null): ContactDraft {
  return {
    firstName: lead?.firstName || "",
    lastName: lead?.lastName || "",
    email: resolveCustomerEmail(lead),
    phone: lead?.phone || "",
  };
}

export function CommunicationHub() {
  const { getToken } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [leadSearch, setLeadSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<LeadSortOption>("newest");

  const {
    leads,
    total,
    isLoading: leadsLoading,
    isFetching: leadsFetching,
    updateLeadStatus,
    addLeadNote,
    refetch: refetchLeads,
  } = useLeads({
    page: 1,
    limit: 100,
    search: leadSearch,
    status: statusFilter,
    sortBy,
  });

  const [viewportMode, setViewportMode] =
    React.useState<ViewportMode>("wide");
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const selectedLeadId = selectedLead?._id || "";
  const selectedEmail = resolveCustomerEmail(selectedLead);

  const [isHubSummaryExpanded, setIsHubSummaryExpanded] =
    React.useState(false);
  const [isAutrixOpen, setIsAutrixOpen] = React.useState(false);
  const [isChatHovered, setIsChatHovered] = React.useState(false);
  const [logs, setLogs] = React.useState<CommLog[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);
  const [loadingSelectedLead, setLoadingSelectedLead] = React.useState(false);
  const [capabilities, setCapabilities] =
    React.useState<CommunicationCapabilities>(DEFAULT_CAPABILITIES);

  const [showDetails, setShowDetails] = React.useState(true);
  const [detailsTab, setDetailsTab] = React.useState<DetailsTab>("details");

  const [composerMode, setComposerMode] =
    React.useState<ComposerMode>("sms");
  const [smsBody, setSmsBody] = React.useState("");
  const [emailSubject, setEmailSubject] = React.useState("");
  const [emailBody, setEmailBody] = React.useState("");
  const [composerBusy, setComposerBusy] = React.useState(false);

  const [noteBusy, setNoteBusy] = React.useState(false);

  const [editContact, setEditContact] = React.useState(false);
  const [contactDraft, setContactDraft] =
    React.useState<ContactDraft>(contactDraftFromLead(null));
  const [contactSaveBusy, setContactSaveBusy] = React.useState(false);
  const [editingCustomerOverview, setEditingCustomerOverview] =
    React.useState(false);
  const [customerOverviewSaveBusy, setCustomerOverviewSaveBusy] =
    React.useState(false);
  const [customerOverviewDraft, setCustomerOverviewDraft] =
    React.useState<CustomerVehicleDraft>({
      source: "",
      vehicleYear: "",
      vehicleMake: "",
      vehicleModel: "",
    });

  const [callDialogOpen, setCallDialogOpen] = React.useState(false);
  const [callDirection, setCallDirection] =
    React.useState<CommDirection>("outbound");
  const [callStatus, setCallStatus] = React.useState("completed");
  const [callDuration, setCallDuration] = React.useState(180);
  const [callNotes, setCallNotes] = React.useState("");
  const [callBusy, setCallBusy] = React.useState(false);

  const [inboundDialogOpen, setInboundDialogOpen] = React.useState(false);
  const [inboundBody, setInboundBody] = React.useState("");
  const [inboundBusy, setInboundBusy] = React.useState(false);

  const [contactBusy, setContactBusy] = React.useState(false);

  const messageAreaRef = React.useRef<HTMLDivElement | null>(null);
  const composerTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const getHeaders = React.useCallback(async () => {
    const token = await getToken();
    if (!token) {
      throw new Error("Your session is not available. Please sign in again.");
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);

  React.useEffect(() => {
    injectConversationWorkspaceStyles();
  }, []);

  React.useEffect(() => {
    const updateViewportMode = () => {
      const width = window.innerWidth;
      if (width < 1024) {
        setViewportMode("narrow");
      } else if (width < 1440) {
        setViewportMode("compact");
      } else {
        setViewportMode("wide");
      }
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  React.useEffect(() => {
    if (!selectedLead) {
      setShowDetails(false);
      return;
    }

    setShowDetails(viewportMode !== "narrow");
  }, [selectedLead?._id, viewportMode]);

  React.useEffect(() => {
    if (viewportMode === "narrow") {
      setIsHubSummaryExpanded(false);
    }
  }, [viewportMode]);

  const activityEntries = React.useMemo<ActivityEntry[]>(() => {
    const notes: ActivityEntry[] = (selectedLead?.notes || []).map(
      (note, index) => ({
        id: `note:${note._id || `${note.createdAt}:${index}`}`,
        kind: "note",
        title: "Internal note added",
        description: note.text,
        createdAt: note.createdAt,
      }),
    );

    const calls: ActivityEntry[] = logs
      .filter((log) => log.channel === "call")
      .map((log) => ({
        id: `call:${log._id}`,
        kind: "call",
        title: `${log.direction === "inbound" ? "Inbound" : "Outbound"} call ${log.status}`,
        description: [
          log.body || "No call notes",
          `Duration: ${formatDuration(log.durationSeconds)}`,
        ].join(" · "),
        createdAt: log.createdAt,
      }));

    const statuses: ActivityEntry[] = (selectedLead?.statusHistory || []).map(
      (entry, index) => ({
        id: `status:${entry.changedAt}:${index}`,
        kind: "status",
        title: `Status changed to ${entry.to}`,
        description: entry.reason || `Previous status: ${entry.from}`,
        createdAt: entry.changedAt,
      }),
    );

    const communications: ActivityEntry[] = logs
      .filter((log) => log.channel !== "call")
      .map((log) => ({
        id: `communication:${log._id}`,
        kind: "communication",
        title: `${log.direction === "inbound" ? "Inbound" : "Outbound"} ${log.channel.toUpperCase()}`,
        description:
          log.channel === "email" && log.metadata?.subject
            ? `${log.metadata.subject}: ${log.body || ""}`
            : log.body || statusLabel(log),
        createdAt: log.createdAt,
      }));

    return [...notes, ...calls, ...statuses, ...communications].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  }, [logs, selectedLead?.notes, selectedLead?.statusHistory]);

  const lastActivityAt = React.useMemo(() => {
    const dates = [
      ...logs.map((log) => log.createdAt),
      ...(selectedLead?.notes || []).map((note) => note.createdAt),
      ...(selectedLead?.statusHistory || []).map((item) => item.changedAt),
    ]
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite);

    if (dates.length === 0) return selectedLead?.updatedAt;
    return new Date(Math.max(...dates)).toISOString();
  }, [logs, selectedLead]);

  const fetchSelectedLead = React.useCallback(
    async (leadId: string, fallbackLead?: Lead) => {
      if (!leadId) {
        setSelectedLead(null);
        return null;
      }

      if (fallbackLead) {
        setSelectedLead(fallbackLead);
      }

      setLoadingSelectedLead(true);
      try {
        const headers = await getHeaders();
        const response = await apiClient.get(`/api/leads/${leadId}`, headers);
        const fetchedLead = unwrapLead(response);

        if (fetchedLead?._id) {
          setSelectedLead(fetchedLead);
          return fetchedLead;
        }

        return fallbackLead || null;
      } catch (error) {
        if (!fallbackLead) {
          toast.error(errorMessage(error, "Could not load the selected lead"));
        }
        return fallbackLead || null;
      } finally {
        setLoadingSelectedLead(false);
      }
    },
    [getHeaders],
  );

  const selectLead = React.useCallback(
    (lead: Lead) => {
      setSelectedLead(lead);
      setDetailsTab("details");
      setShowDetails(viewportMode !== "narrow");
      void fetchSelectedLead(lead._id, lead);
    },
    [fetchSelectedLead, viewportMode],
  );

  React.useEffect(() => {
    if (!selectedLead) return;
    const refreshed = leads.find((lead) => lead._id === selectedLead._id);
    if (refreshed) {
      setSelectedLead((current) =>
        current?._id === refreshed._id ? { ...current, ...refreshed } : current,
      );
    }
  }, [leads, selectedLead?._id]);

  React.useEffect(() => {
    setContactDraft(contactDraftFromLead(selectedLead));
    setEditContact(false);
    setDetailsTab("details");
    setEmailSubject(`Re: ${selectedLead?.subject || "Your inquiry"}`);
    setSmsBody("");
    setEmailBody("");
    setCustomerOverviewDraft({
      source: selectedLead?.source || "",
      vehicleYear: selectedLead?.vehicle?.year || "",
      vehicleMake: selectedLead?.vehicle?.make || "",
      vehicleModel: selectedLead?.vehicle?.model || "",
    });
    setEditingCustomerOverview(false);
  }, [selectedLead?._id]);

  const loadCapabilities = React.useCallback(async () => {
    try {
      const headers = await getHeaders();
      const response = await apiClient.get(
        "/api/appointments/dashboard/communications/capabilities",
        headers,
      );
      setCapabilities(response.data?.data || DEFAULT_CAPABILITIES);
    } catch {
      setCapabilities(DEFAULT_CAPABILITIES);
    }
  }, [getHeaders]);

  const loadLogs = React.useCallback(
    async (showError = false) => {
      if (!selectedLeadId) {
        setLogs([]);
        return;
      }

      setLoadingLogs(true);
      try {
        const headers = await getHeaders();
        const response = await apiClient.get(
          `/api/appointments/dashboard/communications?leadId=${selectedLeadId}&limit=150`,
          headers,
        );
        setLogs(response.data?.data?.logs || []);
      } catch (error) {
        if (showError) {
          toast.error(errorMessage(error, "Could not refresh the conversation"));
        }
      } finally {
        setLoadingLogs(false);
      }
    },
    [getHeaders, selectedLeadId],
  );

  React.useEffect(() => {
    void loadCapabilities();
  }, [loadCapabilities]);

  React.useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  React.useLayoutEffect(() => {
    const element = messageAreaRef.current;
    if (!element) return;

    const frame = window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [logs.length, selectedLeadId]);

  React.useEffect(() => {
    let socket: ReturnType<typeof getDashboardSocket> | null = null;
    let cancelled = false;

    const onCommunication = (payload: CommLog) => {
      if (payload?.leadId === selectedLeadId) {
        setLogs((current) => upsertLog(current, payload));
      }
    };

    const onLeadUpdate = (updatedLead: Lead) => {
      if (!updatedLead?._id) return;
      if (updatedLead._id === selectedLeadId) {
        setSelectedLead((current) =>
          current?._id === updatedLead._id
            ? { ...current, ...updatedLead }
            : updatedLead,
        );
      }
      void refetchLeads();
    };

    const connect = async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      socket = getDashboardSocket(token);
      socket.on("communications:new", onCommunication);
      socket.on("lead:update", onLeadUpdate);
    };

    void connect();

    return () => {
      cancelled = true;
      socket?.off("communications:new", onCommunication);
      socket?.off("lead:update", onLeadUpdate);
    };
  }, [getToken, refetchLeads, selectedLeadId]);

  const ensureContacted = React.useCallback(async () => {
    if (!selectedLeadId || !selectedLead) return;
    if (!["New", "Pending"].includes(selectedLead.status)) return;

    try {
      const updated = await updateLeadStatus({
        id: selectedLeadId,
        status: "Contacted",
      });
      const updatedLead = unwrapLead({ data: updated });
      setSelectedLead((current) =>
        updatedLead?._id
          ? updatedLead
          : current
            ? { ...current, status: "Contacted" }
            : current,
      );
    } catch {
      toast.warning("Interaction saved, but the lead status could not be updated");
    }
  }, [selectedLead, selectedLeadId, updateLeadStatus]);

  const sendSms = async () => {
    if (!selectedLeadId || !smsBody.trim() || !selectedLead?.phone) return;
    setComposerBusy(true);

    try {
      const headers = await getHeaders();
      const response = await apiClient.post(
        "/api/appointments/dashboard/communications/sms",
        {
          leadId: selectedLeadId,
          body: smsBody.trim(),
          to: selectedLead.phone,
        },
        headers,
      );
      const createdLog = response.data?.data?.log as CommLog | undefined;
      if (createdLog) setLogs((current) => upsertLog(current, createdLog));
      setSmsBody("");
      await ensureContacted();
      toast.success(
        responseMessage(
          response,
          capabilities.sms.mode === "simulation"
            ? "SMS saved in simulation mode"
            : "SMS sent",
        ),
      );
    } catch (error) {
      toast.error(errorMessage(error, "SMS could not be processed"));
    } finally {
      setComposerBusy(false);
    }
  };

  const sendEmail = async () => {
    if (!selectedLeadId || !emailBody.trim() || !selectedEmail) return;
    setComposerBusy(true);

    try {
      const headers = await getHeaders();
      const response = await apiClient.post(
        "/api/appointments/dashboard/communications/email",
        {
          leadId: selectedLeadId,
          to: selectedEmail,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
        },
        headers,
      );
      const createdLog = response.data?.data?.log as CommLog | undefined;
      if (createdLog) setLogs((current) => upsertLog(current, createdLog));
      setEmailBody("");
      await ensureContacted();
      toast.success(responseMessage(response, "Email sent"));
    } catch (error) {
      toast.error(errorMessage(error, "Email could not be sent"));
    } finally {
      setComposerBusy(false);
    }
  };

  const submitComposer = () => {
    if (composerMode === "sms") {
      void sendSms();
      return;
    }
    void sendEmail();
  };

  const saveContact = async () => {
    if (!selectedLeadId) return;
    if (!contactDraft.firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    setContactSaveBusy(true);
    try {
      const headers = await getHeaders();
      const response = await apiClient.patch(
        `/api/leads/${selectedLeadId}/contact`,
        {
          firstName: contactDraft.firstName.trim(),
          lastName: contactDraft.lastName.trim(),
          email: contactDraft.email.trim(),
          phone: contactDraft.phone.trim(),
        },
        headers,
      );
      const updatedLead = unwrapLead(response);
      if (updatedLead?._id) setSelectedLead(updatedLead);
      setEditContact(false);
      await refetchLeads();
      toast.success("Contact information updated");
    } catch (error) {
      toast.error(errorMessage(error, "Contact information could not be updated"));
    } finally {
      setContactSaveBusy(false);
    }
  };

  const saveCustomerOverview = async () => {
    if (!selectedLeadId) return;
    setCustomerOverviewSaveBusy(true);

    try {
      const headers = await getHeaders();
      const response = await apiClient.patch(
        `/api/leads/${selectedLeadId}/details`,
        {
          source: customerOverviewDraft.source.trim(),
          vehicle: {
            year: customerOverviewDraft.vehicleYear.trim(),
            make: customerOverviewDraft.vehicleMake.trim(),
            model: customerOverviewDraft.vehicleModel.trim(),
          },
        },
        headers,
      );

      const updatedLead = unwrapLead(response);
      if (updatedLead?._id) setSelectedLead(updatedLead);
      setEditingCustomerOverview(false);
      await refetchLeads();
      toast.success("Customer and vehicle overview updated");
    } catch (error) {
      toast.error(errorMessage(error, "Customer and vehicle overview could not be updated"));
      throw error;
    } finally {
      setCustomerOverviewSaveBusy(false);
    }
  };

  const logCall = async () => {
    if (!selectedLeadId) return;
    setCallBusy(true);

    try {
      const headers = await getHeaders();
      const response = await apiClient.post(
        "/api/appointments/dashboard/communications/calls",
        {
          leadId: selectedLeadId,
          direction: callDirection,
          status: callStatus,
          to: selectedLead?.phone,
          durationSeconds: callDuration,
          notes: callNotes.trim(),
        },
        headers,
      );
      const createdLog = response.data?.data?.log as CommLog | undefined;
      if (createdLog) setLogs((current) => upsertLog(current, createdLog));
      if (callDirection === "outbound" && callStatus === "completed") {
        await ensureContacted();
      }
      setCallNotes("");
      setCallDialogOpen(false);
      setDetailsTab("activity");
      toast.success(responseMessage(response, "Call interaction logged"));
    } catch (error) {
      toast.error(errorMessage(error, "Call interaction could not be logged"));
    } finally {
      setCallBusy(false);
    }
  };

  const addInboundSimulation = async () => {
    if (!selectedLeadId || !inboundBody.trim()) return;
    setInboundBusy(true);

    try {
      const headers = await getHeaders();
      const response = await apiClient.post(
        "/api/appointments/dashboard/communications/sms/inbound",
        {
          leadId: selectedLeadId,
          from: selectedLead?.phone,
          body: inboundBody.trim(),
        },
        headers,
      );
      const createdLog = response.data?.data?.log as CommLog | undefined;
      if (createdLog) setLogs((current) => upsertLog(current, createdLog));
      setInboundBody("");
      setInboundDialogOpen(false);
      toast.success(responseMessage(response, "Inbound simulation added"));
    } catch (error) {
      toast.error(errorMessage(error, "Inbound message could not be added"));
    } finally {
      setInboundBusy(false);
    }
  };

  const markContacted = async () => {
    if (!selectedLeadId || selectedLead?.status === "Contacted") return;
    setContactBusy(true);

    try {
      const result = await updateLeadStatus({
        id: selectedLeadId,
        status: "Contacted",
      });
      const updatedLead = unwrapLead({ data: result });
      setSelectedLead((current) =>
        updatedLead?._id
          ? updatedLead
          : current
            ? { ...current, status: "Contacted" }
            : current,
      );
      toast.success("Lead marked as contacted");
    } catch (error) {
      toast.error(errorMessage(error, "Lead status could not be updated"));
    } finally {
      setContactBusy(false);
    }
  };

  const resizeComposerTextarea = React.useCallback(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) return;

    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
    const minimumHeight = lineHeight * 2 + 18;
    const maximumHeight = Math.min(
      Math.max(window.innerHeight * 0.34, 150),
      300,
    );

    textarea.style.height = "auto";

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, minimumHeight),
      maximumHeight,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maximumHeight ? "auto" : "hidden";
  }, []);

  const switchComposerMode = React.useCallback(
    (mode: ComposerMode) => {
      setComposerMode(mode);

      // Preserve the SMS and email drafts independently, keep the details panel
      // open, and focus the active composer after its channel-specific fields
      // have rendered. Two animation frames avoid a visible height jump.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          resizeComposerTextarea();
          composerTextareaRef.current?.focus({ preventScroll: true });
        });
      });
    },
    [resizeComposerTextarea],
  );

  React.useLayoutEffect(() => {
    resizeComposerTextarea();
  }, [composerMode, emailBody, resizeComposerTextarea, smsBody]);

  React.useEffect(() => {
    const handleResize = () => resizeComposerTextarea();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resizeComposerTextarea]);

  const workspaceContacts = React.useMemo(
    () => leads.map(communicationLeadToContact),
    [leads],
  );

  const workspaceActivities = React.useMemo(
    () => (selectedLead ? communicationActivities(selectedLead, logs) : []),
    [logs, selectedLead],
  );

  const workspaceDetailSections = React.useMemo(
    () => (selectedLead ? communicationDetailSections(selectedLead, logs.length) : []),
    [logs.length, selectedLead],
  );

  const [openSharedNoteSignal, setOpenSharedNoteSignal] = React.useState(0);

  const workspaceQuickActions = React.useMemo(
    () =>
      selectedLead
        ? communicationQuickActions({
            onCall: () => setCallDialogOpen(true),
            onEmail: () => switchComposerMode("email"),
            onSms: () => switchComposerMode("sms"),
            onNote: () => {
              setDetailsTab("activity");
              setShowDetails(true);
              setOpenSharedNoteSignal((value) => value + 1);
            },
            onMarkContacted: () => void markContacted(),
            hasPhone: Boolean(selectedLead.phone),
            hasEmail: Boolean(selectedEmail),
            contacted: selectedLead.status === "Contacted",
            activeChannel: composerMode,
          })
        : [],
    [composerMode, selectedEmail, selectedLead, switchComposerMode],
  );

  const communicationAvailabilityLabel =
    capabilities.sms.mode === "simulation"
      ? "SMS simulation · Email live · Call logging"
      : "SMS live · Email live · Call logging";

  const showLeadsPanel = !selectedLead || viewportMode === "wide";
  const showConversationPanel = Boolean(selectedLead) || viewportMode === "wide";
  const showDetailsPanel = Boolean(selectedLead) && showDetails;
  const composerText = composerMode === "sms" ? smsBody : emailBody;
  const smsSegments = smsBody.length > 0 ? Math.ceil(smsBody.length / 160) : 0;

  return (
    <div
      className="cw-module-shell flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-(--bg-base) text-(--text-primary)"
      data-viewport-mode={viewportMode}
      data-has-selected-lead={selectedLead ? "true" : "false"}
      data-autrix-open={isAutrixOpen ? "true" : "false"}
    >
      <header
        className={cn(
          "ss4-topbar shrink-0",
          selectedLead && "hidden lg:block",
        )}
      >
        <div className="flex min-h-12 items-center justify-between gap-2 px-3 py-2 sm:min-h-13 sm:gap-3 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="ss4-logo-mark flex h-8 w-8 shrink-0 items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1
                  className="ss4-display truncate font-bold leading-tight tracking-tight"
                  style={{ fontSize: 15, color: "var(--text-primary)" }}
                >
                  Communication Hub
                </h1>

                {total > 0 ? (
                  <span
                    className="ss4-badge inline-flex shrink-0 items-center tabular-nums"
                    style={{ borderRadius: 10 }}
                  >
                    {total}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsHubSummaryExpanded((expanded) => !expanded)
                }
                className="mt-0.5 flex max-w-full items-center gap-1.5 text-left sm:hidden"
                aria-expanded={isHubSummaryExpanded}
                aria-label="Show communication availability"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
                <span
                  className="truncate text-[10px] font-medium"
                  style={{ color: "var(--accent-text)" }}
                >
                  Unified communication
                </span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform",
                    isHubSummaryExpanded && "rotate-180",
                  )}
                  style={{ color: "var(--text-tertiary)" }}
                />
              </button>

              <div className="mt-0.5 hidden min-w-0 items-center gap-1.5 sm:flex">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
                <span
                  className="truncate text-[10px] font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {communicationAvailabilityLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => {
                void refetchLeads();
                void loadLogs(true);
              }}
              disabled={leadsFetching || loadingLogs}
              className="ss4-pill-btn flex h-8 w-8 items-center justify-center p-0 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-auto sm:gap-1.5 sm:px-2.5"
              title="Refresh communications"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 sm:h-3 sm:w-3",
                  (leadsFetching || loadingLogs) && "animate-spin",
                )}
              />
              <span className="hidden sm:inline">
                {leadsFetching || loadingLogs ? "Refreshing…" : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="ss4-theme-btn flex h-8 w-8 shrink-0 items-center justify-center sm:h-7 sm:w-7"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="shrink-0 max-[380px]:origin-right max-[380px]:scale-90">
              <SupraLeoAI
                variant="toolbar"
                onOpenChange={setIsAutrixOpen}
              />
            </div>
          </div>
        </div>

        {isHubSummaryExpanded ? (
          <div
            className="border-t px-3 py-2 sm:hidden"
            style={{
              borderColor: "var(--border-1)",
              background: "var(--bg-elevated)",
            }}
          >
            <div className="flex min-w-0 items-start gap-2">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              <p
                className="min-w-0 break-words text-[11px] leading-relaxed [overflow-wrap:anywhere]"
                style={{ color: "var(--text-secondary)" }}
              >
                {communicationAvailabilityLabel}
              </p>
            </div>
          </div>
        ) : null}
      </header>

      <ConversationWorkspace
        viewportMode={viewportMode}
        hasSelection={Boolean(selectedLead)}
        detailsExpanded={showDetails}
      >
        {showLeadsPanel && (
          <div className="cw-list-slot min-h-0 min-w-0 shrink-0">
            <ConversationListPanel
              title="Inquiries & Leads"
              subtitle="SuprahAI Communication Hub"
              contacts={workspaceContacts}
              selectedContactId={selectedLeadId}
              isLoading={leadsLoading}
              isFetching={leadsFetching}
              total={total}
              searchQuery={leadSearch}
              onSearchChange={setLeadSearch}
              onContactSelect={(contact: WorkspaceContact) => {
                const lead = (contact.raw as Lead | undefined) ||
                  leads.find((item) => item._id === contact.id);
                if (lead) selectLead(lead);
              }}
              emptyLabel="No matching leads"
              searchPlaceholder="Search name, phone, email…"
              headerAction={
                <button
                  type="button"
                  onClick={() => {
                    void refetchLeads();
                    void loadLogs(true);
                  }}
                  className="ss4-icon-btn h-9 w-9"
                  title="Refresh conversations"
                  aria-label="Refresh conversations"
                >
                  <RefreshCw
                    className={cn(
                      "h-3.5 w-3.5",
                      (loadingLogs || leadsFetching) && "animate-spin",
                    )}
                  />
                </button>
              }
              topContent={
                <div
                  className="grid shrink-0 grid-cols-2 gap-1.5 border-b px-2 py-2 sm:gap-2 sm:px-3 sm:py-3"
                  style={{
                    borderColor: "var(--border-1)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <label className="relative min-w-0">
                    <Filter
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 sm:left-3"
                      style={{ color: "var(--text-tertiary)" }}
                    />

                    <select
                      value={statusFilter ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStatusFilter(value === "" ? null : value);
                        setSelectedLead(null);
                        setShowDetails(false);
                      }}
                      className="h-8 w-full appearance-none rounded-lg pl-8 pr-7 text-[11px] font-medium outline-none sm:h-9 sm:pl-9 sm:pr-8 sm:text-xs"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                      }}
                      aria-label="Filter communications by lead status"
                    >
                      {COMMUNICATION_STATUS_FILTERS.map((option) => (
                        <option key={option.value || "all"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 sm:right-2.5"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </label>

                  <label className="relative min-w-0">
                    <ArrowUpDown
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 sm:left-3"
                      style={{ color: "var(--text-tertiary)" }}
                    />

                    <select
                      value={sortBy}
                      onChange={(event) =>
                        setSortBy(event.target.value as LeadSortOption)
                      }
                      className="h-8 w-full appearance-none rounded-lg pl-8 pr-7 text-[11px] font-medium outline-none sm:h-9 sm:pl-9 sm:pr-8 sm:text-xs"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                      }}
                      aria-label="Sort communication contacts"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="waiting_longest">Longest waiting</option>
                    </select>

                    <ChevronDown
                      className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 sm:right-2.5"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </label>
                </div>
              }
            />
          </div>
        )}

        {showConversationPanel && (
          <main
            className="cw-center-slot relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--bg-base)"
            onMouseEnter={() => setIsChatHovered(true)}
            onMouseLeave={() => setIsChatHovered(false)}
          >
            {selectedLead && viewportMode !== "wide" && (
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="absolute left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-(--border-2) bg-(--bg-elevated) shadow-sm hover:bg-(--bg-hover)"
                aria-label="Back to lead list"
                title="Back to lead list"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            {selectedLead && !showDetails && (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-(--border-2) bg-(--bg-elevated) shadow-sm hover:bg-(--bg-hover)"
                aria-label="Show activity and details"
                title="Show activity and details"
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            )}

            {selectedLead && !isChatHovered ? (
              <ConversationHeader
                contact={communicationLeadToContact(
                  selectedLead,
                )}
                status={selectedLead.status}
                leadingInset={
                  viewportMode !== "wide"
                }
                trailingInset={!showDetails}
                meta={[
                  selectedLead.source ||
                    "Communication Hub",
                  capabilities.sms.mode ===
                  "simulation"
                    ? "SMS simulation active"
                    : "Live messaging",
                ]}
              />
            ) : null}

            <section
              ref={messageAreaRef}
              className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5"
            >
              {!selectedLead ? (
                <WorkspaceEmptyState
                  title="Select a lead to start"
                  description="Choose a lead from the conversation list to review SMS, email, calls, internal notes, and complete communication history."
                  sourceLabel="SuprahAI Communication Hub · SMS · Email · Call logging"
                  actions={[
                    {
                      id: "review-new",
                      label: "Review new leads",
                      description:
                        "Open fresh leads that may need a response.",
                      icon: Inbox,
                      onClick: () => {
                        setLeadSearch("");
                        setStatusFilter("New");
                        setSortBy("newest");
                      },
                    },
                    {
                      id: "browse-all",
                      label: "Browse all leads",
                      description:
                        "Clear filters and browse every available conversation.",
                      icon: Search,
                      onClick: () => {
                        setLeadSearch("");
                        setStatusFilter(null);
                        setSortBy("newest");
                      },
                    },
                    {
                      id: "refresh",
                      label: "Refresh conversations",
                      description:
                        "Load the latest customer communication activity.",
                      icon: RefreshCw,
                      onClick: () => {
                        void refetchLeads();
                      },
                    },
                  ]}
                  recentContacts={leads
                    .slice(0, 3)
                    .map((lead) => ({
                      id: lead._id,
                      firstName: lead.firstName,
                      lastName: lead.lastName,
                      name:
                        [lead.firstName, lead.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                        lead.senderName ||
                        lead.email ||
                        "Unknown lead",
                      secondary:
                        lead.phone ||
                        lead.email ||
                        lead.subject ||
                        "No contact information",
                      status: lead.status,
                    }))}
                  onContactSelect={(leadId) => {
                    const lead = leads.find(
                      (item) => item._id === leadId,
                    );

                    if (lead) {
                      selectLead(lead);
                    }
                  }}
                  footerTitle="Autrix is standing by"
                  footerDescription="Select a lead to give Autrix the correct customer context for communication summaries, response drafts, and follow-up suggestions."
                />
              ) : loadingSelectedLead || (loadingLogs && logs.length === 0) ? (
                <div className="flex h-full min-h-80 items-center justify-center gap-2 text-sm text-(--text-tertiary)">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading conversation...
                </div>
              ) : logs.length === 0 ? (
                <div className="flex h-full min-h-80 flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold">Start the conversation</p>
                  <p className="mt-1 max-w-sm text-xs text-(--text-tertiary)">
                    Use SMS simulation, send an email, or record a call
                    interaction.
                  </p>
                </div>
              ) : (
                <div className="mx-auto flex min-w-0 w-full max-w-3xl flex-col gap-3 overflow-x-hidden">
                  {[...logs]
                    .sort(
                      (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime(),
                    )
                    .map((log) => {
                      const Icon = channelIcon(log);
                      const outbound = log.direction === "outbound";
                      const simulation = log.metadata?.mode === "simulation";

                      return (
                        <div
                          key={log._id}
                          className={cn(
                            "flex min-w-0",
                            outbound ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "min-w-0 max-w-[88%] overflow-hidden rounded-2xl border px-3 py-2.5 shadow-sm sm:max-w-[76%]",
                              outbound
                                ? "rounded-br-md border-emerald-500/25 bg-emerald-500/10"
                                : "rounded-bl-md border-(--border-1) bg-(--bg-elevated)",
                              log.status === "failed" &&
                                "border-red-500/40 bg-red-500/10",
                            )}
                          >
                            <div className="mb-1.5 flex min-w-0 items-start justify-between gap-3 text-[10px] uppercase tracking-wide text-(--text-tertiary)">
                              <div className="flex min-w-0 items-center gap-1.5 font-semibold">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="shrink-0">{log.channel}</span>
                                {log.channel === "email" &&
                                  log.metadata?.subject && (
                                    <span className="min-w-0 truncate normal-case tracking-normal">
                                      · {log.metadata.subject}
                                    </span>
                                  )}
                              </div>
                              <span className="shrink-0 normal-case tracking-normal">
                                {formatTime(log.createdAt)}
                              </span>
                            </div>

                            {log.body && (
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                                {log.body}
                              </p>
                            )}

                            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-(--text-tertiary)">
                              <span
                                className={cn(
                                  "max-w-full break-words rounded-full border px-2 py-0.5 [overflow-wrap:anywhere]",
                                  simulation
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : log.status === "failed"
                                      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300"
                                      : "border-(--border-1)",
                                )}
                              >
                                {statusLabel(log)}
                              </span>
                              {log.durationSeconds !== undefined && (
                                <span className="shrink-0">
                                  {formatDuration(log.durationSeconds)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            {selectedLead && (
              <footer
                className="suprah-reply-section shrink-0 px-2 py-2 sm:px-4"
                style={{
                  borderTop: "1px solid var(--border-1)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div className="min-w-0 w-full">
                  <div
                    className={cn(
                      "mb-2 flex min-h-9 min-w-0 select-none items-center gap-2 rounded-lg border px-3 py-2 text-[11px] transition-colors duration-150",
                      composerMode === "sms" && capabilities.sms.mode === "simulation"
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                        : "border-(--border-1) bg-(--bg-subtle) text-(--text-secondary)",
                    )}
                  >
                    {composerMode === "sms" ? (
                      capabilities.sms.mode === "simulation" ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      )
                    ) : (
                      <Mail className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                    <span className="min-w-0 truncate">
                      {composerMode === "sms"
                        ? capabilities.sms.mode === "simulation"
                          ? "SMS simulation is active. Messages are logged but are not sent until Twilio is connected."
                          : `Sending SMS to ${selectedLead.phone || "no phone number"}`
                        : `Sending email to ${selectedEmail || "no email address"}`}
                    </span>
                  </div>

                  <div className="ss4-input-wrap relative min-w-0 overflow-visible transition-colors duration-150">
                    <div
                      className="flex min-h-10 min-w-0 select-none items-center border-b px-3 sm:px-4"
                      style={{ borderColor: "var(--border-1)" }}
                    >
                      {composerMode === "email" ? (
                        <input
                          value={emailSubject}
                          onChange={(event) => setEmailSubject(event.target.value)}
                          placeholder="Email subject"
                          disabled={!selectedEmail}
                          className="suprah-composer-field suprah-composer-subject h-10 w-full min-w-0 border-b bg-transparent px-3 text-sm font-medium outline-none disabled:opacity-50 sm:px-4"
                        />
                      ) : (
                        <div className="flex min-w-0 items-center gap-2 text-xs text-(--text-secondary)">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span className="shrink-0 font-medium">SMS to</span>
                          <span className="min-w-0 truncate">{selectedLead.phone || "No phone number"}</span>
                        </div>
                      )}
                    </div>

                    <textarea
                      ref={composerTextareaRef}
                      value={composerMode === "sms" ? smsBody : emailBody}
                      onChange={(event) => {
                        if (composerMode === "sms") {
                          setSmsBody(event.target.value);
                        } else {
                          setEmailBody(event.target.value);
                        }
                        window.requestAnimationFrame(
                          resizeComposerTextarea,
                        );
                      }}
                      placeholder={
                        composerMode === "sms"
                          ? selectedLead.phone
                            ? "Write a message…"
                            : "This lead has no phone number"
                          : selectedEmail
                            ? "Write an email…"
                            : "This lead has no email address"
                      }
                      disabled={
                        composerMode === "sms"
                          ? !selectedLead.phone
                          : !selectedEmail
                      }
                      rows={2}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          (event.ctrlKey || event.metaKey)
                        ) {
                          event.preventDefault();
                          submitComposer();
                        }
                      }}
                      className="suprah-composer-field suprah-composer-message suprah-reply-textarea block w-full min-w-0 resize-none bg-transparent px-3 pb-2 pt-3 text-sm leading-snug outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                      style={{
                        minHeight: 56,
                        maxHeight: "34vh",
                        color: "var(--text-primary)",
                        overflowY: "hidden",
                      }}
                    />

                    <div
                      className="grid select-none grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-2 sm:flex sm:flex-wrap sm:items-center"
                      style={{
                        borderTop: "1px solid var(--border-1)",
                      }}
                    >
                      <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-1 sm:flex-wrap sm:items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="ss4-pill-btn flex h-9 min-w-0 items-center justify-center gap-1.5 px-2 text-[11px] font-medium sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                            >
                              {composerMode === "sms" ? (
                                <MessageSquare className="h-3 w-3" />
                              ) : (
                                <Mail className="h-3 w-3" />
                              )}
                              {composerMode === "sms" ? "SMS" : "Email"}
                              <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                            </button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="start"
                            className="z-80 min-w-36 rounded-xl border border-border bg-popover p-1 shadow-lg"
                          >
                            <DropdownMenuItem
                              onClick={() => switchComposerMode("sms")}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              SMS
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => switchComposerMode("email")}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {composerMode === "sms" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="ss4-pill-btn flex h-9 min-w-0 items-center justify-center gap-1.5 px-2 text-[11px] font-medium sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                              >
                                <LayoutTemplate className="h-3 w-3" />
                                Templates
                                <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                              </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="start"
                              className="z-80 min-w-52 rounded-xl border border-border bg-popover p-1 shadow-lg"
                            >
                              {SMS_TEMPLATES.map((template) => (
                                <DropdownMenuItem
                                  key={template.label}
                                  onClick={() =>
                                    setSmsBody(
                                      template.text(selectedLead),
                                    )
                                  }
                                  className="cursor-pointer rounded-lg px-2.5 py-2 text-xs"
                                >
                                  {template.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCallDialogOpen(true)}
                            className="ss4-pill-btn flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[11px] font-medium sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                          >
                            <Phone className="h-3 w-3" />
                            Log call
                          </button>
                        )}

                        {composerMode === "sms" ? (
                          <button
                            type="button"
                            onClick={() => setCallDialogOpen(true)}
                            className="ss4-pill-btn flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[11px] font-medium sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                          >
                            <Phone className="h-3 w-3" />
                            Log call
                          </button>
                        ) : null}

                        {capabilities.sms.mode === "simulation" ? (
                          <button
                            type="button"
                            onClick={() => setInboundDialogOpen(true)}
                            className="flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[11px] font-medium text-amber-700 transition-all hover:bg-amber-500/10 dark:text-amber-300 sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                          >
                            <PhoneIncoming className="h-3 w-3" />
                            Inbound test
                          </button>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-2 self-stretch sm:ml-auto sm:self-auto">
                        <span
                          className="hidden max-w-44 truncate text-[10px] md:block"
                          style={{ color: "var(--text-tertiary)" }}
                          title={
                            composerMode === "sms"
                              ? `${smsBody.length} characters · ${smsSegments} segments`
                              : `Sending to ${selectedEmail || "no email"}`
                          }
                        >
                          {composerMode === "sms"
                            ? `${smsBody.length} chars · ${smsSegments} ${
                                smsSegments === 1 ? "segment" : "segments"
                              }`
                            : selectedEmail || "No email"}
                        </span>

                        <button
                          type="button"
                          onClick={submitComposer}
                          disabled={
                            composerBusy ||
                            !composerText.trim() ||
                            (composerMode === "sms" &&
                              !selectedLead.phone) ||
                            (composerMode === "email" &&
                              !selectedEmail)
                          }
                          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:h-7"
                          style={{
                            background: "var(--accent)",
                            color: "#ffffff",
                          }}
                          title={
                            composerMode === "sms" &&
                            capabilities.sms.mode === "simulation"
                              ? "Log simulated SMS"
                              : composerMode === "sms"
                                ? "Send SMS"
                                : "Send email"
                          }
                          aria-label={
                            composerMode === "sms" &&
                            capabilities.sms.mode === "simulation"
                              ? "Log simulated SMS"
                              : composerMode === "sms"
                                ? "Send SMS"
                                : "Send email"
                          }
                        >
                          <Send className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {composerBusy
                              ? "Working…"
                              : composerMode === "sms"
                                ? capabilities.sms.mode === "simulation"
                                  ? "Log SMS"
                                  : "Send SMS"
                                : "Send"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </footer>
            )}
          </main>
        )}

        {showDetailsPanel && selectedLead && (
          <div
            className={cn(
              "cw-details-slot min-h-0 min-w-0 shrink-0",
              viewportMode === "narrow" && "cw-details-overlay",
            )}
          >
            <ContactDetailsPanel
              contact={communicationLeadToContact(selectedLead)}
              contactTypeLabel="Contact type: Lead"
              summary={
                selectedLead.aiSummary ||
                `Unified communication history for ${fullName(selectedLead)}. Review SMS, email, calls, internal notes, and status activity in one workspace.`
              }
              quickActions={workspaceQuickActions}
              detailSections={workspaceDetailSections}
              activities={workspaceActivities}
              activitySubtitle="Notes, calls, status changes, SMS, and email"
              detailsTab={detailsTab}
              onDetailsTabChange={setDetailsTab}
              onClose={() => setShowDetails(false)}
              status={selectedLead.status}
              statusOptions={[
                { value: "New", label: "New" },
                { value: "Pending", label: "Pending" },
                { value: "Contacted", label: "Contacted" },
                { value: "Appointment Set", label: "Appointment Set" },
              ]}
              onStatusChange={(status) => {
                void (async () => {
                  try {
                    const result = await updateLeadStatus({
                      id: selectedLead._id,
                      status,
                    });
                    const updatedLead = unwrapLead({ data: result });
                    setSelectedLead((current) =>
                      updatedLead?._id
                        ? updatedLead
                        : current
                          ? { ...current, status: status as Lead["status"] }
                          : current,
                    );
                    toast.success(`Marked as ${status}`);
                  } catch (error) {
                    toast.error(errorMessage(error, "Lead status could not be updated"));
                  }
                })();
              }}
              onAddNote={async (note) => {
                setNoteBusy(true);
                try {
                  const response = await addLeadNote({ id: selectedLead._id, note });
                  const updatedLead = unwrapLead({ data: response });
                  if (updatedLead?._id) setSelectedLead(updatedLead);
                  else await fetchSelectedLead(selectedLead._id, selectedLead);
                  setDetailsTab("activity");
                  toast.success("Internal note added");
                } catch (error) {
                  toast.error(errorMessage(error, "Internal note could not be added"));
                  throw error;
                } finally {
                  setNoteBusy(false);
                              }
              }}
              isSavingNote={noteBusy}
              openNoteSignal={openSharedNoteSignal}
              sectionEditors={{
                context: {
                  isEditing: editingCustomerOverview,
                  onEdit: () => setEditingCustomerOverview(true),
                  onCancel: () => {
                    setCustomerOverviewDraft({
                      source: selectedLead.source || "",
                      vehicleYear: selectedLead.vehicle?.year || "",
                      vehicleMake: selectedLead.vehicle?.make || "",
                      vehicleModel: selectedLead.vehicle?.model || "",
                    });
                    setEditingCustomerOverview(false);
                  },
                  content: (
                    <div className="space-y-2">
                      <input
                        value={customerOverviewDraft.source}
                        onChange={(event) =>
                          setCustomerOverviewDraft((current) => ({
                            ...current,
                            source: event.target.value,
                          }))
                        }
                        placeholder="Lead source"
                        className="h-9 w-full rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none focus:border-emerald-500/60"
                        style={{ borderColor: "var(--border-1)" }}
                      />
                      <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-2">
                        <input value={customerOverviewDraft.vehicleYear} onChange={(event) => setCustomerOverviewDraft((current) => ({ ...current, vehicleYear: event.target.value }))} placeholder="Year" className="h-9 min-w-0 rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none focus:border-emerald-500/60" style={{ borderColor: "var(--border-1)" }} />
                        <input value={customerOverviewDraft.vehicleMake} onChange={(event) => setCustomerOverviewDraft((current) => ({ ...current, vehicleMake: event.target.value }))} placeholder="Make" className="h-9 min-w-0 rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none focus:border-emerald-500/60" style={{ borderColor: "var(--border-1)" }} />
                        <input value={customerOverviewDraft.vehicleModel} onChange={(event) => setCustomerOverviewDraft((current) => ({ ...current, vehicleModel: event.target.value }))} placeholder="Model" className="h-9 min-w-0 rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none focus:border-emerald-500/60" style={{ borderColor: "var(--border-1)" }} />
                      </div>
                      <p className="text-[10px] leading-relaxed text-(--text-tertiary)">Conversation event count is system-generated and cannot be edited.</p>
                      <button
                        type="button"
                        onClick={() => void saveCustomerOverview()}
                        disabled={customerOverviewSaveBusy}
                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-xs font-semibold text-white disabled:opacity-45"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {customerOverviewSaveBusy ? "Saving…" : "Save customer & vehicle overview"}
                      </button>
                    </div>
                  ),
                },
              }}
              contactEditor={{
                value: contactDraft,
                onChange: setContactDraft,
                onSave: saveContact,
                isSaving: contactSaveBusy,
              }}
            />
          </div>
        )}
      </ConversationWorkspace>

      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-(--border-1) bg-(--bg-elevated) px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-sky-500" />
              Record call interaction
            </DialogTitle>
            <p className="text-xs text-(--text-tertiary)">
              Voice calling is not connected yet. This records the call in the
              shared customer history.
            </p>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={callDirection}
                onValueChange={(value) =>
                  setCallDirection(value as CommDirection)
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-80">
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-80">
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-(--text-secondary)">
                Duration in seconds
              </label>
              <input
                type="number"
                min={0}
                value={callDuration}
                onChange={(event) =>
                  setCallDuration(Math.max(0, Number(event.target.value) || 0))
                }
                className="h-9 w-full rounded-md border border-(--border-1) bg-(--input-bg) px-3 text-sm"
              />
            </div>

            <textarea
              value={callNotes}
              onChange={(event) => setCallNotes(event.target.value)}
              placeholder="Call notes or outcome..."
              className="min-h-28 w-full resize-none rounded-md border border-(--border-1) bg-(--input-bg) p-3 text-sm"
            />

            <div className="flex justify-end">
              <button
                onClick={() => void logCall()}
                disabled={callBusy || !selectedLeadId}
                className="h-9 rounded-md bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-45"
              >
                {callBusy ? "Saving..." : "Save call record"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inboundDialogOpen} onOpenChange={setInboundDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-(--border-1) bg-(--bg-elevated) px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              Add inbound SMS simulation
            </DialogTitle>
            <p className="text-xs text-(--text-tertiary)">
              Use this only for testing until inbound Twilio webhooks are
              connected.
            </p>
          </DialogHeader>
          <div className="space-y-4 p-5">
            <textarea
              value={inboundBody}
              onChange={(event) => setInboundBody(event.target.value)}
              placeholder="Enter the simulated customer reply..."
              className="min-h-32 w-full resize-none rounded-md border border-(--border-1) bg-(--input-bg) p-3 text-sm"
            />
            <div className="flex justify-end">
              <button
                onClick={() => void addInboundSimulation()}
                disabled={inboundBusy || !inboundBody.trim() || !selectedLeadId}
                className="h-9 rounded-md bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-45"
              >
                {inboundBusy ? "Adding..." : "Add to conversation"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CommunicationHub;