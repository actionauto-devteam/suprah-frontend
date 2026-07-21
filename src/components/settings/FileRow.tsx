"use client";

import { FileText, Download, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FileEntry } from "./settings-constants";

export function FileRow({
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
    <div className="group flex min-w-0 flex-col gap-3 p-3 transition-colors hover:bg-secondary sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex flex-1 min-w-0 items-center gap-3 sm:gap-4">
        <div className="size-9 sm:size-10 bg-secondary rounded flex items-center justify-center text-muted-foreground shrink-0">
          <FileText className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:truncate">
            {file.name}
          </h4>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5">
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
      <div className="grid w-full grid-cols-3 items-center gap-1 border-t border-border/60 pt-2 sm:flex sm:w-auto sm:border-0 sm:pt-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 flex-1 gap-2 px-3 text-muted-foreground sm:size-8 sm:flex-none sm:px-0"
          onClick={onDownload}
          title="Download"
        >
          <Download className="size-4" />
          <span className="text-xs sm:hidden">Download</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 flex-1 gap-2 px-3 text-muted-foreground sm:size-8 sm:flex-none sm:px-0"
          onClick={onShare}
          title="Share"
        >
          <Share2 className="size-4" />
          <span className="text-xs sm:hidden">Share</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 flex-1 gap-2 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive sm:size-8 sm:flex-none sm:px-0"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="size-4" />
          <span className="text-xs sm:hidden">Delete</span>
        </Button>
      </div>
    </div>
  );
}