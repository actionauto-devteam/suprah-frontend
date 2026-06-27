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
    <div className="p-3 sm:p-4 flex items-center justify-between gap-3 group hover:bg-secondary transition-colors">
      <div className="flex flex-1 min-w-0 items-center gap-3 sm:gap-4">
        <div className="size-9 sm:size-10 bg-secondary rounded flex items-center justify-center text-muted-foreground shrink-0">
          <FileText className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">
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
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 sm:size-8 text-muted-foreground"
          onClick={onDownload}
          title="Download"
        >
          <Download className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 sm:size-8 text-muted-foreground"
          onClick={onShare}
          title="Share"
        >
          <Share2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 sm:size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
