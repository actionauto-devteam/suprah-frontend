'use client';

import * as React from 'react';
import { MessageCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, resolveImageUrl } from '@/lib/utils';
import {
  useSupraSpaceMessenger,
  SSConv,
} from '@/context/SupraSpaceMessengerContext';

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
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
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
    image: '📷 Photo',
    voice: '🎤 Voice message',
    gif: '🎬 GIF',
    file: '📎 File',
    poll: '📊 Poll',
    event: '📅 Event',
  };
  return icons[msg.type] ?? msg.content ?? '';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessengerDropdown() {
  const { conversations, totalUnread, crmUserId, openChatPopup } =
    useSupraSpaceMessenger();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-full relative overflow-visible transition-all duration-300',
            totalUnread > 0
              ? 'border-blue-300 dark:border-blue-700 shadow-sm shadow-blue-500/10'
              : 'border-border/80 bg-background text-foreground/85 shadow-sm ring-1 ring-border/35 dark:ring-border/45'
          )}
        >
          <MessageCircle
            className={cn(
              'size-4',
              totalUnread > 0
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-foreground/70'
            )}
          />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm pointer-events-none">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="p-0 w-80 max-h-[480px] flex flex-col overflow-hidden rounded-xl shadow-xl border-border/60"
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-border/50 bg-card/90 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground tracking-tight">
                Suprah Space
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                {totalUnread > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    {totalUnread} unread
                  </span>
                ) : (
                  'All caught up'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-card/80">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <MessageCircle className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-[12px] text-muted-foreground">
                No conversations yet
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const msg = conv.lastMessage;
              const isUnread =
                !!msg &&
                !msg.isDeleted &&
                msg.sender?._id !== crmUserId &&
                !msg.readBy?.includes(crmUserId || '');

              const name = getDisplayName(conv, crmUserId);
              const avatarSrc = getAvatarSrc(conv, crmUserId);

              return (
                <button
                  key={conv._id}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                    isUnread && 'bg-blue-500/5 hover:bg-blue-500/10'
                  )}
                  onClick={() => openChatPopup(conv._id)}
                >
                  {/* Avatar with unread dot */}
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      {avatarSrc && (
                        <AvatarImage src={resolveImageUrl(avatarSrc)} />
                      )}
                      <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                    {isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  {/* Name + preview + time */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-[13px] truncate',
                          isUnread
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground/80'
                        )}
                      >
                        {name}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {relativeTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-[11px] truncate mt-0.5',
                        isUnread
                          ? 'text-foreground/70 font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      {previewText(conv)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer link */}
        <div className="shrink-0 border-t border-border/50 px-4 py-2 bg-card/90">
          <Link
            href="/crm/supra-space"
            className="flex items-center justify-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors"
          >
            Open Suprah Space
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
