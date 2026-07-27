"use client";

import * as React from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportFormat = "pdf" | "xlsx";

interface ReportExportMenuProps {
  onDownload: (format: ExportFormat) => void;
  isDownloading?: boolean;
  label?: string;
  selectedCount?: number;
  size?: "sm" | "default";
  className?: string;
  menuAlign?: "left" | "right";
}

export function ReportExportMenu({
  onDownload,
  isDownloading = false,
  label = "Export",
  selectedCount,
  size = "sm",
  className = "",
  menuAlign = "right",
}: ReportExportMenuProps) {
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
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleDownload = (format: ExportFormat) => {
    setOpen(false);
    onDownload(format);
  };

  const displayLabel =
    selectedCount && selectedCount > 0
      ? `${label} (${selectedCount})`
      : label;

  return (
    <div ref={menuRef} className="relative inline-flex min-w-0">
      <Button
        type="button"
        size={size}
        className={`${
          size === "sm"
            ? "h-9 gap-2 rounded-lg px-3.5 text-xs font-semibold shadow-sm sm:text-sm"
            : "h-11 gap-2 rounded-xl px-5"
        } ${className}`}
        onClick={() => setOpen((current) => !current)}
        disabled={isDownloading}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        <span>{isDownloading ? "Generating" : displayLabel}</span>
        {!isDownloading && <ChevronDown className="size-3.5" />}
      </Button>

      {open && !isDownloading && (
        <div
          role="menu"
          className={`absolute top-[calc(100%+0.5rem)] z-50 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl ${
            menuAlign === "left" ? "left-0" : "right-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleDownload("pdf")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <FileText className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Download PDF</span>
              <span className="block text-xs text-muted-foreground">
                Ready for viewing and printing
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleDownload("xlsx")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Download Excel</span>
              <span className="block text-xs text-muted-foreground">
                Editable spreadsheet format
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}