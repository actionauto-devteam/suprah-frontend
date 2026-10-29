'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import type { SSMessage } from '@/hooks/useSupraSpaceSocket';
import { getSupraSpaceMessagePreviewText } from '@/lib/supra-space-conversation-preview';
import { supraSpaceSearchExcerpt } from '@/lib/supraspace-message-navigation';
import { useMessageSearch } from './useMessageSearch';

export function MessageSearchModal({ conversationId, token, onClose, onSelect }: {
  conversationId: string;
  token: string | null;
  onClose: () => void;
  onSelect: (message: SSMessage, query: string) => void;
}) {
  const [query, setQuery] = React.useState('');
  const search = useMessageSearch<SSMessage>(token, query, conversationId);
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus({ preventScroll: true });
    return () => previous?.focus({ preventScroll: true });
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 p-3" onClick={event => {
      if (event.target === event.currentTarget) onClose();
    }} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not(:disabled)'));
        const next = event.shiftKey ? focusable.at(-1) : focusable[0];
        if (document.activeElement === (event.shiftKey ? focusable[0] : focusable.at(-1))) {
          event.preventDefault(); next?.focus();
        }
      }
    }}>
      <section role="dialog" aria-modal="true" aria-label="Search conversation" className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl" style={{ maxHeight: 'min(680px, 90dvh)' }}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Search conversation</h2>
          <button type="button" aria-label="Close search" onClick={onClose} className="rounded px-2 py-1 text-sm">Close</button>
        </div>
        <div className="p-3">
          <input ref={inputRef} type="search" aria-label="Search messages" placeholder="Search messages" value={query} onChange={event => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-3" aria-busy={search.searching}>
          {query.trim().length < 2 && <p className="py-4 text-center text-xs text-muted-foreground">Enter at least 2 characters.</p>}
          {search.results.map(message => <button type="button" key={message._id} onClick={() => onSelect(message, query)} className="mb-2 block w-full rounded-lg border border-border bg-muted/40 p-3 text-left">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-semibold">{message.sender?.fullName || 'Deleted User'}</span>
              <time className="shrink-0 text-muted-foreground" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleDateString()}</time>
            </div>
            <p className="mt-1 whitespace-normal break-words text-xs text-muted-foreground">{supraSpaceSearchExcerpt(getSupraSpaceMessagePreviewText(message.content), query).map((part, index) => part.match
              ? <mark key={index} style={{ background: '#fbbf24', color: '#1c1917' }}>{part.text}</mark>
              : <React.Fragment key={index}>{part.text}</React.Fragment>)}</p>
          </button>)}
          {search.searching && <p role="status" className="py-3 text-center text-xs text-muted-foreground">Searching...</p>}
          {!search.searching && !search.error && query.trim().length >= 2 && search.results.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No matching messages</p>}
          {(search.hasMore || search.error) && <button type="button" disabled={search.searching} onClick={search.loadMore} className="w-full rounded-lg border border-border px-3 py-2 text-xs">{search.error ? 'Search failed. Retry' : 'Load older matches'}</button>}
        </div>
      </section>
    </div>, document.body,
  );
}
