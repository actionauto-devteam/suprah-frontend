"use client";

import * as React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  History,
  IdCard,
  Info,
  Loader2,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DriverTrackingItem } from "@/types/driver-tracking";

interface DriverReviewAccess {
  level:
    | "ADMIN_REVIEW"
    | "DISPATCH_ACTIVE_LOAD"
    | "DISPATCH_LIMITED"
    | "OPERATIONAL_ONLY"
    | "NONE";
  canOpenReviewCenter: boolean;
  canReviewDocuments: boolean;
  canViewDocumentContents: boolean;
  canViewReviewHistory: boolean;
  canFinalizeVerification: boolean;
  hasActiveLoadRelationship: boolean;
  reason?: string;
  activeLoads?: Array<{
    id: string;
    loadNumber?: string;
    status?: string;
  }>;
}

interface DriverReviewDocument {
  _id?: string;
  type?: string;
  label?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  expiresAt?: string;
  verified?: boolean;
  reviewStatus?: "pending" | "approved" | "rejected";
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  fileAvailable?: boolean;
  fileEndpoint?: string;
}

interface CredentialFact {
  review?: {
    status?: "missing" | "pending" | "approved" | "rejected";
    expiresAt?: string | null;
  };
  state?: string;
  provider?: string;
  expiresAt?: string | null;
}

interface DriverReviewEvent {
  _id?: string;
  actorName?: string;
  actorRole?: string;
  action?: string;
  targetType?: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  organizationId?: string;
  loadNumber?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

interface DriverReviewProfile {
  access?: DriverReviewAccess;
  driver?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string | null;
  };
  verificationStatus?:
    | "unverified"
    | "pending"
    | "in_progress"
    | "under_review"
    | "verified";
  operationalStatus?: "active" | "on_leave" | "maintenance" | string;
  profileCompletionScore?: number;
  isComplianceExpired?: boolean;
  complianceState?: "valid" | "expiring_soon" | "needs_attention";
  complianceSummary?: {
    uploadedCount?: number;
    totalRequired?: number;
    percentage?: number;
    missingTypes?: string[];
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  information?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    ssnLast4?: string;
    backgroundCheckConsent?: boolean;
    backgroundCheckConsentDate?: string | null;
  };
  agreement?: {
    accepted?: boolean;
    acceptedAt?: string | null;
  };
  credentialFacts?: {
    cdl?: CredentialFact;
    medicalCard?: CredentialFact;
    insurance?: CredentialFact;
  };
  credentials?: {
    driversLicenseNumber?: string;
    licenseState?: string;
    licenseExpirationDate?: string | null;
    medicalCardExpirationDate?: string | null;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    insuranceExpirationDate?: string | null;
    dotNumber?: string;
    mcNumber?: string;
  };
  equipment?: {
    trailerType?: string;
    customTrailerName?: string;
    maxVehicleCapacity?: number;
    truckMake?: string;
    truckModel?: string;
    truckYear?: number;
    truckColor?: string;
    vin?: string;
    plateNumber?: string;
    gvwr?: number;
    engineType?: string;
    trailerMake?: string;
    trailerModel?: string;
    trailerYear?: number;
    trailerLength?: number;
    trailerAxles?: number;
    trailerGvwr?: number;
    hitchType?: string;
    specialFeatures?: string[];
  };
  logistics?: {
    serviceRadius?: number | null;
    preferredRoutes?: string[];
    availableDays?: string[];
    homeBase?: {
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
  complianceWarnings?: string[];
  documents?: DriverReviewDocument[];
  eligibility?: {
    eligible?: boolean;
    blockers?: string[];
    checks?: {
      informationComplete?: boolean;
      requiredDocumentsApproved?: boolean;
      agreementAccepted?: boolean;
      credentialsCurrent?: boolean;
    };
    requiredDocuments?: Array<{
      type: string;
      status: "missing" | "pending" | "approved" | "rejected";
    }>;
  };
  reviewHistory?: DriverReviewEvent[];
  createdAt?: string;
  updatedAt?: string;
}

interface DriverComplianceDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverTrackingItem | null;
}

type ReviewTab =
  | "overview"
  | "information"
  | "documents"
  | "equipment"
  | "history";

const TABS: Array<{
  id: ReviewTab;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "overview", label: "Overview", icon: ShieldCheck },
  { id: "information", label: "Information", icon: UserRound },
  { id: "documents", label: "Documents", icon: FileCheck2 },
  { id: "equipment", label: "Equipment / Compliance", icon: Truck },
  { id: "history", label: "Review History", icon: History },
];

