import type { ConvMessage, MailConv } from './types';

/* ── Constants ─────────────────────────────────────────────────────────── */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Formatting ────────────────────────────────────────────────────────── */

/** Two-letter initials from a name or email. */
export const ini = (n: string) =>
  (n || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export const fmtListDate = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fmtChatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const fmtChatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/* ── Auth / errors ─────────────────────────────────────────────────────── */

/** Reads the `type` claim from a JWT without verifying it (UI-side guard only). */
export function getJwtType(token: string | null): string | null {
  if (!token || typeof atob === 'undefined') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return (JSON.parse(atob(padded)) as { type?: string }).type || null;
  } catch {
    return null;
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  const msg = (error as any)?.response?.data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

/* ── Files ─────────────────────────────────────────────────────────────── */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Validates a FileList against count/size limits.
 * Returns the accepted files, or an error string.
 */
export function validateFiles(
  list: FileList | null,
  existingCount: number,
): { files: File[] } | { error: string } {
  if (!list) return { files: [] };
  const selected = Array.from(list);
  if (existingCount + selected.length > MAX_FILES) {
    return { error: `Up to ${MAX_FILES} attachments per message.` };
  }
  for (const f of selected) {
    if (f.size > MAX_FILE_BYTES) return { error: `${f.name} exceeds 25 MB.` };
    if (f.size === 0) return { error: `${f.name} is empty.` };
  }
  return { files: selected };
}

/* ── Avatars & conversation naming ─────────────────────────────────────── */

const AVA_COLORS = [
  'linear-gradient(140deg,#169a58,#34c97d)',
  'linear-gradient(140deg,#3a5ce0,#5b7cf6)',
  'linear-gradient(140deg,#7038c0,#9b6fd6)',
  'linear-gradient(140deg,#b06a14,#e0a13a)',
];
export const avaColor = (s: string) => AVA_COLORS[(s || 'x').charCodeAt(0) % AVA_COLORS.length];

export function convDisplayName(c: MailConv): string {
  if (c.title?.trim()) return c.title.trim();
  const names = c.participants.map((p) => p.name || p.email);
  if (names.length === 0) return c.subject || 'Conversation';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function convAvatarSeed(c: MailConv): string {
  return c.title || c.participants[0]?.name || c.participants[0]?.email || c.subject || 'x';
}

export function isGroupConv(c: MailConv | undefined): boolean {
  if (!c) return false;
  return c.type === 'group' || c.participants.length > 1;
}

/** Short first-name-ish label for a sender inside a group bubble. */
export function senderLabel(m: ConvMessage): string {
  if (m.fromName?.trim()) return m.fromName.trim().split(' ')[0];
  return (m.fromEmail || '').split('@')[0];
}