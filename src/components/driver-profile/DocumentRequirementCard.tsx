'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Upload, Camera, Eye, RotateCcw, Trash2, FileWarning, CheckCircle2, Clock,
  AlertTriangle, FileText,
} from 'lucide-react';
import { ComplianceDocument } from '@/types/driver-profile';
import { cn } from '@/lib/utils';

export type DocStatus = 'missing' | 'pending' | 'verified' | 'rejected';

interface Requirement {
  type: string;
  label: string;
  description: string;
  required: boolean;
}

interface Props {
  item: Requirement;
  icon: React.ElementType;
  status: DocStatus;
  documents: ComplianceDocument[];
  expirationOf: (expiresAt?: string) => { label: string; className: string } | null;
  formatSize: (bytes: number) => string;
  formatDate: (value: string) => string;
  onPickFile: (type: string, file: File) => void;
  onBrowse: (type: string) => void;
  onView: (doc: ComplianceDocument) => void;
  onReplace: (doc: ComplianceDocument) => void;
  onDelete: (docId: string) => void;
  disabled?: boolean;
}

const STATUS_META: Record<DocStatus, { label: string; icon: React.ElementType; className: string }> = {
  missing: { label: 'Needed', icon: AlertTriangle, className: 'border-border bg-muted text-muted-foreground' },
  pending: { label: 'Under review', icon: Clock, className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  verified: { label: 'Verified', icon: CheckCircle2, className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  rejected: { label: 'Needs a new upload', icon: FileWarning, className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400' },
};

export function DocumentRequirementCard({
  item, icon: Icon, status, documents, expirationOf, formatSize, formatDate,
  onPickFile, onBrowse, onView, onReplace, onDelete, disabled,
}: Props) {
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const latest = documents[documents.length - 1];
  const rejected = status === 'rejected';

  const accept = '.jpg,.jpeg,.png,.webp,.pdf';

  const take = (file?: File | null) => {
    if (file) onPickFile(item.type, file);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-card transition-colors',
        rejected ? 'border-red-500/40' : 'border-border',
        dragOver && 'border-primary ring-2 ring-primary/20',
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md border',
            status === 'verified' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : status === 'rejected' ? 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400'
                : status === 'pending' ? 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-border bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">{item.label}</h3>
            {item.required && (
              <span className="rounded border border-border px-1.5 py-px text-[10px] text-muted-foreground">
                Required
              </span>
            )}
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', meta.className)}>
              <StatusIcon className="size-3" />
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
        </div>
      </div>

      {rejected && latest?.rejectionReason && (
        <div className="mx-4 mb-3 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            Why it was rejected
          </p>
          <p className="mt-0.5 text-xs text-red-600/90 dark:text-red-400/90">{latest.rejectionReason}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Upload a corrected version below — your application continues once it&apos;s approved.
          </p>
        </div>
      )}

      {(status === 'missing' || rejected) && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            take(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'mx-4 mb-4 rounded-md border border-dashed px-4 py-5 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
          )}
        >
          <input
            ref={fileRef} type="file" accept={accept} className="hidden"
            onChange={e => { take(e.target.files?.[0]); e.target.value = ''; }}
          />
          <input
            ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { take(e.target.files?.[0]); e.target.value = ''; }}
          />

          <p className="hidden text-xs text-muted-foreground sm:block">
            Drag a photo or PDF here
          </p>
          <div className="flex flex-col gap-2 sm:mt-3 sm:flex-row sm:justify-center">
            <Button
              size="sm" variant="outline" className="gap-1.5"
              onClick={() => cameraRef.current?.click()} disabled={disabled}
            >
              <Camera className="size-3.5" /> Take photo
            </Button>
            <Button
              size="sm" variant="outline" className="gap-1.5"
              onClick={() => fileRef.current?.click()} disabled={disabled}
            >
              <Upload className="size-3.5" /> Choose file
            </Button>
          </div>
          <p className="mt-2.5 text-[11px] text-muted-foreground">
            JPG, PNG, WebP or PDF · up to 5MB
          </p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="divide-y divide-border border-t border-border">
          {documents.map(doc => {
            const exp = expirationOf(doc.expiresAt);
            return (
              <div key={doc._id} className="flex items-center gap-3 px-4 py-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {doc.label || doc.fileName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">{formatSize(doc.fileSize)}</span>
                    {doc.uploadedAt && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{formatDate(doc.uploadedAt)}</span>
                      </>
                    )}
                    {exp && (
                      <>
                        <span aria-hidden>·</span>
                        <span className={exp.className}>{exp.label}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => onView(doc)} aria-label="View document">
                    <Eye className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => onReplace(doc)} aria-label="Replace document">
                    <RotateCcw className="size-4" />
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="size-8 text-destructive"
                    onClick={() => onDelete(doc._id)}
                    aria-label="Delete document"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status !== 'missing' && !rejected && (
        <div className="border-t border-border px-4 py-2">
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => onBrowse(item.type)} disabled={disabled}>
            <Upload className="size-3.5" /> Upload another version
          </Button>
        </div>
      )}
    </div>
  );
}