const DOC_LABELS: Record<string, string> = {
  drivers_license: "Commercial Driver's License (CDL)",
  medical_card: "DOT Medical Card",
  insurance_certificate: "Auto Liability Insurance",
  vehicle_registration: "Vehicle Registration",
  dot_inspection: "DOT Inspection",
  w9_form: "W-9 Tax Form",
  operating_authority: "Operating Authority (MC/DOT)",
  cargo_insurance: "Cargo Insurance",
  liability_insurance: "General Liability Insurance",
  other: "Other Document",
};

function formatDocumentType(type?: string) {
  if (!type) return "Document";
  return (
    DOC_LABELS[type] ||
    type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" as const }
      : {}),
  }).format(date);
}

function bytesLabel(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function verificationLabel(status?: DriverReviewProfile["verificationStatus"]) {
  switch (status) {
    case "verified":
      return "Verified";
    case "under_review":
      return "Under Review";
    case "in_progress":
      return "In Progress";
    case "pending":
      return "Pending";
    default:
      return "Unverified";
  }
}

function verificationClass(status?: DriverReviewProfile["verificationStatus"]) {
  switch (status) {
    case "verified":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "under_review":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "in_progress":
    case "pending":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    default:
      return "border-border/60 bg-muted/40 text-muted-foreground";
  }
}

function complianceLabel(state?: DriverReviewProfile["complianceState"]) {
  if (state === "needs_attention") return "Needs Attention";
  if (state === "expiring_soon") return "Expiring Soon";
  return "Valid";
}

function complianceClass(state?: DriverReviewProfile["complianceState"]) {
  if (state === "needs_attention") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (state === "expiring_soon") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function reviewStatusLabel(status?: string) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "missing") return "Missing";
  return "Pending Review";
}

function reviewStatusClass(status?: string) {
  if (status === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "rejected" || status === "missing") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function accessLabel(level?: DriverReviewAccess["level"]) {
  if (level === "ADMIN_REVIEW") return "Administrative Review";
  if (level === "DISPATCH_ACTIVE_LOAD") return "Active Load Access";
  if (level === "DISPATCH_LIMITED") return "Limited Dispatcher View";
  if (level === "OPERATIONAL_ONLY") return "Operational Load Access";
  return "Restricted";
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 break-words text-sm font-semibold">
        {value === undefined || value === null || value === "" ? "Not provided" : value}
      </div>
    </div>
  );
}

function RestrictedPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50">
        <Lock className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-base font-black">Restricted Information</p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

function CredentialCard({
  title,
  fact,
}: {
  title: string;
  fact?: CredentialFact;
}) {
  const status = fact?.review?.status || "missing";
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-black">{title}</p>
        <Badge variant="outline" className={reviewStatusClass(status)}>
          {reviewStatusLabel(status)}
        </Badge>
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        {fact?.state && <p>State: <span className="font-semibold text-foreground">{fact.state}</span></p>}
        {fact?.provider && <p>Provider: <span className="font-semibold text-foreground">{fact.provider}</span></p>}
        <p>
          Expiration: <span className="font-semibold text-foreground">{formatDate(fact?.expiresAt)}</span>
        </p>
      </div>
    </div>
  );
}

