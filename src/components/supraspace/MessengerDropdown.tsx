'use client';

import * as React from 'react';
import { MessageCircle, ArrowUpRight, Plus, ChevronLeft, Search, Check, CheckCheck, Users, Loader2, Archive, ArchiveRestore, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HeaderDrawer } from "@/components/layout/HeaderDrawer";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, resolveImageUrl } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { getSupraSpaceConversationPreview } from '@/lib/supra-space-conversation-preview';
import { runSupraSpaceBulkOperation } from '@/lib/supraspace-bulk-operations';
import { filterSupraSpaceConversations } from '@/lib/supraspace-conversation-search';
import {
  useSupraSpaceMessenger,
  SSConv,
} from '@/context/SupraSpaceMessengerContext';


interface CrmUser { _id: string; fullName: string; username: string; avatar?: string }
type ConversationFilter = 'all' | 'unread' | 'read' | 'mentions';
const CONVERSATION_FILTERS: Array<{ key: ConversationFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'mentions', label: 'Mentions' },
];


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

function previewText(conv: SSConv, myId: string | null): string {
  const preview = getSupraSpaceConversationPreview({
    lastMessage: conv.lastMessage,
    lastReaction: conv.lastReaction,
    unreadCount: conv.unreadCount,
    conversationType: conv.type,
    viewerId: myId,
  });
  return `${preview.senderPrefix}${preview.text}`;
}

function isConvUnread(conv: SSConv, userId: string | null): boolean {
  const msg = conv.lastMessage;
  return Boolean(conv.manualUnread) || (conv.unreadCount || 0) > 0 || (!!msg && !msg.isDeleted && msg.sender?._id !== userId && !msg.readBy?.includes(userId || ''));
}

function isArchivedForUser(conv: SSConv, userId: string | null): boolean {
  return !!userId && (conv.archivedBy || []).map(String).includes(userId);
}

function isLeftChannelForUser(conv: SSConv, userId: string | null): boolean {
  return conv.type === 'group' && !!userId && (conv.leftBy || []).map(String).includes(userId);
}

// --- Component ----------------------------------------------------------------

