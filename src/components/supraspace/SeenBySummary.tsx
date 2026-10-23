'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn, resolveImageUrl } from '@/lib/utils';

export type SeenByMember = {
  _id: string;
  fullName: string;
  avatar?: string;
  displayNickname?: string;
};

function displayName(member: SeenByMember): string {
  return member.displayNickname?.trim() || member.fullName || 'Unknown user';
}

function avatarColor(value: string): string {
  const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2', '#4f46e5'];
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

function SeenByModal({ members, onClose }: { members: SeenByMember[]; onClose: () => void }) {
  React.useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="flex max-h-[min(76vh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supraspace-seen-by-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 id="supraspace-seen-by-title" className="text-sm font-bold">Message seen by</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {members.length} reader{members.length === 1 ? '' : 's'} reached this message
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close message seen by list"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-2">
          {members.map(member => {
            const name = displayName(member);
            return (
              <div key={member._id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
                  style={{ background: avatarColor(name) }}
                >
                  {member.avatar
                    ? <img src={resolveImageUrl(member.avatar)} alt="" className="h-full w-full object-cover" />
                    : name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">Seen at this message</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function SeenBySummary({
  members,
  className,
  previewLimit = 4,
}: {
  members: SeenByMember[];
  className?: string;
  previewLimit?: number;
}) {
  const [open, setOpen] = React.useState(false);
  if (!members.length) return null;

  const visibleMembers = members.slice(0, previewLimit);
  const hiddenCount = members.length - visibleMembers.length;
  const names = members.map(displayName).join(', ');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('flex h-4 items-center -space-x-1 rounded-full focus:outline-none focus:ring-2 focus:ring-ring', className)}
        title={`Message seen by ${names}`}
        aria-label={`Show ${members.length} people who saw this message`}
      >
        {visibleMembers.map(member => {
          const name = displayName(member);
          return (
            <span
              key={member._id}
              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[6px] font-semibold text-white"
              style={{ background: avatarColor(name), borderColor: 'var(--bg-base, #111827)' }}
            >
              {member.avatar
                ? <img src={resolveImageUrl(member.avatar)} alt="" className="h-full w-full object-cover" />
                : name[0]?.toUpperCase()}
            </span>
          );
        })}
        {hiddenCount > 0 && (
          <span className="relative ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-border bg-muted px-1 text-[8px] font-semibold leading-none text-muted-foreground">
            +{hiddenCount}
          </span>
        )}
      </button>
      {open && <SeenByModal members={members} onClose={() => setOpen(false)} />}
    </>
  );
}
