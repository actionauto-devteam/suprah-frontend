'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { EMOJI_CATS, EMOJI_SEARCH } from '@/lib/emoji-data';

export interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: { top: number; left?: number; right?: number };
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

  const displayCat = EMOJI_CATS.find(c => c.key === activeCat) ?? EMOJI_CATS[0];
  const displayEmojis = searchResults ?? displayCat.emojis;
  const top = Math.max(8, Math.min(position.top, (typeof window !== 'undefined' ? window.innerHeight : 800) - 360));

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-9999 flex flex-col rounded-2xl shadow-2xl"
      style={{
        top,
        left: position.left,
        right: position.right,
        width: 288,
        height: 340,
        background: 'var(--bg-elevated,#18191c)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Search */}
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

      {/* Category tabs */}
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

      {/* Category label */}
      <div className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/30 shrink-0">
        {search ? `Results for "${search}"` : displayCat.label}
      </div>

      {/* Emoji grid */}
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
