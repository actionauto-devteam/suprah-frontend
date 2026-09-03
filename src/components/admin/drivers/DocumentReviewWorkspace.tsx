'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, ZoomIn, ZoomOut, RotateCw, Maximize2, ChevronLeft, ChevronRight,
  Check, X, FileText, AlertTriangle, Download, ShieldCheck,
} from 'lucide-react';
import { ComplianceDocument, DriverProfile } from '@/types/driver-profile';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Kbd, FieldRow } from '@/components/admin/primitives';
import { cn } from '@/lib/utils';

const REJECTION_PRESETS = [
  'Image is blurry or unreadable',
  'Document is expired',
  'Wrong document type uploaded',
  'Details do not match the profile',
  'Document is cropped — edges missing',
  'Photo of a screen, not the original',
];

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' }) : '';

const fmtSize = (b?: number) =>
  !b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const expiryState = (d?: string) => {
  if (!d) return null;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: 'critical' as const };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: 'warning' as const };
  return { label: `Valid — ${fmtDate(d)}`, tone: 'ok' as const };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: ComplianceDocument[];
  startIndex?: number;
  profile: DriverProfile;
  driverName: string;
  loadFile: (doc: ComplianceDocument) => Promise<{ url: string; mimeType: string }>;
  onApprove: (doc: ComplianceDocument) => Promise<void>;
  onReject: (doc: ComplianceDocument, reason: string) => Promise<void>;
}

