"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Truck,
  MapPin,
  CreditCard,
  Share2,
  Printer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  listGeneratedReportFiles,
  getGeneratedReportFileBlob,
  deleteGeneratedReportFile,
} from "@/lib/report-files";
import {
  CATEGORY_LABELS,
  formatFileSize,
  formatRelativeFileTime,
  type FileEntry,
  type ReportCategory,
  type ShareTarget,
} from "./settings-constants";
import { ReportCategoryCard } from "./ReportCategoryCard";
import { FileRow } from "./FileRow";

export function ReportsFilesTab() {
  const router = useRouter();

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
  const [deleteTarget, setDeleteTarget] = React.useState<FileEntry | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeCategory, setActiveCategory] =
    React.useState<ReportCategory | null>(null);
  const [shareTarget, setShareTarget] = React.useState<ShareTarget>({
    type: "reports-area",
  });

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

      const generatedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Denver' });
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

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="sticky top-0 z-10 grid grid-cols-2 gap-2 rounded-xl bg-background/90 py-2 backdrop-blur sm:static sm:flex sm:justify-end sm:bg-transparent sm:py-0">
        <Button
          variant="outline"
          size="sm"
          className="h-10 shrink-0 gap-2 sm:h-9"
          onClick={openShareAccessDialog}
        >
          <Share2 className="size-4" /> Share Access
        </Button>
        <Button
          size="sm"
          className="h-10 shrink-0 gap-2 bg-primary sm:h-9"
          onClick={openBulkPrintDialog}
        >
          <Printer className="size-4" /> Bulk Print
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
        <div className="min-w-0"><ReportCategoryCard
          title="Transportation"
          description="Shipment tracking, delivery performance, route analysis, and quotes."
          count={transportationCount}
          icon={<Truck className="size-5 text-primary" />}
          active={activeCategory === "transportation"}
          onClick={() => handleCardClick("transportation")}
          onViewAll={() => router.push("/reports?tab=Transportation")}
        /></div>
        <div className="min-w-0"><ReportCategoryCard
          title="Driver Reports"
          description="Driver assignments, delivery outcomes, and per-driver performance."
          count={driverCount}
          icon={<MapPin className="size-5 text-primary" />}
          active={activeCategory === "driver"}
          onClick={() => handleCardClick("driver")}
          onViewAll={() => router.push("/reports?tab=Driver+Reports")}
        /></div>
        <div className="min-w-0"><ReportCategoryCard
          title="Billings"
          description="Customer payments, driver payouts, and full transaction history."
          count={billingsCount}
          icon={<CreditCard className="size-5 text-primary" />}
          active={activeCategory === "billings"}
          onClick={() => handleCardClick("billings")}
          onViewAll={() => router.push("/reports?tab=Billings")}
        /></div>
      </div>

      <Card className="min-w-0 overflow-hidden border-none bg-card shadow-sm">
        <CardHeader className="border-b px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
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

      <Dialog open={isShareAccessOpen} onOpenChange={setIsShareAccessOpen}>
        <DialogContent className="inset-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 bg-card text-card-foreground shadow-2xl sm:inset-auto sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100vw-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-card-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 shrink-0">
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
                className="min-h-20 text-base sm:text-sm border-border/80 bg-background text-foreground shadow-xs placeholder:text-muted-foreground/70 focus-visible:border-primary/70 focus-visible:ring-primary/20"
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
                  className="h-10 sm:h-9 w-full border-border/80 bg-background text-foreground shadow-xs focus:ring-primary/20"
                >
                  <SelectValue placeholder="Choose permission" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  position="popper"
                  sideOffset={4}
                  className="z-70 w-(--radix-select-trigger-width) max-w-[calc(100vw-2rem)] border-border/70 bg-popover p-1 shadow-xl"
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
                className="h-10 sm:h-9 text-base sm:text-sm border-border/80 bg-background text-foreground shadow-xs placeholder:text-muted-foreground/70 focus-visible:border-primary/70 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyShareAccessLink}
              className="h-10 sm:h-9 border-border bg-background text-foreground shadow-xs hover:bg-muted hover:text-foreground"
            >
              Copy Link
            </Button>
            <Button
              type="button"
              onClick={handleShareAccess}
              disabled={isSharingAccess}
              className="h-10 sm:h-9 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Select files to print
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
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
                  className="h-9"
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
              className="h-10 sm:h-9"
              onClick={() => setIsBulkPrintOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 sm:h-9 bg-primary"
              onClick={handleBulkPrint}
              disabled={isPrinting || selectedPrintFileIds.length === 0}
            >
              {isPrinting
                ? "Preparing…"
                : `Print (${selectedPrintFileIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}