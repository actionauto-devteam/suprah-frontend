"use client";

import React from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Lead } from "@/types/lead";

import { LeadSourceSection } from "./sections/LeadSourceSection";
import { LeadStatusSection } from "./sections/LeadStatusSection";

export type CRMReportType = "lead-status" | "lead-source";

type ExportFormat = "pdf" | "xlsx";

interface CRMPreviewModalProps {
  open: boolean;
  onClose: () => void;
  reportType: CRMReportType;
  leads: Lead[];
  monthLabel: string;
  isDownloading: boolean;
  onDownload: (format: ExportFormat) => void;
}

function PreviewDownloadMenu({
  isDownloading,
  onDownload,
}: {
  isDownloading: boolean;
  onDownload: (format: ExportFormat) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, []);

  React.useEffect(() => {
    if (isDownloading) {
      setOpen(false);
    }
  }, [isDownloading]);

  const selectFormat = (format: ExportFormat) => {
    setOpen(false);
    onDownload(format);
  };

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5 text-xs font-medium"
        onClick={() => setOpen((current) => !current)}
        disabled={isDownloading}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isDownloading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}

        <span>
          {isDownloading ? "Generating" : "Download"}
        </span>

        {!isDownloading && (
          <ChevronDown className="size-3.5" />
        )}
      </Button>

      {open && !isDownloading && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => selectFormat("pdf")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted"
          >
            <FileText className="size-4 text-red-500" />
            Download PDF
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => selectFormat("xlsx")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            Download Excel
          </button>
        </div>
      )}
    </div>
  );
}

export function CRMPreviewModal({
  open,
  onClose,
  reportType,
  leads,
  monthLabel,
  isDownloading,
  onDownload,
}: CRMPreviewModalProps) {
  const isLeadStatus = reportType === "lead-status";

  const title = isLeadStatus
    ? "Lead Status Report"
    : "Lead Source Report";

  const subtitle = isLeadStatus
    ? "Review lead activity grouped by current status"
    : "Review where leads originated during the selected period";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/65 backdrop-blur-sm"
        className="flex max-h-[92dvh] min-h-[62dvh] w-[96vw] max-w-300 flex-col gap-0 overflow-hidden rounded-2xl border-border/60 bg-background/95 p-0 shadow-2xl sm:max-w-[min(96vw,1200px)]"
      >
        <DialogTitle className="sr-only">
          {title}
        </DialogTitle>

        <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-border px-4 pb-4 pt-5 sm:flex-row sm:items-start sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/50">
              <Users className="size-4.5 text-cyan-600 dark:text-cyan-400" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold leading-tight text-foreground">
                {title}
              </h2>

              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {monthLabel}
                <span className="mx-1.5 opacity-40">·</span>
                Preview before download
              </p>

              <p className="mt-1 hidden text-[11px] text-muted-foreground sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto sm:mt-0.5">
            <PreviewDownloadMenu
              isDownloading={isDownloading}
              onDownload={onDownload}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close CRM report preview"
              onClick={onClose}
              className="size-9 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isLeadStatus ? (
            <LeadStatusSection leads={leads} periodLabel={monthLabel} />
          ) : (
            <LeadSourceSection leads={leads} periodLabel={monthLabel} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}