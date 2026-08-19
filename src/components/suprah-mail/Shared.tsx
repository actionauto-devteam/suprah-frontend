'use client';

import * as React from 'react';
import { FileText, Link2, Loader2, Mail, Moon, Sun, X } from 'lucide-react';
import { ini, avaColor, fmtSize } from './utils';

/* ── Avatar ────────────────────────────────────────────────────────────── */

export function Avatar({ seed, size = 36, icon, fontSize }: {
  seed: string; size?: number; icon?: React.ReactNode; fontSize?: number;
}) {
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center text-white font-semibold"
      style={{ height: size, width: size, background: avaColor(seed), fontSize: fontSize ?? Math.round(size / 3) }}
    >
      {icon ?? ini(seed)}
    </div>
  );
}

/* ── Upload progress ───────────────────────────────────────────────────── */

export function UploadProgressBar({ progress }: { progress: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="sm5-progress-track flex-1">
        <div className="sm5-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="sm5-mono shrink-0" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
        {progress}%
      </span>
    </div>
  );
}

/* ── Pending (not yet uploaded) file chip ──────────────────────────────── */

export function PendingFileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/');
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isImg) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImg]);

  return (
    <div
      className="relative flex items-center gap-2 rounded-xl px-2.5 py-2 shrink-0"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', maxWidth: 220 }}
    >
      {preview ? (
        <img src={preview} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)' }}>
          <FileText className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{file.name}</p>
        <p className="sm5-mono" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{fmtSize(file.size)}</p>
      </div>
      <button onClick={onRemove} className="sm5-icon-btn h-5 w-5 shrink-0" title="Remove">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ── Sandboxed HTML email body ─────────────────────────────────────────── */

/**
 * Renders an email's HTML body inside a script-less sandboxed iframe.
 * `allow-same-origin` (WITHOUT allow-scripts) lets the parent measure the
 * body's scrollHeight so the frame auto-sizes — scripts still cannot run.
 *
 * The rendering follows the app theme by default. Because many marketing
 * emails hard-code white designs, a small sun/moon chip on the card lets the
 * reader flip that one message between dark and light rendering.
 */
export function HtmlBodyFrame({ html, theme = 'dark' }: { html: string; theme?: 'dark' | 'light' }) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(160);
  const [mode, setMode] = React.useState<'dark' | 'light'>(theme);

  // Follow the app theme when it changes.
  React.useEffect(() => { setMode(theme); }, [theme]);

  const doc = React.useMemo(() => {
    const palette = mode === 'dark'
      ? `background:#171a1e;color:rgba(255,255,255,0.9);`
      : `background:#ffffff;color:#1f2328;`;
    const link = mode === 'dark' ? '#7be3ad' : '#16a34a';
    const quote = mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
      html,body{margin:0;padding:0;}
      body{padding:16px;font-family:Geist,-apple-system,sans-serif;font-size:14px;line-height:1.6;
        ${palette}word-break:break-word;overflow-x:hidden;}
      img{max-width:100%!important;height:auto!important;} a{color:${link};}
      blockquote{border-left:3px solid ${quote};margin:8px 0;padding-left:12px;color:inherit;opacity:.8;}
      table{max-width:100%!important;border-collapse:collapse;}
      td,th{word-break:break-word;}
    </style></head><body>${html}</body></html>`;
  }, [html, mode]);

  const measure = React.useCallback(() => {
    try {
      const h = ref.current?.contentWindow?.document?.body?.scrollHeight;
      if (h) setHeight(Math.min(Math.max(h + 8, 80), 20000));
    } catch {
      /* keep default */
    }
  }, []);

  // Re-measure after images load (they change the height).
  React.useEffect(() => {
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [doc, measure]);

  return (
    <div
      className="relative rounded-xl overflow-hidden group/frame"
      style={{ background: mode === 'dark' ? '#171a1e' : '#ffffff', border: '1px solid var(--border-2)' }}
    >
      <button
        onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
        className="absolute top-2 right-2 z-10 h-7 w-7 rounded-lg flex items-center justify-center transition-opacity opacity-40 hover:opacity-100"
        style={{
          background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'}`,
          color: mode === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)',
        }}
        title={mode === 'dark' ? 'View this email on light' : 'View this email on dark'}
      >
        {mode === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
      <iframe
        ref={ref}
        sandbox="allow-same-origin"
        srcDoc={doc}
        title="Email body"
        className="w-full border-0 block"
        style={{ height, colorScheme: mode }}
        scrolling="no"
        onLoad={measure}
      />
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function EmptyState({ icon, title, hint }: {
  icon: React.ReactNode; title?: string; hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 px-6 text-center">
      <div className="mb-1" style={{ color: 'var(--text-disabled)' }}>{icon}</div>
      {title && <p className="sm5-title-md">{title}</p>}
      <p className="sm5-supporting" style={{ maxWidth: 300 }}>{hint}</p>
    </div>
  );
}

export function CenterSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );
}

/* ── Connect Gmail landing ─────────────────────────────────────────────── */

export function ConnectGmailScreen({ connecting, onConnect }: {
  connecting: boolean; onConnect: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5 text-center" style={{ maxWidth: 380 }}>
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--accent-muted)', border: '1px dashed rgba(52,201,125,0.35)' }}
        >
          <Mail className="h-7 w-7" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="sm5-title-xl">
            Connect your Gmail
          </p>
          <p className="sm5-body mt-2">
            Suprah One Desk brings your Gmail inbox and email-powered conversations into the platform.
            Read, send, reply, and manage attachments — everything stays synchronized with Gmail in real time.
          </p>
        </div>
        <button onClick={onConnect} disabled={connecting} className="sm5-btn h-10 px-5 flex items-center gap-2" style={{ fontSize: 13 }}>
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          {connecting ? 'Opening Google…' : 'Connect Gmail account'}
        </button>
        <p className="sm5-helper">
          You'll be redirected to Google to grant access. Suprah only requests mail read/send
          permissions and never sees your password.
        </p>
      </div>
    </div>
  );
}