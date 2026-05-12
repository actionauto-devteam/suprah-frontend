"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  Settings as SettingsIcon,
  Users,
  MapPin,
  Shield,
  Zap,
  Bell,
  CreditCard,
  Download,
  Share2,
  Trash2,
  Printer,
  ArrowRight,
  X,
  Loader2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/AlertDialog";
import { OrganizationMembersSettings } from "@/components/settings/org-members-settings";
import { DriverRequestsSettings } from "@/components/settings/driver-requests-settings";
import { DriverVerificationPanel } from "@/components/settings/driver-verification-panel";
import { Truck } from "lucide-react";
import {
  listGeneratedReportFiles,
  getGeneratedReportFileBlob,
  deleteGeneratedReportFile,
  type ReportFileCategory,
} from "@/lib/report-files";

type ReportCategory = ReportFileCategory;

interface FileEntry {
  id: string;
  name: string;
  createdAt: number;
  date: string;
  sizeBytes: number;
  size: string;
  type: string;
  category: ReportCategory;
}

type ShareTarget = { type: "reports-area" } | { type: "file"; file: FileEntry };

type SettingsSection =
  | "account"
  | "locations"
  | "security"
  | "notifications"
  | "integrations";

const SETTINGS_NAV_ITEMS: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "account", label: "Account Details", icon: Users },
  { id: "locations", label: "Locations & Inventory", icon: MapPin },
  { id: "security", label: "Security / RBAC", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Zap },
];

const SYSTEM_SETTINGS_STORAGE_KEY = "action-auto-system-settings";

type SystemSettings = {
  account: {
    dealershipName: string;
    primaryLocation: string;
    autoSyncDms: boolean;
    publicConditionReports: boolean;
  };
  locations: {
    defaultIntakeLocation: string;
    inventoryHoldWindowDays: string;
    autoAssignNearestLot: boolean;
  };
  security: {
    requireMfaForStaff: boolean;
    strictRoleEnforcement: boolean;
    sessionTimeoutMinutes: string;
  };
  notifications: {
    emailAlerts: boolean;
    pushNotifications: boolean;
    dailyDigestTime: string;
  };
  integrations: Record<string, never>;
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  account: {
    dealershipName: "Action Auto Utah",
    primaryLocation: "Lehi, UT",
    autoSyncDms: true,
    publicConditionReports: true,
  },
  locations: {
    defaultIntakeLocation: "Lehi, UT",
    inventoryHoldWindowDays: "14",
    autoAssignNearestLot: true,
  },
  security: {
    requireMfaForStaff: true,
    strictRoleEnforcement: true,
    sessionTimeoutMinutes: "30",
  },
  notifications: {
    emailAlerts: true,
    pushNotifications: true,
    dailyDigestTime: "08:00 AM",
  },
  integrations: {},
};

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  transportation: "Transportation",
  driver: "Driver Reports",
  billings: "Billings",
};

