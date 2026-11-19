'use client';

import * as React from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Trash2, ExternalLink, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Button, Select, Spinner } from './ui';
import { dealDeskApi } from '@/lib/deal-desk/api';
import { documentUrl } from '@/lib/deal-desk/http';
import { toast } from '@/lib/deal-desk/hooks';
import { DOC_LABELS, shortTime, cn } from '@/lib/deal-desk/format';
import type { DealDetail, DealDocument } from '@/lib/deal-desk/types';

const KINDS = ['four_square', 'credit_app', 'drivers_license', 'proof_income', 'proof_residence', 'insurance', 'trade_title', 'other'];
const REQUIRED = ['four_square', 'credit_app', 'drivers_license'];

function sizeLabel(b: number) {
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsPanel({ dealId, documents, canUpload, canDelete, onChange, compact }: { dealId: string; documents: DealDocument[]; canUpload: boolean; canDelete: boolean; onChange: (d: DealDetail) => void; compact?: boolean }) {
  const have = new Set(documents.map((d) => d.kind));
  const firstMissing = REQUIRED.find((k) => !have.has(k)) || 'proof_income';
  const [kind, setKind] = React.useState(firstMissing);
  const [uploads, setUploads] = React.useState<{ name: string; pct: number }[]>([]);
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => setKind(firstMissing), [firstMissing]);

  const upload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        toast({ title: `${file.name} is over 15 MB`, tone: 'error' });
        continue;
      }
      setUploads((u) => [...u, { name: file.name, pct: 0 }]);
      try {
        const res = await dealDeskApi.uploadDocument(dealId, file, kind, (pct) => setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, pct } : x))));
        onChange(res.deal);
        toast({ title: `${DOC_LABELS[kind]} uploaded`, tone: 'success' }, 2500);
      } catch (e: any) {
        toast({ title: 'Upload failed', body: e.message, tone: 'error' });
      } finally {
        setUploads((u) => u.filter((x) => x.name !== file.name));
      }
    }
  };

  const remove = async (doc: DealDocument) => {
    if (!confirm(`Remove ${doc.name}?`)) return;
    try {
      const res = await dealDeskApi.deleteDocument(dealId, doc.id);
      onChange(res.deal);
    } catch (e: any) {
      toast({ title: 'Couldn’t remove the document', body: e.message, tone: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {REQUIRED.map((k) => (
          <span key={k} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', have.has(k) ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-dashed border-border text-muted-foreground')}>
            {have.has(k) ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
            {DOC_LABELS[k]}
          </span>
        ))}
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', have.has('proof_income') ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-dashed border-border text-muted-foreground')}>
          {have.has('proof_income') ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
          Proof of income <span className="opacity-60">(recommended)</span>
        </span>
      </div>

      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
          }}
          className={cn('relative rounded-xl border-2 border-dashed p-4 transition-colors sm:p-5', drag ? 'border-primary bg-primary/5' : 'border-border bg-muted/20')}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <UploadCloud className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Drop files here or take a photo</div>
                <div className="text-xs text-muted-foreground">PDF, JPG, PNG or HEIC · up to 15 MB · the AI reads them automatically</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 w-full sm:w-48">
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {DOC_LABELS[k]}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="outline" size="md" onClick={() => inputRef.current?.click()}>
                Choose
              </Button>
              <input ref={inputRef} type="file" accept="application/pdf,image/*" capture={undefined} multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
            </div>
          </div>
          {uploads.map((u) => (
            <div key={u.name} className="mt-3 flex items-center gap-3 text-xs">
              <Spinner className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${u.pct}%` }} />
              </div>
              <span className="w-8 text-right tabular-nums">{u.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <ul className={cn('grid gap-2', !compact && 'sm:grid-cols-2')}>
          {documents.map((d) => {
            const isImg = d.mime.startsWith('image/');
            return (
              <li key={d.id} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className={cn('grid size-10 shrink-0 place-items-center rounded-lg', isImg ? 'bg-sky-500/10 text-sky-600' : 'bg-rose-500/10 text-rose-600')}>
                  {isImg ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    {DOC_LABELS[d.kind] || d.kind}
                    {d.hasExtraction && <Sparkles className="size-3" aria-label="Read by AI" />}
                  </div>
                  <div className="truncate text-sm">{d.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {sizeLabel(d.size)} · {d.uploadedBy?.name || '—'} · {shortTime(d.uploadedAt)}
                  </div>
                </div>
                <a href={documentUrl(dealId, d.id)} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Open">
                  <ExternalLink className="size-4" />
                </a>
                {canDelete && (
                  <button onClick={() => remove(d)} className="rounded-md p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600" aria-label="Remove">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
