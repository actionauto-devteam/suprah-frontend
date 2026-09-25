'use client';

import * as React from 'react';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { cn, resolveImageUrl } from '@/lib/utils';

export type SupraSpaceMemberCandidate = {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
  role: string;
};

type ManageMembersModalProps = {
  users: SupraSpaceMemberCandidate[];
  existingIds: string[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  getAvatarClass: (name: string) => string;
  getInitials: (name: string) => string;
};

export function ManageMembersModal({
  users,
  existingIds,
  onClose,
  onAdd,
  getAvatarClass,
  getInitials,
}: ManageMembersModalProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const normalizedQuery = query.toLowerCase();
  const availableUsers = users.filter(user => (
    !existingIds.includes(user._id)
    && (user.fullName.toLowerCase().includes(normalizedQuery) || user.username.toLowerCase().includes(normalizedQuery))
  ));
  const toggle = (id: string) => setSelectedIds(selected => (
    selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]
  ));

  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Add Members</h2>
          </div>
          <button type="button" onClick={onClose} className="ss4-icon-btn h-7 w-7" aria-label="Close add members">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="relative">
            <Search className="ss4-search-icon absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search people..."
              className="ss4-search-input h-9 w-full rounded-lg pl-9 pr-3 text-sm"
            />
          </div>
          <div className="ss4-scroll -mx-1 max-h-56 space-y-0.5 overflow-y-auto px-1">
            {availableUsers.length === 0 && <p className="py-6 text-center" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Everyone is already a member</p>}
            {availableUsers.map(user => {
              const selected = selectedIds.includes(user._id);
              return (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => toggle(user._id)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all', selected ? 'bg-(--accent-muted)' : 'hover:bg-(--bg-hover)')}
                  style={selected ? { border: '1px solid rgba(22,163,74,0.2)' } : undefined}
                >
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full', getAvatarClass(user.fullName))}>
                    {user.avatar
                      ? <img src={resolveImageUrl(user.avatar)} alt="" className="h-full w-full object-cover" />
                      : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{getInitials(user.fullName)}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{user.fullName}</p>
                    <p className="mt-0.5 truncate" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{user.username} · {user.role}</p>
                  </div>
                  {selected && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--accent)' }}>
                      <Check className="h-3 w-3" style={{ color: '#fff' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedIds.length > 0 && (
            <button type="button" onClick={() => onAdd(selectedIds)} className="ss4-send-btn flex h-9 w-full items-center justify-center gap-2 rounded-lg font-semibold" style={{ fontSize: 13 }}>
              <UserPlus className="h-3.5 w-3.5" />
              Add {selectedIds.length} {selectedIds.length === 1 ? 'member' : 'members'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
