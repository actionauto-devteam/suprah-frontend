'use client';

import * as React from 'react';
import { MessageCircle, ArrowUpRight, Plus, ChevronLeft, Search, Check, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, resolveImageUrl } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
  useSupraSpaceMessenger,
  SSConv,
} from '@/context/SupraSpaceMessengerContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CrmUser { _id: string; fullName: string; username: string; avatar?: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(conv: SSConv, myId: string | null): string {
  if (conv.type === 'group') return conv.name || 'Group';
  const other = conv.members.find((m) => m._id !== myId);
  return other?.fullName || 'Unknown';
}

function getAvatarSrc(conv: SSConv, myId: string | null): string | undefined {
  if (conv.type === 'group') return conv.avatar;
  return conv.members.find((m) => m._id !== myId)?.avatar;
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function previewText(conv: SSConv): string {
  const msg = conv.lastMessage;
  if (!msg || msg.isDeleted) return 'No messages yet';
  const icons: Record<string, string> = {
    image: '📷 Photo', voice: '🎤 Voice message', gif: '🎬 GIF',
    file: '📎 File', poll: '📊 Poll', event: '📅 Event',
  };
  return icons[msg.type] ?? msg.content ?? '';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessengerDropdown() {
  const { conversations, totalUnread, crmUserId, crmToken, openChatPopup, refreshConversations } =
    useSupraSpaceMessenger();
  const router = useRouter();

  // ── Dropdown open state (controlled so we can reset on close) ──────────────
  const [open, setOpen] = React.useState(false);

  // ── Create-flow state ──────────────────────────────────────────────────────
  const [view, setView] = React.useState<'list' | 'create'>('list');
  const [createTab, setCreateTab] = React.useState<'dm' | 'group'>('dm');
  const [users, setUsers] = React.useState<CrmUser[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [groupName, setGroupName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const resetCreate = () => {
    setView('list');
    setCreateTab('dm');
    setUserSearch('');
    setSelectedIds([]);
    setGroupName('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetCreate();
  };

  const enterCreate = async () => {
    setView('create');
    setCreateTab('dm');
    setUserSearch('');
    setSelectedIds([]);
    setGroupName('');
    if (users.length === 0 && crmToken) {
      setUsersLoading(true);
      try {
        const r = await apiClient.get('/api/supraspace/users', {
          headers: { Authorization: `Bearer ${crmToken}` },
        });
        setUsers(r.data?.data || r.data || []);
      } catch {} finally {
        setUsersLoading(false);
      }
    }
  };

  const filteredUsers = users.filter(u =>
    u._id !== crmUserId &&
    (u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
     (u.username || '').toLowerCase().includes(userSearch.toLowerCase()))
  );

  const handleDM = async (targetId: string) => {
    if (creating || !crmToken) return;
    setCreating(true);
    try {
      const r = await apiClient.post(
        '/api/supraspace/conversations/direct',
        { targetUserId: targetId },
        { headers: { Authorization: `Bearer ${crmToken}` } }
      );
      const conv = r.data?.data;
      if (conv) {
        refreshConversations();
        setOpen(false);
        resetCreate();
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          router.push('/crm/supra-space?convId=' + conv._id);
        } else {
          openChatPopup(conv._id);
        }
      }
    } catch {} finally {
      setCreating(false);
    }
  };

  const handleGroup = async () => {
    if (creating || !groupName.trim() || selectedIds.length === 0 || !crmToken) return;
    setCreating(true);
    try {
      const r = await apiClient.post(
        '/api/supraspace/conversations/group',
        { name: groupName.trim(), memberIds: selectedIds },
        { headers: { Authorization: `Bearer ${crmToken}` } }
      );
      const conv = r.data?.data;
      if (conv) {
        refreshConversations();
        setOpen(false);
        resetCreate();
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          router.push('/crm/supra-space?convId=' + conv._id);
        } else {
          openChatPopup(conv._id);
        }
      }
    } catch {} finally {
      setCreating(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-full relative overflow-visible transition-all duration-300',
            totalUnread > 0
              ? 'border-green-300 dark:border-green-700 shadow-sm shadow-green-500/10'
              : 'border-border/80 bg-background text-foreground/85 shadow-sm ring-1 ring-border/35 dark:ring-border/45'
          )}
        >
          <MessageCircle className={cn('size-4', totalUnread > 0 ? 'text-green-500 dark:text-green-400' : 'text-foreground/70')} />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm pointer-events-none">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="p-0 w-[min(320px,calc(100vw-16px))] max-h-[min(480px,80dvh)] flex flex-col overflow-hidden rounded-xl shadow-xl border-border/60"
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-4 py-3 border-b border-border/50 bg-card/90 backdrop-blur-sm">
          {view === 'list' ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center shrink-0">
                <MessageCircle className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-bold text-foreground tracking-tight">
                  Suprah <span style={{ color: '#E55A00' }}>Space</span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {totalUnread > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      {totalUnread} unread
                    </span>
                  ) : 'All caught up'}
                </p>
              </div>
              <button
                onClick={enterCreate}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                style={{ background: 'rgba(52,201,125,0.12)', color: '#34c97d', border: '1px solid rgba(52,201,125,0.25)' }}
              >
                <Plus className="size-3" strokeWidth={2.5} /> New
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button onClick={resetCreate} className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-muted/60" style={{ color: 'var(--muted-foreground)' }}>
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-[13px] font-bold text-foreground flex-1">New conversation</p>
            </div>
          )}
        </div>

        {view === 'list' ? (
          /* ── Conversation list ── */
          <div className="flex-1 overflow-y-auto min-h-0 bg-card/80" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}>
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <MessageCircle className="size-8 text-muted-foreground/30 mb-2" />
                <p className="text-[12px] text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const msg = conv.lastMessage;
                const isUnread = !!msg && !msg.isDeleted && msg.sender?._id !== crmUserId && !msg.readBy?.includes(crmUserId || '');
                const name = getDisplayName(conv, crmUserId);
                const avatarSrc = getAvatarSrc(conv, crmUserId);
                return (
                  <button key={conv._id}
                    className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50', isUnread && 'bg-green-500/5 hover:bg-green-500/10')}
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        router.push('/crm/supra-space?convId=' + conv._id);
                      } else {
                        openChatPopup(conv._id);
                      }
                    }}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        {avatarSrc && <AvatarImage src={resolveImageUrl(avatarSrc)} />}
                        <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-green-500 to-green-700 text-white">{initials(name)}</AvatarFallback>
                      </Avatar>
                      {isUnread && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('text-[13px] truncate', isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>{name}</span>
                        {conv.lastMessageAt && <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(conv.lastMessageAt)}</span>}
                      </div>
                      <p className={cn('text-[11px] truncate mt-0.5', isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{previewText(conv)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          /* ── Create view ── */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Tabs */}
            <div className="shrink-0 flex gap-1 px-3 pt-2.5 pb-2">
              {(['dm', 'group'] as const).map(tab => (
                <button key={tab} onClick={() => { setCreateTab(tab); setSelectedIds([]); setUserSearch(''); }}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-semibold transition-colors')}
                  style={createTab === tab
                    ? { background: 'rgba(52,201,125,0.15)', color: '#34c97d', border: '1px solid rgba(52,201,125,0.3)' }
                    : { background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid transparent' }
                  }
                >
                  {tab === 'dm' ? <MessageCircle className="size-3" /> : <Users className="size-3" />}
                  {tab === 'dm' ? 'Direct Message' : 'Group Chat'}
                </button>
              ))}
            </div>

            {/* Group name input (group tab only) */}
            {createTab === 'group' && (
              <div className="shrink-0 px-3 pb-2">
                <input
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Group name..."
                  className="w-full h-8 rounded-lg px-3 text-[12px] outline-none border border-border/60 bg-muted/40 text-foreground placeholder:text-muted-foreground focus:border-green-500/50"
                />
              </div>
            )}

            {/* User search */}
            <div className="shrink-0 px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search people..."
                  className="w-full h-8 pl-7 pr-3 rounded-lg text-[12px] outline-none border border-border/60 bg-muted/40 text-foreground placeholder:text-muted-foreground focus:border-green-500/50"
                />
              </div>
            </div>

            {/* Selected chips (group only) */}
            {createTab === 'group' && selectedIds.length > 0 && (
              <div className="shrink-0 flex flex-wrap gap-1 px-3 pb-2">
                {selectedIds.map(id => {
                  const u = users.find(x => x._id === id);
                  if (!u) return null;
                  return (
                    <span key={id} onClick={() => toggleSelect(id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer"
                      style={{ background: 'rgba(52,201,125,0.15)', color: '#34c97d', border: '1px solid rgba(52,201,125,0.3)' }}>
                      {u.fullName.split(' ')[0]}
                      <span className="text-[9px] opacity-60">×</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* User list */}
            <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-[11px] text-muted-foreground">No users found</p>
                </div>
              ) : (
                filteredUsers.map(u => {
                  const isSelected = selectedIds.includes(u._id);
                  return (
                    <button key={u._id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                      onClick={() => createTab === 'dm' ? handleDM(u._id) : toggleSelect(u._id)}
                      disabled={creating}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8">
                          {u.avatar && <AvatarImage src={resolveImageUrl(u.avatar)} />}
                          <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-green-500 to-green-700 text-white">{initials(u.fullName)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-foreground truncate">{u.fullName}</p>
                        {u.username && <p className="text-[10px] text-muted-foreground truncate">@{u.username}</p>}
                      </div>
                      {createTab === 'group' && (
                        <div className={cn('h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected ? 'border-green-500 bg-green-500' : 'border-border'
                        )}>
                          {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Group create button */}
            {createTab === 'group' && (
              <div className="shrink-0 px-3 py-2.5 border-t border-border/50">
                <button
                  onClick={handleGroup}
                  disabled={creating || !groupName.trim() || selectedIds.length === 0}
                  className="w-full h-9 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#34c97d,#22b060)' }}
                >
                  {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Users className="size-3.5" />}
                  Create group{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer link — only on list view */}
        {view === 'list' && (
          <div className="shrink-0 border-t border-border/50 px-4 py-2 bg-card/90">
            <Link href="/crm/supra-space"
              className="flex items-center justify-center gap-1.5 text-[11px] text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-semibold transition-colors">
              Open Suprah Space <ArrowUpRight className="size-3" />
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
