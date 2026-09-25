'use client';

import * as React from 'react';
import { Check as CheckIcon, MessageSquare, Search, Sparkles, Users, X } from 'lucide-react';
import { cn, resolveImageUrl } from '@/lib/utils';

export type SupraSpaceConversationUser = {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
  role: string;
};
export function NewConversationModal({ users, theme, onClose, onStartDM, onCreateGroup, onCreateSpace, defaultTab = 'dm', getAvatarClass, getInitials }: {
  users: SupraSpaceConversationUser[];
  theme: 'dark' | 'light';
  onClose: () => void; onStartDM: (id: string) => void;
  onCreateGroup: (name: string, ids: string[], emoji?: string) => void;
  onCreateSpace: (name: string, convIds: string[], emoji?: string) => void;
  defaultTab?: 'dm' | 'group' | 'space';
  getAvatarClass: (name: string) => string;
  getInitials: (name: string) => string;
}) {
  const [tab, setTab] = React.useState<'dm' | 'group' | 'space'>(defaultTab);
  const [q, setQ] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [groupEmoji, setGroupEmoji] = React.useState('');
  const [sel, setSel] = React.useState<string[]>([]);
  const list = users.filter(u => u.fullName.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectedUsers = users.filter(u => sel.includes(u._id));
  const autoGroupName = selectedUsers.length > 0
    ? `${selectedUsers.slice(0, 3).map(u => u.fullName.split(' ')[0] || u.fullName).join(', ')}${selectedUsers.length > 3 ? ` +${selectedUsers.length - 3}` : ''}`
    : 'New Group';
  const startSmartMessage = () => {
    if (sel.length === 1) {
      onStartDM(sel[0]);
      return;
    }
    if (sel.length > 1) onCreateGroup(autoGroupName, sel);
  };
  const TABS: { key: 'dm' | 'group' | 'space'; label: string }[] = [
    { key: 'dm', label: 'Direct Message' },
    { key: 'group', label: 'Channel' },
    { key: 'space', label: 'Space' },
  ];
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden flex flex-col" style={{ background: 'var(--bg-elevated)', maxHeight: 'min(85dvh, 640px)' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>New Conversation</h2>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto ss4-scroll">
        <div className="px-4 pt-4 pb-3">
          <div className="ss4-tab-bar flex gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setQ(''); }} className={cn('flex-1 h-7 ss4-tab', t.key === tab && 'ss4-tab-active')}
                style={{ fontSize: 11, color: t.key === tab ? '#fff' : (theme === 'light' ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.52)') }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {tab === 'group' && (
            <div className="flex gap-2">
              <input value={groupEmoji} onChange={e => setGroupEmoji(e.target.value)} placeholder="#" className="w-12 h-9 rounded-lg px-2 text-center ss4-search-input" style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 18 }} maxLength={4} />
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Channel name..." className="flex-1 h-9 rounded-lg px-3 text-sm ss4-search-input" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }} />
            </div>
          )}
          {tab === 'space' && (
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Space name..." className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }} />
          )}
          {tab === 'dm' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {selectedUsers.map(u => (
                <span key={u._id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(22,163,74,0.2)' }}>
                  <span className={cn('h-5 w-5 rounded-full shrink-0 flex items-center justify-center overflow-hidden text-white', getAvatarClass(u.fullName))} style={{ fontSize: 8, fontWeight: 700 }}>
                    {u.avatar ? <img src={resolveImageUrl(u.avatar)} alt="" className="w-full h-full object-cover" /> : getInitials(u.fullName)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{u.fullName.split(' ')[0]}</span>
                  <button onClick={() => toggle(u._id)} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }} title={`Remove ${u.fullName}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {tab !== 'space' && (
            <>
              <div className="relative">
                <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
                <input value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Search people..."
                  className="w-full h-9 rounded-lg pl-9 pr-3 text-sm ss4-search-input"
                  style={{ fontFamily: 'var(--font-geist-sans), sans-serif', color: 'var(--text-primary)', fontWeight: 500 }} />
              </div>
              <div className="space-y-0.5 max-h-52 overflow-y-auto ss4-scroll -mx-1 px-1">
                {list.map(u => {
                  const active = sel.includes(u._id);
                  return (
                    <button key={u._id} onClick={() => toggle(u._id)}
                      className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left', active ? 'bg-(--accent-muted)' : 'hover:bg-(--bg-hover)')}
                      style={active ? { border: '1px solid rgba(22,163,74,0.2)' } : undefined}>
                      <div className={cn('h-8 w-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden', getAvatarClass(u.fullName))}>
                        {u.avatar ? <img src={resolveImageUrl(u.avatar)} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{getInitials(u.fullName)}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.fullName}</p>
                        <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{u.username} · {u.role}</p>
                      </div>
                      {active && <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}><CheckIcon className="h-3 w-3" style={{ color: '#fff' }} /></div>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {tab === 'dm' && sel.length > 0 && (
            <button onClick={startSmartMessage}
              className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13 }}>
              {sel.length === 1 ? <MessageSquare className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              {sel.length === 1 ? 'Send Message' : `Send Message · Create Channel (${sel.length})`}
            </button>
          )}
          {tab === 'group' && sel.length > 0 && (
            <button onClick={() => groupName.trim() && onCreateGroup(groupName, sel, groupEmoji || undefined)} disabled={!groupName.trim()}
              className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: !groupName.trim() ? 0.4 : 1 }}>
              <Users className="h-3.5 w-3.5" /> Create Channel · {sel.length} {sel.length === 1 ? 'member' : 'members'}
            </button>
          )}
          {tab === 'space' && (
            <button onClick={() => groupName.trim() && onCreateSpace(groupName, [], undefined)} disabled={!groupName.trim()}
              className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: !groupName.trim() ? 0.4 : 1 }}>
              <Sparkles className="h-3.5 w-3.5" /> Create Space
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
