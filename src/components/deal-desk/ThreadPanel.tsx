'use client';

import * as React from 'react';
import { Send, Bot, Info } from 'lucide-react';
import { Avatar, Spinner } from './ui';
import { dealDeskApi } from '@/lib/deal-desk/api';
import { retainDealDeskSocket, releaseDealDeskSocket } from '@/lib/deal-desk/socket';
import { useNow, toast } from '@/lib/deal-desk/hooks';
import { shortTime, cn } from '@/lib/deal-desk/format';
import type { DealMessage } from '@/lib/deal-desk/types';

export function ThreadPanel({ dealId, messages, meId, onSent, typing, className }: { dealId: string; messages: DealMessage[]; meId?: string; onSent: (m: DealMessage) => void; typing?: { name: string; at: number } | null; className?: string }) {
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const lastTyping = React.useRef(0);
  const now = useNow();
  const stick = React.useRef(true);

  React.useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await dealDeskApi.postMessage(dealId, body);
      onSent(res.message);
      setText('');
      stick.current = true;
    } catch (e: any) {
      toast({ title: 'Message not sent', body: e.message, tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  const emitTyping = () => {
    if (Date.now() - lastTyping.current < 2500) return;
    lastTyping.current = Date.now();
    const s = retainDealDeskSocket();
    s.emit('deal:typing', { dealId });
    releaseDealDeskSocket();
  };

  const showTyping = typing && now - typing.at < 4000;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-width:thin]"
      >
        {!messages.length && <div className="py-10 text-center text-sm text-muted-foreground">No messages yet. Everyone on this deal sees this thread live.</div>}
        {messages.map((m, i) => {
          const mine = m.authorId && m.authorId === meId;
          const prev = messages[i - 1];
          const grouped = prev && prev.authorId === m.authorId && prev.kind === m.kind && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 120000;
          if (m.kind !== 'user') {
            return (
              <div key={m.id} className="flex items-start gap-2 text-xs">
                <div className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', m.kind === 'ai' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300' : 'bg-muted text-muted-foreground')}>
                  {m.kind === 'ai' ? <Bot className="size-3" /> : <Info className="size-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground">{m.body}</span>
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground/70">{shortTime(m.createdAt)}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={cn('flex gap-2', mine && 'flex-row-reverse', grouped && '-mt-2')}>
              <div className="w-7 shrink-0">{!grouped && !mine && <Avatar name={m.authorName} size="sm" />}</div>
              <div className={cn('max-w-[80%]', mine && 'items-end text-right')}>
                {!grouped && (
                  <div className={cn('mb-0.5 flex items-baseline gap-2 text-[11px]', mine && 'flex-row-reverse')}>
                    <span className="font-semibold">{mine ? 'You' : m.authorName}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{shortTime(m.createdAt)}</span>
                  </div>
                )}
                <div className={cn('inline-block whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-sm', mine ? 'rounded-tr-md bg-primary text-primary-foreground' : 'rounded-tl-md bg-muted')}>{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-5 px-4 text-[11px] text-muted-foreground">{showTyping && `${typing!.name} is typing…`}</div>
      <div className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            emitTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Message the deal team…"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        <button onClick={send} disabled={sending || !text.trim()} className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:bg-primary/90 disabled:opacity-40" aria-label="Send">
          {sending ? <Spinner className="text-primary-foreground" /> : <Send className="size-4" />}
        </button>
      </div>
    </div>
  );
}