export function DocumentReviewWorkspace({
  open, onOpenChange, documents, startIndex = 0, profile, driverName,
  loadFile, onApprove, onReject,
}: Props) {
  const [index, setIndex] = React.useState(startIndex);
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [fileUrl, setFileUrl] = React.useState('');
  const [mimeType, setMimeType] = React.useState('');
  const [fileLoading, setFileLoading] = React.useState(false);
  const [fileError, setFileError] = React.useState('');
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const doc = documents[index];
  const total = documents.length;
  const reviewedCount = documents.filter(d => d.verified || d.reviewStatus === 'rejected').length;

  React.useEffect(() => { if (open) setIndex(startIndex); }, [open, startIndex]);

  React.useEffect(() => {
    setZoom(1); setRotation(0); setRejecting(false); setReason('');
  }, [index]);

  React.useEffect(() => {
    if (!open || !doc?._id) return;
    let cancelled = false;
    let objectUrl = '';
    setFileLoading(true); setFileError(''); setFileUrl('');
    void (async () => {
      try {
        const result = await loadFile(doc);
        if (cancelled) { URL.revokeObjectURL(result.url); return; }
        objectUrl = result.url;
        setFileUrl(result.url);
        setMimeType(result.mimeType);
      } catch {
        if (!cancelled) setFileError('This document could not be opened.');
      } finally {
        if (!cancelled) setFileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, doc, loadFile]);

  const go = React.useCallback((delta: number) => {
    setIndex(i => Math.min(Math.max(i + delta, 0), total - 1));
  }, [total]);

  const approve = React.useCallback(async () => {
    if (!doc || busy) return;
    setBusy(true);
    try {
      await onApprove(doc);
      if (index < total - 1) go(1);
    } finally { setBusy(false); }
  }, [doc, busy, onApprove, index, total, go]);

  const submitRejection = async () => {
    if (!doc || reason.trim().length < 3) return;
    setBusy(true);
    try {
      await onReject(doc, reason.trim());
      setRejecting(false); setReason('');
      if (index < total - 1) go(1);
    } finally { setBusy(false); }
  };

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); go(-1); }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); void approve(); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setRejecting(true); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(z => Math.min(z + 0.25, 4)); }
      if (e.key === '-') { e.preventDefault(); setZoom(z => Math.max(z - 0.25, 0.5)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, go, approve]);

  if (!doc) return null;

  const expiry = expiryState(doc.expiresAt);
  const decided = doc.verified || doc.reviewStatus === 'rejected';
  const docStatus = doc.verified ? 'approved' : doc.reviewStatus === 'rejected' ? 'rejected' : 'pending';

  const crossCheck = (() => {
    if (doc.type === 'drivers_license') {
      return [
        { label: 'CDL number', value: profile.driversLicenseNumber, mono: true },
        { label: 'Issuing state', value: profile.licenseState },
        { label: 'Expiration on file', value: fmtDate(profile.licenseExpirationDate) },
        { label: 'Name on profile', value: driverName },
      ];
    }
    if (doc.type === 'insurance_certificate' || doc.type === 'liability_insurance' || doc.type === 'cargo_insurance') {
      return [
        { label: 'Provider', value: profile.insuranceProvider },
        { label: 'Policy number', value: profile.insurancePolicyNumber, mono: true },
        { label: 'Expiration on file', value: fmtDate(profile.insuranceExpirationDate) },
      ];
    }
    if (doc.type === 'medical_card') {
      return [{ label: 'Expiration on file', value: fmtDate(profile.medicalCardExpirationDate) }];
    }
    if (doc.type === 'vehicle_registration') {
      return [
        { label: 'VIN', value: profile.vin, mono: true },
        { label: 'Plate', value: profile.plateNumber, mono: true },
        { label: 'Truck', value: [profile.truckMake, profile.truckModel].filter(Boolean).join(' ') },
      ];
    }
    if (doc.type === 'operating_authority') {
      return [
        { label: 'DOT number', value: profile.dotNumber, mono: true },
        { label: 'MC number', value: profile.mcNumber, mono: true },
      ];
    }
    return [];
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[92vh] sm:w-[96vw] sm:max-w-7xl sm:rounded-xl sm:border"
      >
        <DialogTitle className="sr-only">Reviewing {doc.label} for {driverName}</DialogTitle>

        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{doc.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {driverName} · {fmtSize(doc.fileSize)} · Uploaded {fmtDate(doc.uploadedAt)}
              </p>
            </div>
            <StatusBadge status={docStatus} domain="documentReview" />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
              {index + 1} / {total}
            </span>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => go(-1)} disabled={index === 0}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => go(1)} disabled={index >= total - 1}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative flex min-h-0 flex-1 flex-col bg-muted/40">
            <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card/60 px-2 py-1.5 backdrop-blur">
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setZoom(z => Math.min(z + 0.25, 4))}>
                <ZoomIn className="size-3.5" />
              </Button>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setRotation(r => (r + 90) % 360)}>
                <RotateCw className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => { setZoom(1); setRotation(0); }}>
                <Maximize2 className="size-3.5" />
              </Button>
              {fileUrl && (
                <Button variant="ghost" size="icon" className="ml-auto size-7" asChild>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab">
                    <Download className="size-3.5" />
                  </a>
                </Button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {fileLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : fileError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <AlertTriangle className="size-8 text-destructive" />
                  <p className="text-sm text-destructive">{fileError}</p>
                </div>
              ) : fileUrl && mimeType.startsWith('image/') ? (
                <div className="flex min-h-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={doc.label}
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                    className="max-w-full origin-center rounded-md shadow-lg transition-transform duration-150"
                  />
                </div>
              ) : fileUrl && mimeType === 'application/pdf' ? (
                <iframe src={fileUrl} title={doc.label} className="h-full min-h-[60vh] w-full rounded-md border border-border bg-background" />
              ) : fileUrl ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <FileText className="size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No inline preview for this file type</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">Open file</a>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="flex w-full shrink-0 flex-col border-t border-border bg-card lg:w-96 lg:border-l lg:border-t-0">
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Queue
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {reviewedCount}/{total} reviewed
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${total ? (reviewedCount / total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {documents.map((d, i) => (
                      <button
                        key={d._id}
                        type="button"
                        onClick={() => setIndex(i)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                          i === index ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/50',
                        )}
                      >
                        <span className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          d.verified ? 'bg-emerald-500' : d.reviewStatus === 'rejected' ? 'bg-red-500' : 'bg-amber-500',
                        )} />
                        <span className="truncate">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {expiry && (
                  <div className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-xs',
                    expiry.tone === 'critical' && 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
                    expiry.tone === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    expiry.tone === 'ok' && 'border-border bg-muted/40 text-muted-foreground',
                  )}>
                    {expiry.tone !== 'ok' && <AlertTriangle className="size-3.5 shrink-0" />}
                    {expiry.label}
                  </div>
                )}

                {crossCheck.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Cross-check
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Confirm these match what the document shows.
                    </p>
                    <div className="divide-y divide-border rounded-md border border-border px-3">
                      {crossCheck.map(f => (
                        <FieldRow key={f.label} label={f.label} value={f.value} mono={f.mono} />
                      ))}
                    </div>
                  </div>
                )}

                {doc.reviewStatus === 'rejected' && doc.rejectionReason && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                      Rejected
                    </p>
                    <p className="mt-0.5 text-xs text-red-600/90 dark:text-red-400/90">{doc.rejectionReason}</p>
                  </div>
                )}

                {rejecting && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-foreground">Reason for rejection</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REJECTION_PRESETS.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setReason(preset)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                            reason === preset
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:bg-accent',
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Add detail the driver can act on…"
                      rows={3}
                      className="text-xs"
                      autoFocus
                    />
                    <p className="text-[11px] text-muted-foreground">
                      The driver is notified with this message.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="shrink-0 space-y-2 border-t border-border p-3">
              {rejecting ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setRejecting(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={submitRejection}
                    disabled={busy || reason.trim().length < 3}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                    Confirm rejection
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
                    onClick={() => setRejecting(true)}
                    disabled={busy}
                  >
                    <X className="size-4" /> Reject
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
                    onClick={approve}
                    disabled={busy}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {decided && doc.verified ? 'Approved' : 'Approve'}
                  </Button>
                </div>
              )}
              <div className="hidden items-center justify-center gap-3 text-[11px] text-muted-foreground sm:flex">
                <span className="flex items-center gap-1"><Kbd>A</Kbd> approve</span>
                <span className="flex items-center gap-1"><Kbd>R</Kbd> reject</span>
                <span className="flex items-center gap-1"><Kbd>←</Kbd><Kbd>→</Kbd> navigate</span>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
