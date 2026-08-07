'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { EMOJI_CATS, EMOJI_SEARCH } from '@/lib/emoji-data';

export interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: {
    top: number;
    left?: number;
    right?: number;
    boundary?: { top: number; right: number; bottom: number; left: number };
  };
}

export function EmojiReactionPicker({ onSelect, onClose, position }: EmojiReactionPickerProps) {
  const [search, setSearch] = React.useState('');
  const [activeCat, setActiveCat] = React.useState('frequent');
  const pickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const searchResults = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const seen = new Set<string>();
    return EMOJI_CATS.flatMap(c => c.emojis).filter(emoji => {
      if (seen.has(emoji)) return false;
      seen.add(emoji);
      return emoji === q || (EMOJI_SEARCH[emoji] || '').includes(q);
    });
  }, [search]);

  if (typeof document === 'undefined') return null;

  const displayCat = EMOJI_CATS.find(c => c.key === activeCat) ?? EMOJI_CATS[0];
  const displayEmojis = searchResults ?? displayCat.emojis;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const boundary = position.boundary ?? {
    top: 0,
    right: viewportWidth,
    bottom: viewportHeight,
    left: 0,
  };
  const edge = Math.min(viewportWidth, boundary.right - boundary.left) < 640 ? 12 : 8;
  const safeLeft = Math.max(edge, boundary.left + edge);
  const safeRight = Math.min(viewportWidth - edge, boundary.right - edge);
  const safeTop = Math.max(edge, boundary.top + edge);
  const safeBottom = Math.min(viewportHeight - edge, boundary.bottom - edge);
  const availableWidth = Math.max(0, safeRight - safeLeft);
  const availableHeight = Math.max(0, safeBottom - safeTop);
  const width = Math.min(288, availableWidth);
  const height = Math.min(340, availableHeight);
  const requestedLeft = position.left
    ?? (position.right !== undefined ? viewportWidth - position.right - width : safeLeft);
  const left = Math.max(safeLeft, Math.min(requestedLeft, safeRight - width));
  const top = Math.max(safeTop, Math.min(position.top, safeBottom - height));

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-9999 flex flex-col rounded-2xl shadow-2xl"
      style={{
        top,
        left,
        width,
        height,
        background: 'var(--bg-elevated,#18191c)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      { }
      <div className="p-2 border-b border-white/10 shrink-0">
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full rounded-lg px-3 py-1.5 text-white placeholder:text-white/40 outline-none"
          style={{ background: 'rgba(255,255,255,0.08)', fontSize: 13, border: 'none' }}
        />
      </div>

      { }
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-white/10 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {EMOJI_CATS.map(cat => (
          <button
            key={cat.key}
            onClick={() => { setActiveCat(cat.key); setSearch(''); }}
            title={cat.label}
            className={cn(
              'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors',
              activeCat === cat.key && !search
                ? 'bg-(--positive-muted,rgba(52,201,125,0.2)) text-white'
                : 'hover:bg-white/10 text-white/50'
            )}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      { }
      <div className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/30 shrink-0">
        {search ? `Results for "${search}"` : displayCat.label}
      </div>

      { }
      <div className="flex-1 overflow-y-auto px-1.5 pb-2 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {displayEmojis.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-[11px] text-white/30">No results</div>
        ) : (
          <div className="grid grid-cols-8 gap-0">
            {displayEmojis.map((emoji, i) => (
              <button
                key={emoji + i}
                onClick={() => { onSelect(emoji); onClose(); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 text-base transition-colors leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function MobileEmojiReactionSheet({
  onSelect,
  onClose,
  host,
  quickReactions = [],
  onCustomize,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  host?: HTMLElement | null;
  quickReactions?: string[];
  onCustomize?: () => void;
}) {
  const [search, setSearch] = React.useState('');
  const sheetRef = React.useRef<HTMLDivElement>(null);

  const searchResults = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const seen = new Set<string>();
    return EMOJI_CATS.flatMap(c => c.emojis).filter(emoji => {
      if (seen.has(emoji)) return false;
      seen.add(emoji);
      return emoji === q || (EMOJI_SEARCH[emoji] || '').includes(q);
    });
  }, [search]);

  if (typeof document === 'undefined') return null;

  const target = host || document.body;
  const recent = EMOJI_CATS[0]?.emojis.slice(0, 8) || [];
  const facebookReactions = ['👍', '❤️', '🥰', '😆', '😮', '😢', '😡'];
  const firstSmileys = EMOJI_CATS.find(c => c.key === 'smileys')?.emojis || [];
  const sections = searchResults
    ? [{ label: `Results for "${search}"`, emojis: searchResults }]
    : [
      { label: 'Your reactions', emojis: quickReactions.length ? quickReactions : recent.slice(0, 6) },
      { label: 'Recent', emojis: recent },
      { label: 'Facebook Reactions', emojis: facebookReactions },
      { label: 'Smileys & people', emojis: firstSmileys },
    ];

  return createPortal(
    <div
      className="absolute inset-0 z-65 md:hidden"
      onTouchMove={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="absolute left-4 right-4 rounded-t-[26px] px-4 pb-5 pt-3"
        style={{
          top: 'max(88px, env(safe-area-inset-top, 0px) + 64px)',
          bottom: 0,
          background: '#3a3a3c',
          color: '#f5f5f5',
          boxShadow: '0 -22px 70px rgba(0,0,0,0.45)',
          animation: 'ss4-mobile-sheet-in .18s cubic-bezier(.2,.8,.2,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-11 rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }} />
        <div className="mb-5 flex h-12 items-center gap-2 rounded-full px-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
          <span className="text-xl leading-none" style={{ color: 'rgba(255,255,255,0.7)' }}>⌕</span>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/65"
          />
        </div>
        <div className="h-[calc(100%-76px)] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.28) transparent' }}>
          {sections.map(section => (
            <div key={section.label} className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.68)' }}>{section.label}</p>
                {section.label === 'Your reactions' && onCustomize && (
                  <button className="text-xs font-bold" style={{ color: '#5da8ff' }} type="button" onClick={() => { onCustomize(); onClose(); }}>
                    CUSTOMIZE
                  </button>
                )}
              </div>
              {section.emojis.length === 0 ? (
                <div className="py-6 text-center text-sm text-white/50">No emojis found</div>
              ) : (
                <div className="grid grid-cols-7 gap-x-2 gap-y-3">
                  {section.emojis.map((emoji, index) => (
                    <button
                      key={`${section.label}-${emoji}-${index}`}
                      type="button"
                      onClick={() => { onSelect(emoji); onClose(); }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-4xl leading-none transition active:scale-90"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    target,
  );
}