function formatRelativeFileTime(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins} min${mins === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const hrs = Math.max(1, Math.floor(diffMs / hour));
    return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  }
  if (diffMs < 2 * day) return "Yesterday";

  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = searchParams.get("tab") || "reports";

  const [files, setFiles] = React.useState<FileEntry[]>([]);
  const [isShareAccessOpen, setIsShareAccessOpen] = React.useState(false);
  const [isBulkPrintOpen, setIsBulkPrintOpen] = React.useState(false);
  const [shareRecipients, setShareRecipients] = React.useState("");
  const [shareNote, setShareNote] = React.useState("");
  const [sharePermission, setSharePermission] = React.useState<
    "view" | "manage"
  >("view");
  const [isSharingAccess, setIsSharingAccess] = React.useState(false);
  const [selectedPrintFileIds, setSelectedPrintFileIds] = React.useState<
    string[]
  >([]);
  const [printIncludeMetadata, setPrintIncludeMetadata] = React.useState(true);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [activeSettingsSection, setActiveSettingsSection] =
    React.useState<SettingsSection>("account");
  const [savingSettingsSection, setSavingSettingsSection] =
    React.useState<SettingsSection | null>(null);
  const [systemSettings, setSystemSettings] = React.useState<SystemSettings>(
    DEFAULT_SYSTEM_SETTINGS,
  );
  const [draftSystemSettings, setDraftSystemSettings] =
    React.useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [editingSettingsSection, setEditingSettingsSection] =
    React.useState<SettingsSection | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<FileEntry | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeCategory, setActiveCategory] =
    React.useState<ReportCategory | null>(null);
  const [shareTarget, setShareTarget] = React.useState<ShareTarget>({
    type: "reports-area",
  });

  React.useEffect(() => {
    try {
      const rawSettings = window.localStorage.getItem(
        SYSTEM_SETTINGS_STORAGE_KEY,
      );
      if (!rawSettings) return;

      const parsedSettings = JSON.parse(rawSettings) as Partial<SystemSettings>;
      const nextSettings: SystemSettings = {
        account: {
          ...DEFAULT_SYSTEM_SETTINGS.account,
          ...parsedSettings.account,
        },
        locations: {
          ...DEFAULT_SYSTEM_SETTINGS.locations,
          ...parsedSettings.locations,
        },
        security: {
          ...DEFAULT_SYSTEM_SETTINGS.security,
          ...parsedSettings.security,
        },
        notifications: {
          ...DEFAULT_SYSTEM_SETTINGS.notifications,
          ...parsedSettings.notifications,
        },
        integrations: {},
      };

      setSystemSettings(nextSettings);
    } catch {
      toast.error("Failed to load saved system settings.");
    }
  }, []);

  const loadGeneratedFiles = React.useCallback(async () => {
    try {
      const records = await listGeneratedReportFiles();
      const mapped: FileEntry[] = records.map((record) => ({
        id: record.id,
        name: record.name,
        createdAt: record.createdAt,
        date: formatRelativeFileTime(record.createdAt),
        sizeBytes: record.sizeBytes,
        size: formatFileSize(record.sizeBytes),
        type: record.type,
        category: record.category,
      }));
      setFiles(mapped);
    } catch {
      toast.error("Failed to load generated report files.");
    }
  }, []);

  React.useEffect(() => {
    void loadGeneratedFiles();
    const refresh = () => {
      void loadGeneratedFiles();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [loadGeneratedFiles]);

  const visibleFiles = activeCategory
    ? files.filter((f) => f.category === activeCategory)
    : files;

  const transportationCount = files.filter(
    (file) => file.category === "transportation",
  ).length;
  const driverCount = files.filter((file) => file.category === "driver").length;
  const billingsCount = files.filter(
    (file) => file.category === "billings",
  ).length;

  const handleCardClick = (category: ReportCategory) => {
    setActiveCategory((prev) => (prev === category ? null : category));
  };

  const printableFiles = React.useMemo(
    () => files.filter((file) => selectedPrintFileIds.includes(file.id)),
    [files, selectedPrintFileIds],
  );

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const openShareAccessDialog = () => {
    setShareTarget({ type: "reports-area" });
    setShareRecipients("");
    setShareNote("");
    setSharePermission("view");
    setIsShareAccessOpen(true);
  };

  const openFileShareDialog = (file: FileEntry) => {
    setShareTarget({ type: "file", file });
    setShareRecipients("");
    setShareNote("");
    setSharePermission("view");
    setIsShareAccessOpen(true);
  };

  const openBulkPrintDialog = () => {
    setSelectedPrintFileIds(files.map((file) => file.id));
    setPrintIncludeMetadata(true);
    setIsBulkPrintOpen(true);
  };

  const handleCopyShareAccessLink = async () => {
    const shareUrl =
      shareTarget.type === "file"
        ? `${window.location.origin}/reports/${shareTarget.file.id}`
        : `${window.location.origin}/settings?tab=reports`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(
        shareTarget.type === "file"
          ? `Link copied for ${shareTarget.file.name}.`
          : "Report access link copied to clipboard.",
      );
    } catch {
      toast.error("Unable to copy link. Please try again.");
    }
  };

  const handleShareAccess = async () => {
    const recipients = Array.from(
      new Set(
        shareRecipients
          .split(/[\s,;]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    if (recipients.length === 0) {
      toast.error("Add at least one recipient email.");
      return;
    }

    setIsSharingAccess(true);
    toast.loading("Sharing report access...", { id: "share-reports-access" });
    try {
      // Replace with real API call when endpoint is available.
      await new Promise((resolve) => setTimeout(resolve, 800));
      const permissionLabel = sharePermission === "view" ? "view" : "manage";
      if (shareTarget.type === "file") {
        toast.success(
          `Shared ${permissionLabel} access to ${shareTarget.file.name} with ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`,
          { id: "share-reports-access" },
        );
      } else {
        toast.success(
          `Shared ${permissionLabel} access with ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`,
          { id: "share-reports-access" },
        );
      }
      setIsShareAccessOpen(false);
    } catch {
      toast.error("Failed to share access. Please try again.", {
        id: "share-reports-access",
      });
    } finally {
      setIsSharingAccess(false);
    }
  };

  const togglePrintFile = (fileId: string, checked: boolean) => {
    setSelectedPrintFileIds((prev) => {
      if (checked) {
        if (prev.includes(fileId)) return prev;
        return [...prev, fileId];
      }
      return prev.filter((id) => id !== fileId);
    });
  };

  const handleBulkPrint = async () => {
    if (printableFiles.length === 0) {
      toast.info("Select at least one report to print.");
      return;
    }

    setIsPrinting(true);
    toast.loading("Preparing print preview…", { id: "bulk-print-reports" });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    try {
      const printWindow = iframe.contentWindow;
      const doc = printWindow?.document;
      if (!doc || !printWindow) throw new Error("Print unavailable");

      const generatedAt = new Date().toLocaleString();
      const rows = printableFiles
        .map((file, index) => {
          const details = printIncludeMetadata
            ? `<td style=\"padding:8px;border:1px solid #d4d4d8;\">${escapeHtml(`${file.date} • ${file.size} • ${file.type}`)}</td>`
            : "";
          return `<tr>
                        <td style=\"padding:8px;border:1px solid #d4d4d8;width:50px;\">${index + 1}</td>
                        <td style=\"padding:8px;border:1px solid #d4d4d8;\">${escapeHtml(file.name)}</td>
                        ${details}
                    </tr>`;
        })
        .join("");

      doc.open();
      doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Bulk Print Reports</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
      h1 { font-size: 20px; margin: 0 0 6px; }
      p { margin: 0 0 16px; color: #4b5563; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { text-align: left; padding: 8px; border: 1px solid #d4d4d8; background: #f4f4f5; }
      td { vertical-align: top; }
    </style>
  </head>
  <body>
    <h1>Action Auto Utah - Reports Print Batch</h1>
    <p>Generated ${escapeHtml(generatedAt)} • ${printableFiles.length} report${printableFiles.length === 1 ? "" : "s"}</p>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Report File</th>
          ${printIncludeMetadata ? "<th>Metadata</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`);
      doc.close();

      await new Promise((resolve) => setTimeout(resolve, 150));
      printWindow.focus();
      printWindow.print();

      toast.success(
        `Bulk print started for ${printableFiles.length} report${printableFiles.length === 1 ? "" : "s"}.`,
        { id: "bulk-print-reports" },
      );
      setIsBulkPrintOpen(false);
    } catch {
      toast.error("Bulk print failed. Please try again.", {
        id: "bulk-print-reports",
      });
    } finally {
      setIsPrinting(false);
      setTimeout(() => iframe.remove(), 1000);
    }
  };

  const handleDownload = async (file: FileEntry) => {
    toast.loading(`Preparing ${file.name}…`, { id: `dl-${file.id}` });
    try {
      const blob = await getGeneratedReportFileBlob(file.id);
      if (!blob) {
        toast.error(
          "File content is missing. Regenerate this report from the Reports page.",
          { id: `dl-${file.id}` },
        );
        return;
      }

      const href = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(href), 10_000);

      toast.success(`${file.name} downloaded`, { id: `dl-${file.id}` });
    } catch {
      toast.error("Download failed. Please try again.", {
        id: `dl-${file.id}`,
      });
    }
  };

  const handleShare = (file: FileEntry) => {
    openFileShareDialog(file);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteGeneratedReportFile(deleteTarget.id);
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete file. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openSystemSettingsEditor = (section: SettingsSection) => {
    setDraftSystemSettings(systemSettings);
    setEditingSettingsSection(section);
  };

  const updateDraftSettings = (
    section: SettingsSection,
    updates: Record<string, string | boolean>,
  ) => {
    setDraftSystemSettings(
      (prev) =>
        ({
          ...prev,
          [section]: {
            ...prev[section],
            ...updates,
          },
        }) as SystemSettings,
    );
  };

  const handleSaveEditedSystemSettings = async () => {
    if (!editingSettingsSection) return;
    const section = editingSettingsSection;
    setSavingSettingsSection(section);
    try {
      window.localStorage.setItem(
        SYSTEM_SETTINGS_STORAGE_KEY,
        JSON.stringify(draftSystemSettings),
      );
      setSystemSettings(draftSystemSettings);
      setEditingSettingsSection(null);
      toast.success("Changes saved successfully");
    } catch {
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSavingSettingsSection(null);
    }
  };

  const editingSettingsLabel = editingSettingsSection
    ? SETTINGS_NAV_ITEMS.find((item) => item.id === editingSettingsSection)
        ?.label
    : null;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">
            Action Auto Utah
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            System Administrator Settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openShareAccessDialog}
          >
            <Share2 className="size-4" /> Share Access
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-primary"
            onClick={openBulkPrintDialog}
          >
            <Printer className="size-4" /> Bulk Print
          </Button>
        </div>
      </div>

      <Dialog open={isShareAccessOpen} onOpenChange={setIsShareAccessOpen}>
        <DialogContent className="overflow-visible border-border bg-card text-card-foreground shadow-2xl sm:max-w-xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-card-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                <Share2 className="size-5 text-primary" />
              </span>
              {shareTarget.type === "file"
                ? "Share Report"
                : "Share Report Access"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {shareTarget.type === "file"
                ? `Invite team members to access ${shareTarget.file.name} and choose their permission level.`
                : "Invite team members to access the Reports area and choose their permission level."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="share-recipients"
                className="text-xs font-bold uppercase tracking-wide text-foreground"
              >
                Recipient Emails
              </label>
              <Textarea
                id="share-recipients"
                value={shareRecipients}
                onChange={(event) => setShareRecipients(event.target.value)}
                placeholder="manager@actionauto.com, saleslead@actionauto.com"
                className="min-h-20 border-border/80 bg-background text-foreground shadow-xs placeholder:text-muted-foreground/70 focus-visible:border-primary/70 focus-visible:ring-primary/20"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Use commas, spaces, or new lines to add multiple recipients.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="share-permission"
                className="text-xs font-bold uppercase tracking-wide text-foreground"
              >
                Permission
              </label>
              <Select
                value={sharePermission}
                onValueChange={(value: "view" | "manage") =>
                  setSharePermission(value)
                }
              >
                <SelectTrigger
                  id="share-permission"
                  className="h-9 w-full border-border/80 bg-background text-foreground shadow-xs focus:ring-primary/20"
                >
                  <SelectValue placeholder="Choose permission" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  position="popper"
                  sideOffset={4}
                  className="z-[70] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] border-border/70 bg-popover p-1 shadow-xl"
                >
                  <SelectItem
                    value="view"
                    className="rounded-md focus:bg-muted/70 focus:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground"
                  >
                    View only
                  </SelectItem>
                  <SelectItem
                    value="manage"
                    className="rounded-md focus:bg-muted/70 focus:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground"
                  >
                    Can manage and generate reports
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="share-note"
                className="text-xs font-bold uppercase tracking-wide text-foreground"
              >
                Optional Message
              </label>
              <Input
                id="share-note"
                value={shareNote}
                onChange={(event) => setShareNote(event.target.value)}
                placeholder={
                  shareTarget.type === "file"
                    ? "Sharing this report for your review"
                    : "Monthly reporting access"
                }
                className="border-border/80 bg-background text-foreground shadow-xs placeholder:text-muted-foreground/70 focus-visible:border-primary/70 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyShareAccessLink}
              className="border-border bg-background text-foreground shadow-xs hover:bg-muted hover:text-foreground"
            >
              Copy Link
            </Button>
            <Button
              type="button"
              onClick={handleShareAccess}
              disabled={isSharingAccess}
              className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              {isSharingAccess ? "Sharing..." : "Share Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkPrintOpen} onOpenChange={setIsBulkPrintOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="size-5 text-primary" /> Bulk Print Reports
            </DialogTitle>
            <DialogDescription>
              Select which generated files to include and start a print-ready
              batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Select files to print
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedPrintFileIds(files.map((file) => file.id))
                  }
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPrintFileIds([])}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {files.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No generated files available to print.
                </p>
              ) : (
                files.map((file) => {
                  const checked = selectedPrintFileIds.includes(file.id);
                  return (
                    <label
                      key={file.id}
                      className="flex items-start gap-3 p-3 cursor-pointer hover:bg-secondary/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          togglePrintFile(file.id, next === true)
                        }
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.date} • {file.size} • {file.type}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <Checkbox
                checked={printIncludeMetadata}
                onCheckedChange={(next) =>
                  setPrintIncludeMetadata(next === true)
                }
              />
              Include file metadata (date, size, type) in print batch
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkPrintOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkPrint}
              disabled={isPrinting || selectedPrintFileIds.length === 0}
              className="bg-primary"
            >
              {isPrinting
                ? "Preparing…"
                : `Print (${selectedPrintFileIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSettingsSection}
        onOpenChange={(open) => {
          if (!open) setEditingSettingsSection(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit {editingSettingsLabel}
            </DialogTitle>
            <DialogDescription>
              Update this system settings section, then save your changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingSettingsSection === "account" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Dealership Name
                    </label>
                    <Input
                      value={draftSystemSettings.account.dealershipName}
                      onChange={(event) =>
                        updateDraftSettings("account", {
                          dealershipName: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Primary Location
                    </label>
                    <Input
                      value={draftSystemSettings.account.primaryLocation}
                      onChange={(event) =>
                        updateDraftSettings("account", {
                          primaryLocation: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">Auto-Sync DMS</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically pull VIN-level data.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.account.autoSyncDms}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("account", { autoSyncDms: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Public Condition Reports
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Make reports accessible via public URL.
                    </p>
                  </div>
                  <Switch
                    checked={
                      draftSystemSettings.account.publicConditionReports
                    }
                    onCheckedChange={(checked) =>
                      updateDraftSettings("account", {
                        publicConditionReports: checked,
                      })
                    }
                  />
                </div>
              </>
            )}

            {editingSettingsSection === "locations" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Default Intake Location
                    </label>
                    <Input
                      value={
                        draftSystemSettings.locations.defaultIntakeLocation
                      }
                      onChange={(event) =>
                        updateDraftSettings("locations", {
                          defaultIntakeLocation: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Inventory Hold Window (Days)
                    </label>
                    <Input
                      value={
                        draftSystemSettings.locations.inventoryHoldWindowDays
                      }
                      onChange={(event) =>
                        updateDraftSettings("locations", {
                          inventoryHoldWindowDays: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Auto-assign to Nearest Lot
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assign incoming units by distance and capacity.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.locations.autoAssignNearestLot}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("locations", {
                        autoAssignNearestLot: checked,
                      })
                    }
                  />
                </div>
              </>
            )}

            {editingSettingsSection === "security" && (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Require MFA for Staff
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Require two-factor authentication for employees.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.security.requireMfaForStaff}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("security", {
                        requireMfaForStaff: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Strict Role Enforcement
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prevent cross-role access by default.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.security.strictRoleEnforcement}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("security", {
                        strictRoleEnforcement: checked,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Session Timeout (Minutes)
                  </label>
                  <Input
                    value={draftSystemSettings.security.sessionTimeoutMinutes}
                    onChange={(event) =>
                      updateDraftSettings("security", {
                        sessionTimeoutMinutes: event.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {editingSettingsSection === "notifications" && (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">Email Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Receive dispatch and inventory updates by email.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.notifications.emailAlerts}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("notifications", {
                        emailAlerts: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive real-time in-app alerts.
                    </p>
                  </div>
                  <Switch
                    checked={
                      draftSystemSettings.notifications.pushNotifications
                    }
                    onCheckedChange={(checked) =>
                      updateDraftSettings("notifications", {
                        pushNotifications: checked,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Daily Digest Time
                  </label>
                  <Input
                    value={draftSystemSettings.notifications.dailyDigestTime}
                    onChange={(event) =>
                      updateDraftSettings("notifications", {
                        dailyDigestTime: event.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {editingSettingsSection === "integrations" && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Integration connection editing is not configured yet. Current
                connection statuses are shown in the settings card.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSettingsSection(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary"
              onClick={handleSaveEditedSystemSettings}
              disabled={
                !!editingSettingsSection &&
                savingSettingsSection === editingSettingsSection
              }
            >
              {!!editingSettingsSection &&
              savingSettingsSection === editingSettingsSection
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card border p-1 rounded-lg h-auto min-h-11 mb-6">
          <TabsTrigger
            value="reports"
            className="w-full min-w-0 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-4 py-2.5 data-[state=active]:bg-secondary shadow-none"
          >
            <FileText className="size-4 shrink-0 hidden sm:block" />
            <span className="truncate">Reports</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="w-full min-w-0 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-4 py-2.5 data-[state=active]:bg-secondary shadow-none"
          >
            <SettingsIcon className="size-4 shrink-0 hidden sm:block" />
            <span className="truncate">Settings</span>
          </TabsTrigger>
          <TabsTrigger
            value="dealership"
            className="w-full min-w-0 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-4 py-2.5 data-[state=active]:bg-secondary shadow-none"
          >
            <MapPin className="size-4 shrink-0 hidden sm:block" />
            <span className="truncate">Organization</span>
          </TabsTrigger>
          <TabsTrigger
            value="drivers"
            className="w-full min-w-0 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-4 py-2.5 data-[state=active]:bg-secondary shadow-none"
          >
            <Truck className="size-4 shrink-0 hidden sm:block" />
            <span className="truncate">Drivers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="m-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ReportCard
              title="Transportation"
              description="Shipment tracking, delivery performance, route analysis, and quotes."
              count={transportationCount}
              icon={<Truck className="size-5 text-primary" />}
              active={activeCategory === "transportation"}
              onClick={() => handleCardClick("transportation")}
              onViewAll={() => router.push("/reports?tab=Transportation")}
            />
            <ReportCard
              title="Driver Reports"
              description="Driver assignments, delivery outcomes, and per-driver performance."
              count={driverCount}
              icon={<MapPin className="size-5 text-primary" />}
              active={activeCategory === "driver"}
              onClick={() => handleCardClick("driver")}
              onViewAll={() => router.push("/reports?tab=Driver+Reports")}
            />
            <ReportCard
              title="Billings"
              description="Customer payments, driver payouts, and full transaction history."
              count={billingsCount}
              icon={<CreditCard className="size-5 text-primary" />}
              active={activeCategory === "billings"}
              onClick={() => handleCardClick("billings")}
              onViewAll={() => router.push("/reports?tab=Billings")}
            />
          </div>

          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg font-bold">
                    Recent Generated Files
                  </CardTitle>
                  {activeCategory && (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 text-xs font-medium pr-1.5"
                    >
                      {CATEGORY_LABELS[activeCategory]}
                      <button
                        onClick={() => setActiveCategory(null)}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors p-0.5"
                        title="Clear filter"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  )}
                </div>
                {activeCategory && (
                  <span className="text-xs text-muted-foreground">
                    {visibleFiles.length} of {files.length} files
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {visibleFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="size-8 mb-2 opacity-40" />
                  <p className="text-sm">
                    {activeCategory
                      ? "No files for this category"
                      : "No generated files yet"}
                  </p>
                  {activeCategory && (
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="text-xs text-primary mt-1 hover:underline"
                    >
                      Show all files
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {visibleFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      onDownload={() => handleDownload(file)}
                      onShare={() => handleShare(file)}
                      onDelete={() => setDeleteTarget(file)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <AlertDialog
            open={!!deleteTarget}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
            type="confirm"
            title="Delete File"
            message="Are you sure you want to delete this generated report file?"
            detail={deleteTarget?.name}
            warning="This action cannot be undone."
            showCloseButton={false}
            confirmText={isDeleting ? "Deleting…" : "Yes, delete"}
            cancelText="Cancel"
            onConfirm={handleDeleteConfirm}
          />
        </TabsContent>

        <TabsContent value="settings" className="m-0">
          <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                System Settings
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your dealership profile, security preferences, and global
                configurations.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
              {/* Settings Navigation */}
              <div className="xl:col-span-1 space-y-2">
                {SETTINGS_NAV_ITEMS.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <SettingNavItem
                      key={item.id}
                      label={item.label}
                      icon={<ItemIcon className="size-4" />}
                      active={activeSettingsSection === item.id}
                      onClick={() => setActiveSettingsSection(item.id)}
                    />
                  );
                })}
              </div>

              {/* Main Settings Content */}
              <div className="xl:col-span-3 space-y-4 sm:space-y-6">
                {activeSettingsSection === "account" && (
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">
                        Dealership Profile
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Information about your primary dealership location.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Dealership Name
                          </label>
                          <Input
                            value={systemSettings.account.dealershipName}
                            readOnly
                            onChange={(event) =>
                              setSystemSettings((prev) => ({
                                ...prev,
                                account: {
                                  ...prev.account,
                                  dealershipName: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Primary Location
                          </label>
                          <Input
                            value={systemSettings.account.primaryLocation}
                            readOnly
                            onChange={(event) =>
                              setSystemSettings((prev) => ({
                                ...prev,
                                account: {
                                  ...prev.account,
                                  primaryLocation: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            Auto-Sync DMS
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Automatically pull VIN-level data from your dealer
                            management system.
                          </p>
                        </div>
                        <Switch
                          checked={systemSettings.account.autoSyncDms}
                          disabled
                          onCheckedChange={(checked) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              account: {
                                ...prev.account,
                                autoSyncDms: checked,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            Public Condition Reports
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Make condition reports accessible via public URL for
                            VDP pages.
                          </p>
                        </div>
                        <Switch
                          checked={
                            systemSettings.account.publicConditionReports
                          }
                          disabled
                          onCheckedChange={(checked) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              account: {
                                ...prev.account,
                                publicConditionReports: checked,
                              },
                            }))
                          }
                        />
                      </div>
                      <Separator />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gap-2 bg-primary px-8"
                          onClick={() => openSystemSettingsEditor("account")}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSettingsSection === "locations" && (
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">
                        Locations & Inventory Defaults
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Configure operational defaults for lots, inventory
                        intake, and assignment behavior.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Default Intake Location
                          </label>
                          <Input
                            value={
                              systemSettings.locations.defaultIntakeLocation
                            }
                            readOnly
                            onChange={(event) =>
                              setSystemSettings((prev) => ({
                                ...prev,
                                locations: {
                                  ...prev.locations,
                                  defaultIntakeLocation: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Inventory Hold Window (Days)
                          </label>
                          <Input
                            value={
                              systemSettings.locations.inventoryHoldWindowDays
                            }
                            readOnly
                            onChange={(event) =>
                              setSystemSettings((prev) => ({
                                ...prev,
                                locations: {
                                  ...prev.locations,
                                  inventoryHoldWindowDays: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            Auto-assign to Nearest Lot
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Automatically assign incoming units based on
                            distance and lot capacity.
                          </p>
                        </div>
                        <Switch
                          checked={
                            systemSettings.locations.autoAssignNearestLot
                          }
                          disabled
                          onCheckedChange={(checked) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              locations: {
                                ...prev.locations,
                                autoAssignNearestLot: checked,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gap-2 bg-primary px-8"
                          onClick={() => openSystemSettingsEditor("locations")}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSettingsSection === "security" && (
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">
                        Security / RBAC
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Manage authentication hardening and role-based access
                        controls.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            Require MFA for Staff
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Require two-factor authentication for all employee
                            accounts.
                          </p>
                        </div>
                        <Switch
                          checked={systemSettings.security.requireMfaForStaff}
                          disabled
                          onCheckedChange={(checked) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              security: {
                                ...prev.security,
                                requireMfaForStaff: checked,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            Strict Role Enforcement
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Prevent cross-role access to pages and data by
                            default.
                          </p>
                        </div>
                        <Switch
                          checked={
                            systemSettings.security.strictRoleEnforcement
                          }
                          disabled
                          onCheckedChange={(checked) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              security: {
                                ...prev.security,
                                strictRoleEnforcement: checked,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Session Timeout (Minutes)
                        </label>
                        <Input
                          value={systemSettings.security.sessionTimeoutMinutes}
                          readOnly
                          onChange={(event) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              security: {
                                ...prev.security,
                                sessionTimeoutMinutes: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gap-2 bg-primary px-8"
                          onClick={() => openSystemSettingsEditor("security")}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSettingsSection === "notifications" && (
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">
                        Notification Preferences
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Choose where operational alerts and system events should
                        be delivered.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            Email Alerts
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Receive dispatch and inventory updates by email.
                          </p>
                        </div>
                        <Switch
                          checked={systemSettings.notifications.emailAlerts}
                          disabled
                          onCheckedChange={(checked) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                emailAlerts: checked,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            Push Notifications
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Receive real-time alerts in-app for urgent actions.
                          </p>
                        </div>
                        <Switch
                          checked={
                            systemSettings.notifications.pushNotifications
                          }
                          disabled
                          onCheckedChange={(checked) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                pushNotifications: checked,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Daily Digest Time
                        </label>
                        <Input
                          value={systemSettings.notifications.dailyDigestTime}
                          readOnly
                          onChange={(event) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                dailyDigestTime: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gap-2 bg-primary px-8"
                          onClick={() =>
                            openSystemSettingsEditor("notifications")
                          }
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSettingsSection === "integrations" && (
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">
                        Integrations
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Connect third-party platforms to synchronize data and
                        automate workflows.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
                          <div>
                            <p className="text-sm font-semibold">
                              Google Calendar
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sync appointments and reminders
                            </p>
                          </div>
                          <Badge variant="secondary">Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
                          <div>
                            <p className="text-sm font-semibold">
                              Dealer Management System
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sync inventory and pricing updates
                            </p>
                          </div>
                          <Badge variant="outline">Needs Setup</Badge>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gap-2 bg-primary px-8"
                          onClick={() =>
                            openSystemSettingsEditor("integrations")
                          }
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dealership" className="m-0">
          <Card className="border-none shadow-sm bg-card p-0 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-4">
              <CardTitle className="text-lg font-bold">
                Dealership Management
              </CardTitle>
              <CardDescription>
                Manage your dealership profile, invites, and team roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 min-h-100">
              <OrganizationMembersSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="m-0">
          <Card className="border-none shadow-sm bg-card p-0 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pt-4 pb-3">
              <CardTitle className="text-lg font-bold">
                Driver Management
              </CardTitle>
              <CardDescription>
                Review and manage driver access requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 min-h-100 space-y-6">
              <DriverRequestsSettings />
              <Separator />
              <DriverVerificationPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function UtilitiesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}

function ReportCard({
  title,
  description,
  count,
  icon,
  active,
  onClick,
  onViewAll,
}: {
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onViewAll: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`border shadow-sm transition-all cursor-pointer bg-card p-0 md:p-4 group ${
        active
          ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5"
          : "border-border/50 hover:border-primary/30 hover:ring-1 hover:ring-primary/20 hover:shadow-md"
      }`}
    >
      <CardContent className="p-2 md:p-6">
        <div className="flex gap-2 md:items-center justify-between mb-4">
          <div
            className={`size-10 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${active ? "bg-primary/10 border-primary/30" : "bg-secondary"}`}
          >
            {icon}
          </div>
          <Badge
            variant="outline"
            className={`h-5 text-[10px] font-bold transition-colors ${active ? "border-primary/40 text-primary" : "text-muted-foreground"}`}
          >
            {count} Files
          </Badge>
        </div>
        <h3
          className={`font-bold text-xs md:text-sm mb-1 transition-colors ${active ? "text-primary" : "text-foreground"}`}
        >
          {title}
        </h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed italic mb-3">
          {description}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewAll();
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
        >
          View in Reports <ArrowRight className="size-3" />
        </button>
      </CardContent>
    </Card>
  );
}

function FileRow({
  file,
  onDownload,
  onShare,
  onDelete,
}: {
  file: FileEntry;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 flex items-center justify-between group hover:bg-secondary transition-colors overflow-hidden">
      <div className="flex w-3/4 items-center gap-4 overflow-hidden text-clip">
        <div className="size-10 bg-secondary rounded flex items-center justify-center text-muted-foreground shrink-0">
          <FileText className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold overflow-hidden text-foreground group-hover:text-primary transition-colors text-ellipsis md:text-clip">
            {file.name}
          </h4>
          <div className="flex items-center gap-3 mt-0.5 border-none">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {file.date}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              {file.size}
            </span>
            <Badge className="bg-secondary text-muted-foreground hover:bg-secondary h-4 px-1 text-[8px] border-none">
              {file.type}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onDownload}
          title="Download"
        >
          <Download className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onShare}
          title="Share"
        >
          <Share2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SettingNavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
        active
          ? "bg-primary text-white shadow-sm"
          : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      <div
        className={`transition-transform duration-200 ${active ? "scale-110" : ""}`}
      >
        {icon}
      </div>
      {label}
    </button>
  );
}
