'use client';

export function UnreadMessagesDivider({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'flex items-center gap-2 py-1.5' : 'flex items-center gap-2 px-3 py-2 sm:px-4'} role="separator" aria-label="Unread Messages">
      <span className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
      <span className="shrink-0 font-semibold uppercase" style={{ color: 'var(--accent)', fontSize: compact ? 9 : 10, letterSpacing: '0.08em' }}>Unread Messages</span>
      <span className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
    </div>
  );
}