export function DriverComplianceDocumentsDialog({
  open,
  onOpenChange,
  driver,
}: DriverComplianceDocumentsDialogProps) {
  const { getToken } = useAuth();
  const [profile, setProfile] = React.useState<DriverReviewProfile | null>(null);
  const [activeTab, setActiveTab] = React.useState<ReviewTab>("overview");
  const [isLoading, setIsLoading] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [accessDenied, setAccessDenied] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [rejectDocument, setRejectDocument] = React.useState<DriverReviewDocument | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [showFinalApprove, setShowFinalApprove] = React.useState(false);

  const [previewDocument, setPreviewDocument] = React.useState<DriverReviewDocument | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewMimeType, setPreviewMimeType] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState("");

  const driverId = driver?.driver?.id ?? driver?.id ?? null;
  const fallbackDriverName = driver?.driver?.name || "Driver";

  const closePreview = React.useCallback(() => {
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return "";
    });
    setPreviewMimeType("");
    setPreviewLoading(false);
    setPreviewError("");
    setPreviewDocument(null);
  }, []);

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const fetchProfile = React.useCallback(async () => {
    if (!driverId) return;
    setIsLoading(true);
    setNotFound(false);
    setAccessDenied("");
    try {
      const token = await getToken();
      if (!token) return;
      const response = await apiClient.get(
        `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/profile`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setProfile(response.data?.data ?? null);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) {
        setNotFound(true);
        setProfile(null);
      } else if (status === 403) {
        setAccessDenied(
          error?.response?.data?.message ||
            "You do not have access to this driver's review information.",
        );
        setProfile(null);
      } else {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Could not load Driver Review Center",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [driverId, getToken]);

  React.useEffect(() => {
    if (!open || !driverId) {
      if (!open) {
        setProfile(null);
        setNotFound(false);
        setAccessDenied("");
        setActiveTab("overview");
        setRejectDocument(null);
        setRejectReason("");
        setShowFinalApprove(false);
        closePreview();
      }
      return;
    }
    void fetchProfile();
  }, [closePreview, driverId, fetchProfile, open]);

  const openPreview = React.useCallback(
    async (document: DriverReviewDocument) => {
      if (!driverId || !document._id) return;
      setPreviewUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return "";
      });
      setPreviewDocument(document);
      setPreviewMimeType(document.mimeType || "");
      setPreviewError("");
      setPreviewLoading(true);
      try {
        const token = await getToken();
        const endpoint =
          document.fileEndpoint ||
          `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/documents/${encodeURIComponent(document._id)}/file`;
        const response = await apiClient.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });
        const contentType =
          String(response.headers?.["content-type"] || "").split(";")[0] ||
          document.mimeType ||
          "application/octet-stream";
        const blob =
          response.data instanceof Blob
            ? response.data
            : new Blob([response.data], { type: contentType });
        setPreviewMimeType(contentType);
        setPreviewUrl(URL.createObjectURL(blob));
      } catch (error: any) {
        setPreviewError(
          error?.response?.data?.message ||
            "This document could not be opened with your current authorization.",
        );
      } finally {
        setPreviewLoading(false);
      }
    },
    [driverId, getToken],
  );

  const approveDocument = async (document: DriverReviewDocument) => {
    if (!driverId || !document._id) return;
    setActionLoading(document._id);
    try {
      const token = await getToken();
      await apiClient.patch(
        `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/documents/${encodeURIComponent(document._id)}/approve`,
        { expectedUploadedAt: document.uploadedAt || undefined },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Document approved");
      await fetchProfile();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to approve document");
    } finally {
      setActionLoading(null);
    }
  };

  const submitRejection = async () => {
    if (!driverId || !rejectDocument?._id) return;
    if (rejectReason.trim().length < 3) {
      toast.error("Enter a rejection reason of at least 3 characters");
      return;
    }
    setActionLoading(rejectDocument._id);
    try {
      const token = await getToken();
      await apiClient.patch(
        `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/documents/${encodeURIComponent(rejectDocument._id)}/reject`,
        {
          reason: rejectReason.trim(),
          expectedUploadedAt: rejectDocument.uploadedAt || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Document rejected");
      setRejectDocument(null);
      setRejectReason("");
      await fetchProfile();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to reject document");
    } finally {
      setActionLoading(null);
    }
  };

  const approveDriver = async () => {
    if (!driverId) return;
    setActionLoading("final-approval");
    try {
      const token = await getToken();
      await apiClient.patch(
        `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/approve`,
        { expectedUpdatedAt: profile?.updatedAt || undefined },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Driver Verification approved");
      setShowFinalApprove(false);
      await fetchProfile();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to complete final approval",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const access = profile?.access;
  const isAdminReview = access?.level === "ADMIN_REVIEW";
  const hasProtectedOperationalAccess =
    access?.level === "DISPATCH_ACTIVE_LOAD" || access?.level === "OPERATIONAL_ONLY";
  const documents = Array.isArray(profile?.documents) ? profile.documents : [];
  const history = Array.isArray(profile?.reviewHistory) ? profile.reviewHistory : [];
  const blockers = profile?.eligibility?.blockers || [];
  const driverName = profile?.driver?.name || fallbackDriverName;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[94dvh] max-w-none flex-col gap-0 overflow-hidden p-0"
          style={{ width: "min(96vw, 78rem)", maxWidth: "min(96vw, 78rem)" }}
        >
          <DialogHeader className="shrink-0 border-b border-border/70 bg-linear-to-b from-emerald-500/[0.07] to-background px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-7">
              <div>
                <DialogTitle className="flex items-center gap-2.5 text-xl font-black sm:text-2xl">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-5" />
                  </span>
                  Driver Review Center
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-relaxed sm:text-base">
                  Permission-aware verification and operational compliance for {driverName}.
                </DialogDescription>
              </div>
              {profile && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={verificationClass(profile.verificationStatus)}>
                    {verificationLabel(profile.verificationStatus)}
                  </Badge>
                  <Badge variant="outline" className={complianceClass(profile.complianceState)}>
                    {complianceLabel(profile.complianceState)}
                  </Badge>
                </div>
              )}
            </div>

            {profile && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs">
                <Shield className="size-3.5 text-emerald-500" />
                <span className="font-bold">{accessLabel(access?.level)}</span>
                {access?.hasActiveLoadRelationship && (
                  <Badge variant="outline" className="text-[10px]">
                    Exact active-load relationship verified
                  </Badge>
                )}
                {access?.activeLoads?.map((load) => (
                  <Badge key={load.id} variant="secondary" className="text-[10px]">
                    {load.loadNumber || load.id} · {load.status || "Active"}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>

          {profile && (
            <div className="shrink-0 border-b border-border/60 bg-muted/[0.12] px-3 py-2 sm:px-5">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="mr-2 size-5 animate-spin text-emerald-500" />
                <span className="text-sm text-muted-foreground">Loading Driver Review Center…</span>
              </div>
            ) : accessDenied ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-6 py-12 text-center">
                <ShieldAlert className="size-10 text-red-500" />
                <h3 className="mt-3 text-lg font-black">Review Center Access Restricted</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{accessDenied}</p>
              </div>
            ) : notFound ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
                <FileText className="size-10 text-muted-foreground/50" />
                <h3 className="mt-3 text-lg font-black">No Driver Verification Profile Yet</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  This driver has not created a Driver Verification profile.
                </p>
              </div>
            ) : profile ? (
              <div className="space-y-5">
                {activeTab === "overview" && (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Driver" value={driverName} />
                      <Field label="Verification" value={verificationLabel(profile.verificationStatus)} />
                      <Field label="Work Availability" value={String(profile.operationalStatus || "unknown").replace(/_/g, " ")} />
                      <Field label="Compliance" value={complianceLabel(profile.complianceState)} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Trailer Type" value={profile.equipment?.trailerType} />
                      <Field label="Vehicle Capacity" value={profile.equipment?.maxVehicleCapacity ? `${profile.equipment.maxVehicleCapacity} vehicles` : undefined} />
                      <Field label="Truck" value={[profile.equipment?.truckMake, profile.equipment?.truckModel].filter(Boolean).join(" ")} />
                      <Field label="Profile Completion" value={`${Math.max(0, Math.min(100, Number(profile.profileCompletionScore || 0)))}%`} />
                    </div>

                    {hasProtectedOperationalAccess && (
                      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
                        <div className="flex items-start gap-3">
                          <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
                          <div>
                            <p className="text-sm font-black">Operational protected access is active</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              Additional compliance facts are available because you are the current dispatch owner for an active load with this exact driver. Administrative notes, SSN, review history and document contents remain restricted.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {access?.level === "DISPATCH_LIMITED" && (
                      <div className="rounded-2xl border border-border/60 bg-muted/[0.12] p-4">
                        <div className="flex items-start gap-3">
                          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-black">Limited dispatcher projection</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              No active load relationship exists with this driver, so only non-sensitive operational readiness is shown.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isAdminReview && (
                      <section className="rounded-2xl border border-border/70 p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-black">Final Verification Eligibility</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              The backend rechecks every blocker when Final Approve is pressed.
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              profile.eligibility?.eligible
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            }
                          >
                            {profile.eligibility?.eligible ? "Eligible" : `${blockers.length} item${blockers.length === 1 ? "" : "s"} need attention`}
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {[
                            ["Driver Information", profile.eligibility?.checks?.informationComplete],
                            ["Required Documents", profile.eligibility?.checks?.requiredDocumentsApproved],
                            ["Agreement", profile.eligibility?.checks?.agreementAccepted],
                            ["Credentials Current", profile.eligibility?.checks?.credentialsCurrent],
                          ].map(([label, complete]) => (
                            <div key={String(label)} className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2.5 text-sm">
                              {complete ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <Clock className="size-4 text-amber-500" />
                              )}
                              <span className="font-semibold">{String(label)}</span>
                            </div>
                          ))}
                        </div>

                        {blockers.length > 0 && (
                          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3">
                            <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                              Final Approval Unavailable
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                              {blockers.map((blocker) => (
                                <li key={blocker} className="flex items-start gap-2">
                                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                                  <span>{blocker}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <Button
                            onClick={() => setShowFinalApprove(true)}
                            disabled={
                              profile.verificationStatus === "verified" ||
                              !profile.eligibility?.eligible ||
                              actionLoading === "final-approval"
                            }
                            className="gap-2"
                          >
                            <BadgeCheck className="size-4" />
                            {profile.verificationStatus === "verified" ? "Driver Verified" : "Final Approve Driver"}
                          </Button>
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {activeTab === "information" && (
                  <div className="space-y-4">
                    {isAdminReview ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <Field label="First Name" value={profile.information?.firstName} />
                          <Field label="Last Name" value={profile.information?.lastName} />
                          <Field label="Phone" value={profile.information?.phone || profile.driver?.phone} />
                          <Field label="Email" value={profile.driver?.email} />
                          <Field label="Address" value={profile.information?.address} />
                          <Field label="City / State / ZIP" value={[profile.information?.city, profile.information?.state, profile.information?.zipCode].filter(Boolean).join(", ")} />
                          <Field label="SSN Last 4" value={profile.information?.ssnLast4 ? `••••${profile.information.ssnLast4}` : undefined} />
                          <Field label="Background Check" value={profile.information?.backgroundCheckConsent ? `Authorized · ${formatDate(profile.information.backgroundCheckConsentDate)}` : "Not authorized"} />
                          <Field label="Verification Agreement" value={profile.agreement?.accepted ? `Accepted · ${formatDate(profile.agreement.acceptedAt)}` : "Not accepted"} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <Field label="CDL Number" value={profile.credentials?.driversLicenseNumber} />
                          <Field label="CDL State" value={profile.credentials?.licenseState} />
                          <Field label="CDL Expiration" value={formatDate(profile.credentials?.licenseExpirationDate)} />
                          <Field label="Insurance Provider" value={profile.credentials?.insuranceProvider} />
                          <Field label="Insurance Policy" value={profile.credentials?.insurancePolicyNumber} />
                          <Field label="Insurance Expiration" value={formatDate(profile.credentials?.insuranceExpirationDate)} />
                        </div>
                      </>
                    ) : hasProtectedOperationalAccess ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Driver Contact Email" value={profile.contact?.email} />
                          <Field label="Driver Contact Phone" value={profile.contact?.phone} />
                        </div>
                        <div className="grid gap-3 lg:grid-cols-3">
                          <CredentialCard title="Commercial Driver License" fact={profile.credentialFacts?.cdl} />
                          <CredentialCard title="DOT Medical Card" fact={profile.credentialFacts?.medicalCard} />
                          <CredentialCard title="Insurance" fact={profile.credentialFacts?.insurance} />
                        </div>
                      </>
                    ) : (
                      <RestrictedPanel message="Personal, credential and identity-verification information is not returned without an exact active-load relationship or administrative review authorization." />
                    )}
                  </div>
                )}

                {activeTab === "documents" && (
                  isAdminReview ? (
                    <div className="space-y-3">
                      {documents.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
                          No uploaded documents are available for review.
                        </div>
                      ) : (
                        documents.map((document) => {
                          const status = document.verified || document.reviewStatus === "approved"
                            ? "approved"
                            : document.reviewStatus === "rejected"
                              ? "rejected"
                              : "pending";
                          return (
                            <div key={document._id || `${document.type}-${document.uploadedAt}`} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <FileText className="size-4 text-primary" />
                                    <p className="font-black">{document.label || formatDocumentType(document.type)}</p>
                                    <Badge variant="outline" className={reviewStatusClass(status)}>{reviewStatusLabel(status)}</Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {document.fileName || formatDocumentType(document.type)}
                                    {document.fileSize ? ` · ${bytesLabel(document.fileSize)}` : ""}
                                    {document.uploadedAt ? ` · Uploaded ${formatDate(document.uploadedAt)}` : ""}
                                  </p>
                                  {document.expiresAt && (
                                    <p className="mt-1 text-xs text-muted-foreground">Expires {formatDate(document.expiresAt)}</p>
                                  )}
                                  {document.reviewStatus === "rejected" && document.rejectionReason && (
                                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-sm text-red-700 dark:text-red-300">
                                      <span className="font-black">Rejection reason:</span> {document.rejectionReason}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!document.fileAvailable || !document._id || previewLoading}
                                    onClick={() => void openPreview(document)}
                                    className="gap-1.5"
                                  >
                                    <FileText className="size-3.5" /> View
                                  </Button>
                                  {status !== "approved" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!document._id || actionLoading === document._id}
                                      onClick={() => void approveDocument(document)}
                                      className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                                    >
                                      {actionLoading === document._id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                                      Approve
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!document._id || actionLoading === document._id}
                                    onClick={() => {
                                      setRejectDocument(document);
                                      setRejectReason("");
                                    }}
                                    className="gap-1.5 border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-300"
                                  >
                                    <XCircle className="size-3.5" /> Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <RestrictedPanel message="Uploaded verification documents and document review controls are restricted to authorized administrative reviewers. Dispatch receives verified operational facts instead of raw document contents." />
                  )
                )}

                {activeTab === "equipment" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Truck" value={[profile.equipment?.truckMake, profile.equipment?.truckModel].filter(Boolean).join(" ")} />
                      <Field label="Trailer Type" value={profile.equipment?.trailerType} />
                      <Field label="Vehicle Capacity" value={profile.equipment?.maxVehicleCapacity ? `${profile.equipment.maxVehicleCapacity} vehicles` : undefined} />
                      <Field label="Compliance" value={complianceLabel(profile.complianceState)} />
                    </div>

                    {(hasProtectedOperationalAccess || isAdminReview) && (
                      <div className="grid gap-3 lg:grid-cols-3">
                        <CredentialCard title="Commercial Driver License" fact={profile.credentialFacts?.cdl} />
                        <CredentialCard title="DOT Medical Card" fact={profile.credentialFacts?.medicalCard} />
                        <CredentialCard title="Insurance" fact={profile.credentialFacts?.insurance} />
                      </div>
                    )}

                    {isAdminReview && (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field label="VIN" value={profile.equipment?.vin} />
                          <Field label="License Plate" value={profile.equipment?.plateNumber} />
                          <Field label="DOT Number" value={profile.credentials?.dotNumber} />
                          <Field label="MC Number" value={profile.credentials?.mcNumber} />
                          <Field label="Truck Year" value={profile.equipment?.truckYear} />
                          <Field label="Engine" value={profile.equipment?.engineType} />
                          <Field label="GVWR" value={profile.equipment?.gvwr ? `${profile.equipment.gvwr.toLocaleString()} lbs` : undefined} />
                          <Field label="Trailer" value={[profile.equipment?.trailerMake, profile.equipment?.trailerModel].filter(Boolean).join(" ")} />
                        </div>
                        {profile.equipment?.specialFeatures && profile.equipment.specialFeatures.length > 0 && (
                          <div className="rounded-2xl border border-border/60 p-4">
                            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Operational Features</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {profile.equipment.specialFeatures.map((feature) => (
                                <Badge key={feature} variant="outline" className="capitalize">{feature.replace(/_/g, " ")}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {Array.isArray(profile.complianceWarnings) && profile.complianceWarnings.length > 0 && (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
                        <p className="font-black text-amber-700 dark:text-amber-300">Compliance Warnings</p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {profile.complianceWarnings.map((warning) => (
                            <li key={warning} className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "history" && (
                  isAdminReview && access?.canViewReviewHistory ? (
                    <div className="space-y-3">
                      {history.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
                          No Driver Verification review events have been recorded yet.
                        </div>
                      ) : (
                        history.map((event, index) => (
                          <div key={event._id || `${event.createdAt}-${index}`} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-black capitalize">{String(event.action || "Review event").replace(/_/g, " ")}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {event.actorName || "System"}
                                  {event.actorRole ? ` · ${event.actorRole}` : ""}
                                  {event.loadNumber ? ` · Load ${event.loadNumber}` : ""}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground">{formatDate(event.createdAt, true)}</span>
                            </div>
                            {(event.previousStatus || event.newStatus) && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {event.previousStatus || "—"} → <span className="font-semibold text-foreground">{event.newStatus || "—"}</span>
                              </p>
                            )}
                            {event.reason && (
                              <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">Reason: {event.reason}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <RestrictedPanel message="Administrative verification history and reviewer reasoning are not returned to dispatch or other operational users." />
                  )
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDocument} onOpenChange={(next) => {
        if (!next && actionLoading === null) {
          setRejectDocument(null);
          setRejectReason("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              A clear reason is required so the driver knows what must be corrected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm font-semibold">
              {rejectDocument?.label || formatDocumentType(rejectDocument?.type)}
            </div>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Example: Image is unreadable. Please upload a clearer copy."
              rows={4}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDocument(null);
              setRejectReason("");
            }} disabled={actionLoading !== null}>Cancel</Button>
            <Button variant="destructive" onClick={() => void submitRejection()} disabled={actionLoading !== null || rejectReason.trim().length < 3}>
              {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFinalApprove} onOpenChange={(next) => {
        if (actionLoading !== "final-approval") setShowFinalApprove(next);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BadgeCheck className="size-5 text-emerald-500" /> Final Approve Driver</DialogTitle>
            <DialogDescription>
              The server will re-check Driver Information, required document approvals, Agreement status and credential blockers before verification is completed.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-sm">
            <p className="font-black">{driverName}</p>
            <p className="mt-1 text-muted-foreground">This action also synchronizes the existing driver account approval state.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalApprove(false)} disabled={actionLoading === "final-approval"}>Cancel</Button>
            <Button onClick={() => void approveDriver()} disabled={actionLoading === "final-approval"} className="gap-2">
              {actionLoading === "final-approval" ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
              Approve Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDocument} onOpenChange={(next) => {
        if (!next) closePreview();
      }}>
        <DialogContent className="flex h-[88dvh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle>{previewDocument?.label || previewDocument?.fileName || "Driver Document"}</DialogTitle>
            <DialogDescription>
              Secure authenticated preview. This file is not included in the Driver Review Center JSON response.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 bg-muted/20 p-3">
            {previewLoading ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>
            ) : previewError ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">{previewError}</div>
            ) : previewUrl ? (
              previewMimeType.startsWith("image/") ? (
                <div className="flex h-full items-center justify-center overflow-auto rounded-xl bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt={previewDocument?.label || "Driver document"} className="max-h-full max-w-full object-contain" />
                </div>
              ) : previewMimeType === "application/pdf" ? (
                <iframe title={previewDocument?.label || "Driver document"} src={previewUrl} className="h-full w-full rounded-xl border bg-background" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <IdCard className="size-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Preview is not available for this file type.</p>
                  <Button asChild><a href={previewUrl} target="_blank" rel="noreferrer">Open File</a></Button>
                </div>
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}