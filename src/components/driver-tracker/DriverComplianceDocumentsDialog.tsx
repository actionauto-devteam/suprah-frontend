"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  FileCheck2,
  FileText,
  IdCard,
  Loader2,
  MapPin,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DriverTrackingItem } from "@/types/driver-tracking";

interface DriverDocument {
  _id?: string;
  type?: string;
  label?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  expiresAt?: string;
  verified?: boolean;
  reviewStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

interface DriverProfileDetails {
  userId?:
  | string
  | {
    _id?: string;
    name?: string;
    email?: string;
    avatar?: string | null;
  };
  verificationStatus?:
  | "unverified"
  | "pending"
  | "in_progress"
  | "under_review"
  | "verified";
  profileCompletionScore?: number;
  isComplianceExpired?: boolean;
  documents?: DriverDocument[];
  complianceSummary?: {
    uploadedCount?: number;
    totalRequired?: number;
    percentage?: number;
    missingTypes?: string[];
  };

  driversLicenseNumber?: string;
  licenseState?: string;
  licenseExpirationDate?: string;
  medicalCardExpirationDate?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpirationDate?: string;

  dotNumber?: string;
  mcNumber?: string;
  truckMake?: string;
  truckModel?: string;
  trailerType?: string;
  maxVehicleCapacity?: number;

