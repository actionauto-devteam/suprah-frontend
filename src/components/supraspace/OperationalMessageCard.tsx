'use client';

import * as React from 'react';
import { AlertTriangle, BellRing, Clock3, FileText, MapPin } from 'lucide-react';

export type OperationalMessageKind = 'daypulse' | 'shift-alert';

type OperationalAttachment = { url: string; originalName?: string };

type OperationalMessageCardProps = {
  kind: OperationalMessageKind;
  content: string;
  createdAt?: string;
  attachments?: OperationalAttachment[];
  compact?: boolean;
};

const URL_PATTERN = /(https?:\/\/[^\s<]+)/gi;
const DAYPULSE_SECTION_PATTERN = /^\*{0,2}\s*(Accomplishments|Blockers|In Progress)\s*\*{0,2}\s*$/i;
const DAYPULSE_ESCAPED_DELIMITER_PATTERN = /((?:\\\*){1,3}|\\\*{1,3})(?=\S)([\s\S]*?\S)\1/g;
const DAYPULSE_CROSS_LINE_DELIMITER_PATTERN = /^(\*{1,3})(?=\S)(?![^\n]*\1)([^\n]*\n[\s\S]*?\S)\1(?=\s*(?:\n|$))/gm;

function timeLabel(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function cleanDayPulseLabel(line: string): string {
  return line.replace(/^\s*\*{2}\s*|\s*\*{2}\s*$/g, '').trim();
}

function normalizeDayPulseContent(content: string): string {
  return content
    .replace(/\r\n?/g, '\n')
    .replace(DAYPULSE_ESCAPED_DELIMITER_PATTERN, (_match, marker: string, body: string) => {
      const delimiter = marker.replace(/\\/g, '');
      return `${delimiter}${body}${delimiter}`;
    })
    .replace(DAYPULSE_CROSS_LINE_DELIMITER_PATTERN, (_match, _marker: string, body: string) => body);
}

function isFormattingOnlyDayPulseLine(line: string): boolean {
  const withoutListPrefix = line.trim().replace(/^(?:[-+\u2022]\s+|\d+[.)]\s+)/, '').trim();
  return /^(?:(?:\\+\*)+|\\?\*+)+$/.test(withoutListPrefix);
}

function renderInlineText(value: string, keyPrefix: string): React.ReactNode[] {
  return value.split(URL_PATTERN).map((part, index) => {
    if (!/^https?:\/\//i.test(part)) return <React.Fragment key={`${keyPrefix}-${index}`}>{part}</React.Fragment>;
    const trailing = part.match(/[),.!?;:]+$/)?.[0] || '';
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return <React.Fragment key={`${keyPrefix}-${index}`}><a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface-2)]" style={{ color: 'var(--accent-text)', overflowWrap: 'anywhere' }}>{url}</a>{trailing}</React.Fragment>;
  });
}

function renderDayPulseInlineText(value: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*{3}|\*{2}|\*)(?=\S)([\s\S]*?\S)\1/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > cursor) nodes.push(...renderInlineText(value.slice(cursor, match.index), `${keyPrefix}-text-${cursor}`));
    const children = renderInlineText(match[2], `${keyPrefix}-format-${match.index}`);
    const formatted = match[1].length === 3
      ? <strong key={`${keyPrefix}-format-${match.index}`}><em>{children}</em></strong>
      : match[1].length === 2
        ? <strong key={`${keyPrefix}-format-${match.index}`}>{children}</strong>
        : <em key={`${keyPrefix}-format-${match.index}`}>{children}</em>;
    nodes.push(formatted);
    cursor = pattern.lastIndex;
  }

  if (cursor < value.length) nodes.push(...renderInlineText(value.slice(cursor), `${keyPrefix}-text-${cursor}`));
  return nodes;
}

function ReportLines({ lines, prefix, dayPulse = false }: { lines: string[]; prefix: string; dayPulse?: boolean }) {
  return <>{lines.map((line, index) => line.trim()
    ? !dayPulse || !isFormattingOnlyDayPulseLine(line)
      ? <p key={`${prefix}-${index}`} className="min-w-0">{dayPulse ? renderDayPulseInlineText(line, `${prefix}-${index}`) : renderInlineText(line, `${prefix}-${index}`)}</p>
      : null
    : <div key={`${prefix}-${index}`} className="h-3" aria-hidden="true" />)}</>;
}