export function MessengerDropdown({ open: controlledOpen, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const {
    conversations,
    totalUnread,
    crmUserId,
    crmToken,
    isLoadingConversations,
    conversationError,
    openChatPopup,
    refreshConversations,
    markAllAsRead,
    archiveConversation,
    markConversationRead,
    markConversationUnread,
  } =
    useSupraSpaceMessenger();
  const router = useRouter();

  // -- Dropdown open state (controlled so we can reset on close) --------------
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // -- Create-flow state ------------------------------------------------------
  const [view, setView] = React.useState<'list' | 'create' | 'archive'>('list');
  const [createTab, setCreateTab] = React.useState<'dm' | 'group'>('dm');
  const [users, setUsers] = React.useState<CrmUser[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [groupName, setGroupName] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [conversationFilter, setConversationFilter] = React.useState<ConversationFilter>('all');
  const [conversationQuery, setConversationQuery] = React.useState('');
  const [archiveQuery, setArchiveQuery] = React.useState('');
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = React.useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = React.useState<'read' | 'unread' | 'archive' | 'unarchive' | null>(null);
  const [bulkStatus, setBulkStatus] = React.useState('');

  const filteredConversations = React.useMemo(() => filterSupraSpaceConversations(conversations.filter((conv) => {
    if (isArchivedForUser(conv, crmUserId)) return false;
    const unread = isConvUnread(conv, crmUserId);
    if (conversationFilter === 'unread') return unread;
    if (conversationFilter === 'read') return !unread;
    if (conversationFilter === 'mentions') return (conv.unreadMentionCount || 0) > 0;
    return true;
  }), conv => getDisplayName(conv, crmUserId), conversationQuery), [conversations, conversationFilter, conversationQuery, crmUserId]);

  const archivedConversations = React.useMemo(() => {
    const query = archiveQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (!isArchivedForUser(conv, crmUserId)) return false;
      if (!query) return true;
      return [
        getDisplayName(conv, crmUserId),
        ...conv.members.flatMap(member => [member.fullName, member.username]),
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [archiveQuery, conversations, crmUserId]);
  const archivedConversationCount = React.useMemo(
    () => conversations.filter((conv) => isArchivedForUser(conv, crmUserId)).length,
    [conversations, crmUserId],
  );

  const toggleSelection = (conversationId: string) => setSelectedConversationIds(previous => {
    const next = new Set(previous);
    if (next.has(conversationId)) next.delete(conversationId);
    else next.add(conversationId);
    return next;
  });
  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedConversationIds(new Set());
    setBulkStatus('');
  };
  const openArchivedChats = () => {
    exitSelection();
    setArchiveQuery('');
    setView('archive');
  };
  const runBulkAction = async (action: 'read' | 'unread' | 'archive' | 'unarchive') => {
    if (bulkAction || selectedConversationIds.size === 0) return;
    const selected = conversations.filter(conv => {
      if (!selectedConversationIds.has(conv._id) || isLeftChannelForUser(conv, crmUserId)) return false;
      if (action === 'archive') return !isArchivedForUser(conv, crmUserId);
      if (action === 'unarchive') return isArchivedForUser(conv, crmUserId);
      return !isArchivedForUser(conv, crmUserId);
    });
    if (!selected.length) {
      setBulkStatus('No selected chats can use that action.');
      return;
    }
    setBulkAction(action);
    setBulkStatus(`Updating ${selected.length} chat${selected.length === 1 ? '' : 's'}…`);
    const result = await runSupraSpaceBulkOperation(selected, async conv => {
      if (action === 'read') {
        if (!(await markConversationRead(conv._id))) throw new Error('Could not mark conversation read');
        return;
      }
      if (action === 'unread') {
        if (!(await markConversationUnread(conv._id, true))) throw new Error('Could not mark conversation unread');
        return;
      }
      await archiveConversation(conv._id, action === 'archive');
    });
    setBulkAction(null);
    setSelectedConversationIds(previous => {
      const next = new Set(previous);
      result.succeeded.forEach(conv => next.delete(conv._id));
      return next;
    });
    setBulkStatus(result.failed.length ? `${result.succeeded.length} updated; ${result.failed.length} could not be updated.` : `${result.succeeded.length} chat${result.succeeded.length === 1 ? '' : 's'} updated.`);
  };

  const resetCreate = () => {
    setView('list');
    setCreateTab('dm');
    setUserSearch('');
    setSelectedIds([]);
    setGroupName('');
    setArchiveQuery('');
    setSelectionMode(false);
    setSelectedConversationIds(new Set());
    setBulkStatus('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetCreate();
    if (next) refreshConversations();
  };

  React.useEffect(() => {
    if (!open) {
      setView('list'); setCreateTab('dm'); setUserSearch(''); setSelectedIds([]); setGroupName(''); setArchiveQuery(''); setSelectionMode(false); setSelectedConversationIds(new Set()); setBulkStatus('');
    }
  }, [open]);

  const enterCreate = async () => {
    exitSelection();
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
      } catch { } finally {
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
    } catch { } finally {
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
    } catch { } finally {
      setCreating(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <>
        <Button
          ref={buttonRef}
          type="button"
          aria-label={open ? "Close SuprahSpace" : "Open SuprahSpace"}
          aria-expanded={open}
          aria-controls="suprahspace-drawer"
          onClick={() => handleOpenChange(!open)}
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
            <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 px-1 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm pointer-events-none">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>


      <HeaderDrawer id="suprahspace-drawer" title="SuprahSpace" open={open} onOpenChange={handleOpenChange} triggerRef={buttonRef}>
        {/* -- Header -- */}
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
              {totalUnread > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  title="Mark all as read"
                  className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/60"
                >
                  <CheckCheck className="size-3.5" strokeWidth={2.5} />
                </button>
              )}
              <button
                onClick={() => selectionMode ? exitSelection() : setSelectionMode(true)}
                title={selectionMode ? 'Cancel chat selection' : 'Select chats'}
                className={cn('shrink-0 flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:bg-muted/60', selectionMode ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground hover:text-foreground')}
              >
                {selectionMode ? <Check className="size-3.5" strokeWidth={2.5} /> : <CheckCheck className="size-3.5" strokeWidth={2.2} />}
              </button>
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
              <p className="text-[13px] font-bold text-foreground flex-1">{view === 'archive' ? 'Archived chats' : 'New conversation'}</p>
              {view === 'archive' && (
                <button onClick={() => selectionMode ? exitSelection() : setSelectionMode(true)} className="h-7 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                  {selectionMode ? 'Cancel' : 'Select'}
                </button>
              )}
            </div>
          )}
        </div>

        {view === 'list' ? (
          /* -- Conversation list -- */
          <>
            <div className="shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar px-3 py-2 border-b border-border/40 bg-card/80">
              {CONVERSATION_FILTERS.map((filter) => {
                const isActive = conversationFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setConversationFilter(filter.key)}
                    className={cn(
                      'h-7 shrink-0 rounded-full border px-3 text-[11px] font-semibold transition-colors',
                      isActive
                        ? 'border-green-500/40 bg-green-500/15 text-green-500 dark:text-green-300'
                        : 'border-border/55 bg-muted/25 text-muted-foreground hover:border-green-500/35 hover:text-foreground'
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div className="shrink-0 border-b border-border/40 bg-card/80 px-3 pb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={conversationQuery} onChange={event => setConversationQuery(event.target.value)} placeholder="Search chats" autoComplete="off" enterKeyHint="search" className="h-8 w-full rounded-lg border border-border/60 bg-muted/35 pl-8 pr-8 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-green-500/50" />
                {conversationQuery && <button type="button" onClick={() => setConversationQuery('')} aria-label="Clear chat search" className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"><X className="size-3" /></button>}
              </div>
              <button type="button" onClick={openArchivedChats} className="mt-2 flex h-8 w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/25 px-2.5 text-left text-[11px] font-semibold text-muted-foreground transition-colors hover:border-green-500/35 hover:text-foreground" aria-label="Archived Chats">
                <Archive className="size-3.5 shrink-0" />
                <span className="flex-1">Archived Chats</span>
                {archivedConversationCount > 0 && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-foreground">{archivedConversationCount}</span>}
              </button>
            </div>
            {selectionMode && (
              <div className="shrink-0 border-b border-border/40 bg-card/90 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-foreground">{selectedConversationIds.size} selected</span>
                  <button type="button" onClick={() => setSelectedConversationIds(new Set(filteredConversations.filter(conv => !isLeftChannelForUser(conv, crmUserId)).map(conv => conv._id)))} disabled={bulkAction !== null} className="text-[10px] font-semibold text-green-600 disabled:opacity-50 dark:text-green-400">Select all visible</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => { void runBulkAction('read'); }} disabled={!selectedConversationIds.size || bulkAction !== null} className="rounded-md border border-border/60 px-2 py-1 text-[10px] font-semibold text-foreground disabled:opacity-50">Read</button>
                  <button type="button" onClick={() => { void runBulkAction('unread'); }} disabled={!selectedConversationIds.size || bulkAction !== null} className="rounded-md border border-border/60 px-2 py-1 text-[10px] font-semibold text-foreground disabled:opacity-50">Unread</button>
                  <button type="button" onClick={() => { void runBulkAction('archive'); }} disabled={!selectedConversationIds.size || bulkAction !== null} className="rounded-md border border-border/60 px-2 py-1 text-[10px] font-semibold text-foreground disabled:opacity-50">{bulkAction === 'archive' ? 'Archiving…' : 'Archive'}</button>
                </div>
                {bulkStatus && <p className="mt-1.5 text-[10px] text-muted-foreground" role="status">{bulkStatus}</p>}
              </div>
            )}
            <div className="flex-1 overflow-y-auto min-h-0 bg-card/80" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}>
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  {isLoadingConversations ? (
                    <>
                      <Loader2 className="size-7 animate-spin text-green-500/70 mb-2" />
                      <p className="text-[12px] text-muted-foreground">Loading conversations...</p>
                    </>
                  ) : conversationError ? (
                    <>
                      <MessageCircle className="size-8 text-muted-foreground/30 mb-2" />
                      <p className="text-[12px] font-semibold text-foreground/80">Could not load conversations</p>
                      <button
                        onClick={() => refreshConversations()}
                        className="mt-3 rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                        style={{ background: 'rgba(52,201,125,0.12)', color: '#34c97d', border: '1px solid rgba(52,201,125,0.25)' }}
                      >
                        Try again
                      </button>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="size-8 text-muted-foreground/30 mb-2" />
                      <p className="text-[12px] text-muted-foreground">No conversations yet</p>
                      <button
                        onClick={() => refreshConversations()}
                        className="mt-3 rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                        style={{ background: 'rgba(52,201,125,0.12)', color: '#34c97d', border: '1px solid rgba(52,201,125,0.25)' }}
                      >
                        Refresh
                      </button>
                    </>
                  )}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <MessageCircle className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-[12px] font-semibold text-foreground/80">
                    {conversationQuery.trim() ? 'No matching conversations' : `No ${CONVERSATION_FILTERS.find((filter) => filter.key === conversationFilter)?.label.toLowerCase()} conversations`}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {conversationQuery.trim() ? 'Try a conversation or participant name.' : 'Try another filter or open Suprah Space.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isUnread = isConvUnread(conv, crmUserId);
                  const name = getDisplayName(conv, crmUserId);
                  const avatarSrc = getAvatarSrc(conv, crmUserId);
                  const selected = selectedConversationIds.has(conv._id);
                  return (
                    <button key={conv._id}
                      className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50', isUnread && 'bg-green-500/5 hover:bg-green-500/10')}
                      onClick={() => {
                        if (selectionMode) { toggleSelection(conv._id); return; }
                        handleOpenChange(false);
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
                          <AvatarFallback className="text-[11px] font-semibold bg-linear-to-br from-green-500 to-green-700 text-white">{initials(name)}</AvatarFallback>
                        </Avatar>
                        {isUnread && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />}
                      </div>
                      {selectionMode && <span className={cn('h-4.5 w-4.5 shrink-0 rounded border flex items-center justify-center', selected ? 'border-green-500 bg-green-500 text-white' : 'border-border/70')} aria-hidden="true">{selected && <Check className="size-3" strokeWidth={3} />}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('text-[13px] truncate', isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>{name}</span>
                          {conv.lastMessageAt && <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(conv.lastMessageAt)}</span>}
                        </div>
                        <p className={cn('text-[11px] truncate mt-0.5', isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{previewText(conv, crmUserId)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : view === 'archive' ? (
          <div className="flex-1 min-h-0 overflow-y-auto bg-card/80" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}>
            <div className="sticky top-0 z-10 border-b border-border/40 bg-card/95 px-3 py-2 backdrop-blur-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={archiveQuery}
                  onChange={event => setArchiveQuery(event.target.value)}
                  placeholder="Search archived chats"
                  className="h-8 w-full rounded-lg border border-border/60 bg-muted/35 pl-8 pr-3 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-green-500/50"
                />
              </div>
              {selectionMode && (
                <div className="mt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-foreground">{selectedConversationIds.size} selected</span>
                    <button type="button" onClick={() => setSelectedConversationIds(new Set(archivedConversations.filter(conv => !isLeftChannelForUser(conv, crmUserId)).map(conv => conv._id)))} disabled={bulkAction !== null} className="text-[10px] font-semibold text-green-600 disabled:opacity-50 dark:text-green-400">Select all visible</button>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button type="button" onClick={() => { void runBulkAction('unarchive'); }} disabled={!selectedConversationIds.size || bulkAction !== null} className="rounded-md border border-border/60 px-2 py-1 text-[10px] font-semibold text-foreground disabled:opacity-50">{bulkAction === 'unarchive' ? 'Unarchiving…' : 'Unarchive'}</button>
                    {bulkStatus && <span className="text-[10px] text-muted-foreground" role="status">{bulkStatus}</span>}
                  </div>
                </div>
              )}
            </div>
            {archivedConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <Archive className="mb-2 size-8 text-muted-foreground/30" />
                <p className="text-[12px] font-semibold text-foreground/80">{archiveQuery.trim() ? 'No matching archived chats' : 'No archived chats'}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{archiveQuery.trim() ? 'Try another name or participant.' : 'Archived conversations will appear here.'}</p>
              </div>
            ) : archivedConversations.map((conv) => {
              const name = getDisplayName(conv, crmUserId);
              const avatarSrc = getAvatarSrc(conv, crmUserId);
              const leftChannel = isLeftChannelForUser(conv, crmUserId);
              const selected = selectedConversationIds.has(conv._id);
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={conv._id}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  onClick={() => {
                    if (selectionMode) { if (!leftChannel) toggleSelection(conv._id); return; }
                    handleOpenChange(false);
                    if (typeof window !== 'undefined' && window.innerWidth < 768) router.push('/crm/supra-space?convId=' + conv._id);
                    else openChatPopup(conv._id);
                  }}
                  onKeyDown={event => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (selectionMode) { if (!leftChannel) toggleSelection(conv._id); return; }
                      handleOpenChange(false);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) router.push('/crm/supra-space?convId=' + conv._id);
                      else openChatPopup(conv._id);
                    }
                  }}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {avatarSrc && <AvatarImage src={resolveImageUrl(avatarSrc)} />}
                    <AvatarFallback className="text-[11px] font-semibold bg-linear-to-br from-green-500 to-green-700 text-white">{initials(name)}</AvatarFallback>
                  </Avatar>
                  {selectionMode && !leftChannel && <span className={cn('h-4.5 w-4.5 shrink-0 rounded border flex items-center justify-center', selected ? 'border-green-500 bg-green-500 text-white' : 'border-border/70')} aria-hidden="true">{selected && <Check className="size-3" strokeWidth={3} />}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-foreground/80">{name}</span>
                      {conv.lastMessageAt && <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(conv.lastMessageAt)}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{previewText(conv, crmUserId)}</span>
                    <span className={cn('mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium', leftChannel ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' : 'bg-muted text-muted-foreground')}>
                      {leftChannel ? 'Left channel · read-only' : 'Archived'}
                    </span>
                  </span>
                  {!leftChannel && !selectionMode && (
                    <button
                      type="button"
                      onClick={event => { event.stopPropagation(); void archiveConversation(conv._id, false); }}
                      className="shrink-0 rounded-md p-1.5 text-green-600 transition-colors hover:bg-green-500/10 dark:text-green-400"
                      title="Unarchive"
                      aria-label={`Unarchive ${name}`}
                    >
                      <ArchiveRestore className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* -- Create view -- */
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
                          <AvatarFallback className="text-[10px] font-semibold bg-linear-to-br from-green-500 to-green-700 text-white">{initials(u.fullName)}</AvatarFallback>
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
            <Link href="/crm/supra-space" onClick={() => handleOpenChange(false)}
              className="flex items-center justify-center gap-1.5 text-[11px] text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-semibold transition-colors">
              Open Suprah Space <ArrowUpRight className="size-3" />
            </Link>
          </div>
        )}
      </HeaderDrawer>
    </>
  );
}