  homeBase?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  serviceRadius?: number;
}

interface DriverComplianceDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverTrackingItem | null;
}

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
    type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function formatDate(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function bytesLabel(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function maskIdentifier(value?: string) {
  const clean = String(value || "").trim();
  if (!clean) return "Not provided";
  if (clean.length <= 4) return clean;
  return `${"•".repeat(Math.min(8, clean.length - 4))}${clean.slice(-4)}`;
}

function statusLabel(status?: DriverProfileDetails["verificationStatus"]) {
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

function statusClass(status?: DriverProfileDetails["verificationStatus"]) {
  switch (status) {
    case "verified":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "under_review":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "in_progress":
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-border/60 bg-muted/40 text-muted-foreground";
  }
}

function documentStatus(document: DriverDocument) {
  if (document.verified || document.reviewStatus === "approved") {
    return {
      label: "Verified",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (document.reviewStatus === "rejected") {
    return {
      label: "Rejected",
      className:
        "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }

  return {
    label: "Pending Review",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
}

export function DriverComplianceDocumentsDialog({
  open,
  onOpenChange,
  driver,
}: DriverComplianceDocumentsDialogProps) {
  const { getToken } = useAuth();
  const [profile, setProfile] = React.useState<DriverProfileDetails | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);

  const driverId = driver?.driver?.id ?? driver?.id ?? null;
  const driverName = driver?.driver?.name || "Driver";
  const driverEmail = driver?.driver?.email || "";

  React.useEffect(() => {
    if (!open || !driverId) {
      if (!open) {
        setProfile(null);
        setNotFound(false);
      }
      return;
    }

    let cancelled = false;

    const fetchProfile = async () => {
      setIsLoading(true);
      setNotFound(false);

      try {
        const token = await getToken();
        if (!token || cancelled) return;

        const response = await apiClient.get(
          `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) return;
        setProfile(response.data?.data ?? null);
      } catch (error: any) {
        if (cancelled) return;

        if (error?.response?.status === 404) {
          setProfile(null);
          setNotFound(true);
          return;
        }

        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          "Could not load driver compliance information",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [driverId, getToken, open]);

  const documents = Array.isArray(profile?.documents)
    ? profile!.documents!
    : [];
  const compliance = profile?.complianceSummary;
  const completion = Math.max(
    0,
    Math.min(
      100,
      Number(
        compliance?.percentage ??
        profile?.profileCompletionScore ??
        driver?.equipment?.profileCompletionScore ??
        0,
      ) || 0,
    ),
  );

  const uploadedCount = Number(compliance?.uploadedCount ?? documents.length);
  const totalRequired = Number(compliance?.totalRequired ?? 0);
  const missingTypes = Array.isArray(compliance?.missingTypes)
    ? compliance!.missingTypes!
    : [];

  const homeBase = [
    profile?.homeBase?.address,
    profile?.homeBase?.city,
    profile?.homeBase?.state,
    profile?.homeBase?.zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90dvh] max-w-none flex-col gap-0 overflow-hidden p-0"
        style={{
          width: "min(94vw, 72rem)",
          maxWidth: "min(94vw, 72rem)",
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border/70 bg-linear-to-b from-emerald-500/[0.07] to-background px-4 py-4 sm:px-6 sm:py-5 lg:px-7">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-7">
            <div>
              <DialogTitle className="flex items-center gap-2.5 text-xl font-black sm:text-2xl">
                <span className="flex size-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5" />
                </span>
                Compliance & Documents
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed sm:text-base">
                Dispatcher view of {driverName}&apos;s driver verification and
                operational compliance records.
              </DialogDescription>
            </div>

            {profile && (
              <Badge
                variant="outline"
                className={`h-7 px-3 text-xs font-bold ${statusClass(
                  profile.verificationStatus,
                )}`}
              >
                {statusLabel(profile.verificationStatus)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-7">
          {isLoading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="mr-2 size-5 animate-spin text-emerald-500" />
              <span className="text-base text-muted-foreground">
                Loading driver records…
              </span>
            </div>
          ) : notFound ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50">
                <FileText className="size-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-base font-black">
                No driver verification profile yet
              </p>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {driverName} has not created their Driver Verification profile,
                so there are no compliance documents available to review yet.
              </p>
            </div>
          ) : profile ? (
            <div className="space-y-5 sm:space-y-6">
              <section className="rounded-2xl border border-border/70 bg-muted/[0.14] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-black">{driverName}</p>
                    {driverEmail && (
                      <p className="break-all text-sm text-muted-foreground">
                        {driverEmail}
                      </p>
                    )}
                  </div>
                  {profile.isComplianceExpired && (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                    >
                      <AlertTriangle className="mr-1 size-3" />
                      Compliance Expired
                    </Badge>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3.5 sm:p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Completion
                    </p>
                    <p className="mt-1.5 text-2xl font-black">{completion}%</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/70 p-3.5 sm:p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Required Docs
                    </p>
                    <p className="mt-1.5 text-2xl font-black">
                      {totalRequired > 0
                        ? `${uploadedCount}/${totalRequired}`
                        : uploadedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      uploaded
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/70 p-3.5 sm:p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Uploaded Files
                    </p>
                    <p className="mt-1.5 text-2xl font-black">
                      {documents.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      all documents
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/70 p-3.5 sm:p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Verification
                    </p>
                    <p className="mt-1.5 text-base font-black">
                      {statusLabel(profile.verificationStatus)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      current status
                    </p>
                  </div>
                </div>

                {missingTypes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Missing Required Documents
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {missingTypes.map((type) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className="border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-300"
                        >
                          {formatDocumentType(type)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <IdCard className="size-5 text-emerald-500" />
                  <h3 className="text-lg font-black">
                    License & Insurance
                  </h3>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-3">
                  <InfoCell
                    label="Driver's License"
                    value={maskIdentifier(profile.driversLicenseNumber)}
                  />
                  <InfoCell
                    label="License State"
                    value={profile.licenseState || "Not provided"}
                  />
                  <InfoCell
                    label="License Expires"
                    value={formatDate(profile.licenseExpirationDate)}
                  />
                  <InfoCell
                    label="DOT Medical Card Expires"
                    value={formatDate(profile.medicalCardExpirationDate)}
                  />
                  <InfoCell
                    label="Insurance Provider"
                    value={profile.insuranceProvider || "Not provided"}
                  />
                  <InfoCell
                    label="Insurance Policy"
                    value={maskIdentifier(profile.insurancePolicyNumber)}
                  />
                  <InfoCell
                    label="Insurance Expires"
                    value={formatDate(profile.insuranceExpirationDate)}
                  />
                  <InfoCell
                    label="DOT Number"
                    value={profile.dotNumber || "Not provided"}
                  />
                  <InfoCell
                    label="MC Number"
                    value={profile.mcNumber || "Not provided"}
                  />
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Truck className="size-5 text-emerald-500" />
                  <h3 className="text-lg font-black">
                    Operational Information
                  </h3>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-3">
                  <InfoCell
                    label="Truck"
                    value={
                      [profile.truckMake, profile.truckModel]
                        .filter(Boolean)
                        .join(" ") || "Not provided"
                    }
                  />
                  <InfoCell
                    label="Trailer Type"
                    value={
                      profile.trailerType?.replace(/_/g, " ") ||
                      "Not provided"
                    }
                  />
                  <InfoCell
                    label="Load Capacity"
                    value={
                      profile.maxVehicleCapacity
                        ? `${profile.maxVehicleCapacity} vehicle${profile.maxVehicleCapacity === 1 ? "" : "s"
                        }`
                        : "Not provided"
                    }
                  />
                  <InfoCell
                    icon={<MapPin className="size-3" />}
                    label="Home Base"
                    value={homeBase || "Not provided"}
                  />
                  <InfoCell
                    label="Service Radius"
                    value={
                      profile.serviceRadius != null
                        ? `${profile.serviceRadius} miles`
                        : "Not provided"
                    }
                  />
                </div>
              </section>

              <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="size-5 text-emerald-500" />
                    <h3 className="text-lg font-black">
                      Uploaded Documents
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {documents.length} file
                    {documents.length === 1 ? "" : "s"}
                  </span>
                </div>

                {documents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-5 py-10 text-center">
                    <FileText className="mx-auto size-6 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-bold">
                      No documents uploaded
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Uploaded Driver Verification documents will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((document, index) => {
                      const docStatus = documentStatus(document);
                      const key =
                        document._id ||
                        `${document.type || "document"}:${index}`;

                      return (
                        <div
                          key={key}
                          className="rounded-2xl border border-border/70 bg-muted/12 p-4 sm:p-5"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background">
                                <FileText className="size-5 text-emerald-500" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="wrap-break-word text-base font-black leading-snug">
                                    {document.label ||
                                      formatDocumentType(document.type)}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`h-6 px-2 text-[11px] sm:text-xs font-semibold ${docStatus.className}`}
                                  >
                                    {docStatus.label}
                                  </Badge>
                                </div>

                                <p className="mt-1 break-all text-xs text-muted-foreground wrap-anywhere">
                                  {document.fileName ||
                                    formatDocumentType(document.type)}
                                  {bytesLabel(document.fileSize)
                                    ? ` · ${bytesLabel(document.fileSize)}`
                                    : ""}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarClock className="size-3" />
                                    Uploaded {formatDate(document.uploadedAt)}
                                  </span>
                                  {document.expiresAt && (
                                    <span>
                                      Expires {formatDate(document.expiresAt)}
                                    </span>
                                  )}
                                </div>

                                {document.reviewStatus === "rejected" &&
                                  document.rejectionReason && (
                                    <div className="mt-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
                                      Rejection reason:{" "}
                                      {document.rejectionReason}
                                    </div>
                                  )}
                              </div>
                            </div>

                            {document.fileUrl ? (
                              <Button
                                asChild
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-10 shrink-0 gap-2 px-3.5 text-sm font-semibold"
                              >
                                <a
                                  href={document.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="size-3.5" />
                                  Open Document
                                </a>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled
                                className="h-10 shrink-0 text-sm"
                              >
                                File unavailable
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This dispatcher view is read-only. Driver document approval
                  and rejection permissions remain controlled by the existing
                  administrative verification workflow.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/16 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:text-sm">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 wrap-break-word text-sm font-semibold leading-snug capitalize sm:text-base">
        {value}
      </p>
    </div>
  );
}