function DayPulseBody({ content }: { content: string }) {
  const lines = normalizeDayPulseContent(content).split('\n');
  const headerLines: string[] = [];
  const sections: Array<{ title: string; lines: string[] }> = [];
  const footerLines: string[] = [];
  let currentSection: { title: string; lines: string[] } | null = null;
  lines.forEach(line => {
    if (/^\s*Daily Report\s*[-:]/i.test(line)) {
      footerLines.push(line);
      return;
    }
    const section = line.match(DAYPULSE_SECTION_PATTERN);
    if (section) {
      currentSection = { title: cleanDayPulseLabel(section[1]), lines: [] };
      sections.push(currentSection);
    } else if (currentSection) currentSection.lines.push(line);
    else headerLines.push(line);
  });
  const metadata = headerLines.filter(line => /^\s*(Department|Name)\s*[-:]/i.test(line));
  const leading = headerLines.filter(line => !/^\s*(Department|Name)\s*[-:]/i.test(line));
  return <>
    {metadata.length > 0 && <div className="grid gap-1 rounded-lg px-3 py-2 sm:grid-cols-2" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}><ReportLines lines={metadata} prefix="metadata" dayPulse /></div>}
    {leading.length > 0 && <div className="mt-3 space-y-0.5"><ReportLines lines={leading} prefix="leading" dayPulse /></div>}
    {sections.length > 0 ? <div className="mt-4 space-y-4">{sections.map((section, sectionIndex) => <section key={`${section.title}-${sectionIndex}`}><h3 className="mb-1.5 font-semibold" style={{ color: 'var(--text-primary)', fontSize: 15 }}>{section.title}</h3><div className="space-y-0.5" style={{ color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.7 }}><ReportLines lines={section.lines} prefix={`section-${sectionIndex}`} dayPulse /></div></section>)}</div>
      : metadata.length === 0 && <div className="space-y-0.5" style={{ fontSize: 16, lineHeight: 1.7 }}><ReportLines lines={lines.filter(line => !/^\s*Daily Report\s*[-:]/i.test(line))} prefix="body" dayPulse /></div>}
    {footerLines.length > 0 && <footer className="mt-4" style={{ borderTop: '1px solid var(--border-2)', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, paddingTop: 10 }}><ReportLines lines={footerLines} prefix="footer" dayPulse /></footer>}
  </>;
}

function shiftAlertPresentation(content: string) {
  const normalized = content.toLowerCase();
  if (/shift was auto-ended|shift auto-ended/.test(normalized)) return { label: 'Shift auto-ended', accent: '#dc2626', Icon: AlertTriangle };
  if (/location stopped updating|location sharing.*disabled|location.*disabled|lost connection/.test(normalized)) return { label: 'Location alert', accent: '#d97706', Icon: MapPin };
  if (/exceeded.*break|break.*exceeded/.test(normalized)) return { label: 'Break exceeded', accent: '#d97706', Icon: Clock3 };
  if (/idle/.test(normalized)) return { label: 'Idle warning', accent: '#d97706', Icon: Clock3 };
  return { label: 'Shift alert', accent: 'var(--accent)', Icon: BellRing };
}

function ShiftAlertBody({ content }: { content: string }) {
  return <div className="space-y-1" style={{ color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.65 }}><ReportLines lines={content.replace(/\r\n?/g, '\n').split('\n')} prefix="alert" /></div>;
}

export function getOperationalMessageKind(message: { metadata?: { source?: string | null } | null }, conversationName?: string | null): OperationalMessageKind | null {
  if (message.metadata?.source === 'daypulse') return 'daypulse';
  if (message.metadata?.source === 'shift-alert') return 'shift-alert';
  if (/^DayPulse Reports$/i.test(conversationName || '')) return 'daypulse';
  if (/^Shift Alerts$/i.test(conversationName || '')) return 'shift-alert';
  return null;
}

export function OperationalMessageCard({ kind, content, createdAt, attachments = [], compact = false }: OperationalMessageCardProps) {
  const shiftAlert = kind === 'shift-alert' ? shiftAlertPresentation(content) : null;
  const Icon = shiftAlert?.Icon || FileText;
  const title = shiftAlert?.label || 'Daily report';
  const accent = shiftAlert?.accent || 'var(--accent)';
  const timestamp = timeLabel(createdAt);
  return <article className="w-full rounded-xl border px-4 py-3.5 sm:px-5 sm:py-4" style={{ maxWidth: compact ? '100%' : 760, background: 'var(--surface-2)', borderColor: 'var(--border-2)', boxShadow: 'var(--shadow-sm)' }}>
    <header className="mb-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border-2)', paddingBottom: 10 }}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--surface-1)', color: accent }} aria-hidden="true"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><h2 className="font-semibold uppercase" style={{ color: 'var(--text-primary)', fontSize: compact ? 12 : 13, letterSpacing: '0.07em' }}>{title}</h2><p style={{ color: 'var(--text-secondary)', fontSize: compact ? 11 : 12 }}>{kind === 'daypulse' ? 'Operational daily report' : 'Operational shift monitoring'}</p></div>
      {timestamp && <time className="shrink-0" dateTime={createdAt} style={{ color: 'var(--text-secondary)', fontSize: compact ? 11 : 12 }}>{timestamp}</time>}
    </header>
    {kind === 'daypulse' ? <DayPulseBody content={content} /> : <ShiftAlertBody content={content} />}
    {attachments.length > 0 && <div className="mt-4 space-y-2" style={{ borderTop: '1px solid var(--border-2)', paddingTop: 12 }}>{attachments.map((attachment, index) => <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 no-underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" style={{ background: 'var(--surface-1)', color: 'var(--accent-text)', fontSize: 14 }}><FileText className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-all underline underline-offset-2">{attachment.originalName || 'Attachment'}</span></a>)}</div>}
  </article>;
}
