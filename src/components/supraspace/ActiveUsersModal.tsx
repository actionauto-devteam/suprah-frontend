'use client';

import { Wifi, X } from 'lucide-react';
import { PresenceAvatarDot } from '@/app/(dashboard)/team-pulse/_components/StatusDot';
import { S } from '@/app/(dashboard)/team-pulse/_components/team-pulse-constants';
import type { PresenceMap } from '@/hooks/useSupraSpaceSocket';
import { cn } from '@/lib/utils';

export type SupraSpaceActiveUser = {
  _id: string;
  fullName: string;
  avatar?: string;
  role: string;
};

type ActiveUsersModalProps = {
  users: SupraSpaceActiveUser[];
  presence: PresenceMap;
  userId: string;
  onClose: () => void;
  getAvatarClass: (name: string) => string;
  getInitials: (name: string) => string;
};

export function ActiveUsersModal({
  users,
  presence,
  userId,
  onClose,
  getAvatarClass,
  getInitials,
}: ActiveUsersModalProps) {
  const onlineUsers = users.filter(user => user._id !== userId && presence[user._id]?.onlineStatus && presence[user._id]?.onlineStatus !== 'offline');
  const offlineUsers = users.filter(user => user._id !== userId && (!presence[user._id]?.onlineStatus || presence[user._id]?.onlineStatus === 'offline'));

  const row = (user: SupraSpaceActiveUser, online: boolean) => {
    const status = presence[user._id]?.onlineStatus ?? 'offline';
    return (
      <div key={user._id} className="flex w-full items-center gap-3 px-4 py-2.5">
        <div className="relative shrink-0">
          <div className={cn('flex h-9 w-9 items-center justify-center overflow-hidden rounded-full font-semibold text-white', getAvatarClass(user.fullName))} style={{ fontSize: 12 }}>
            {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : getInitials(user.fullName)}
          </div>
          {online && <PresenceAvatarDot status={status} deviceType={presence[user._id]?.lastDeviceType ?? undefined} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{user.fullName}</p>
          <p style={{ fontSize: 10, color: online ? 'var(--positive)' : 'var(--text-tertiary)' }}>{online ? S.label[status] : user.role || 'Offline'}</p>
        </div>
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', S.dot[status])} />
      </div>
    );
  };

  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal flex w-full max-w-sm flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
        <div className="flex shrink-0 items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" style={{ color: 'var(--positive)' }} />
            <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Active Now · {onlineUsers.length}</h2>
          </div>
          <button type="button" onClick={onClose} className="ss4-icon-btn h-7 w-7" aria-label="Close active users"><X className="h-4 w-4" /></button>
        </div>
        <div className="ss4-scroll flex-1 overflow-y-auto">
          {onlineUsers.length > 0 && <div className="px-4 pb-1 pt-3"><span className="ss4-section-label" style={{ color: 'var(--positive)' }}>🟢 Online</span></div>}
          {onlineUsers.map(user => row(user, true))}
          {offlineUsers.length > 0 && <div className="px-4 pb-1 pt-3"><span className="ss4-section-label">Offline</span></div>}
          {offlineUsers.map(user => row(user, false))}
        </div>
      </div>
    </div>
  );
}
