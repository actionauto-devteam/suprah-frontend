'use client';

import * as React from 'react';
import { SmilePlus, X } from 'lucide-react';
import { EmojiReactionPicker } from '@/components/supraspace/EmojiReactionPicker';
import { apiClient } from '@/lib/api-client';
import type { SSConversation } from '@/hooks/useSupraSpaceSocket';

const THEME_PRESETS: { name: string; accent: string | null; wallpaper: string | null }[] = [
  { name: 'Default', accent: null, wallpaper: null },
  { name: 'Ocean', accent: '#2e7fff', wallpaper: 'linear-gradient(160deg, rgba(46,127,255,0.14) 0%, rgba(46,127,255,0.05) 100%)' },
  { name: 'Sunset', accent: '#f0683c', wallpaper: 'linear-gradient(160deg, rgba(240,104,60,0.16) 0%, rgba(240,104,60,0.06) 100%)' },
  { name: 'Forest', accent: '#22b060', wallpaper: 'linear-gradient(160deg, rgba(34,176,96,0.16) 0%, rgba(34,176,96,0.06) 100%)' },
  { name: 'Berry', accent: '#a855f7', wallpaper: 'linear-gradient(160deg, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0.06) 100%)' },
  { name: 'Rose', accent: '#f0568a', wallpaper: 'linear-gradient(160deg, rgba(240,86,138,0.16) 0%, rgba(240,86,138,0.06) 100%)' },
  { name: 'Gold', accent: '#e0a13a', wallpaper: 'linear-gradient(160deg, rgba(224,161,58,0.16) 0%, rgba(224,161,58,0.06) 100%)' },
  { name: 'Slate', accent: '#64748b', wallpaper: 'linear-gradient(160deg, rgba(100,116,139,0.16) 0%, rgba(100,116,139,0.06) 100%)' },
  { name: 'Ice', accent: '#22d3ee', wallpaper: 'linear-gradient(160deg, rgba(34,211,238,0.14) 0%, rgba(34,211,238,0.05) 100%)' },
];

const QUICK_REACTION_CHOICES = ['❤️', '😂', '😮', '😢', '👌', '👍', '🔥', '🎉', '👏', '🙏', '💯', '😍', '🤔', '😅', '🙌', '✅'];

type ConversationSettingsModalProps = {
  current?: SSConversation['theme'];
  conversation?: SSConversation;
  userId?: string;
  token?: string;
  reactionChoices: string[];
  onClose: () => void;
  onApply: (theme: { accent: string | null; wallpaper: string | null; emoji: string | null }) => void;
  onMemberSettingsSaved?: (settings: { nickname: string | null; quickReactions: string[] }) => void;
  initialTab?: 'theme' | 'nickname' | 'reactions';
};

export function ConversationSettingsModal({
  current,
  conversation,
  userId,
  token,
  reactionChoices,
  onClose,
  onApply,
  onMemberSettingsSaved,
  initialTab,
}: ConversationSettingsModalProps) {
  const [accent, setAccent] = React.useState<string | null>(current?.accent || null);
  const [wallpaper, setWallpaper] = React.useState<string | null>(current?.wallpaper || null);
  const [emoji, setEmoji] = React.useState<string | null>(current?.emoji || null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const emojiButtonRef = React.useRef<HTMLButtonElement>(null);
  const [tab, setTab] = React.useState<'theme' | 'nickname' | 'reactions'>(initialTab || 'theme');
  const member = conversation?.members?.find(item => item._id === userId);
  const [nickname, setNickname] = React.useState(member?.displayNickname || '');
  const [reactions, setReactions] = React.useState<string[]>(conversation?.viewerQuickReactions?.length ? conversation.viewerQuickReactions : reactionChoices.slice(0, 6));
  const [savingSettings, setSavingSettings] = React.useState(false);

  const toggleReaction = (value: string) => setReactions(previous => {
    if (previous.includes(value)) return previous.filter(item => item !== value);
    if (previous.length >= 8) return previous;
    return [...previous, value];
  });

  const saveMemberSettings = async () => {
    if (!conversation || !token || savingSettings) return;
    setSavingSettings(true);
    try {
      await apiClient.patch(
        `/api/supraspace/conversations/${conversation._id}/member-settings`,
        { nickname: nickname.trim() || null, quickReactions: reactions },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onMemberSettingsSaved?.({ nickname: nickname.trim() || null, quickReactions: reactions });
      onClose();
    } catch {
    } finally {
      setSavingSettings(false);
    }
  };

  if (!conversation) return null;

  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Channel settings</h2>
          <button type="button" onClick={onClose} className="ss4-icon-btn h-7 w-7" aria-label="Close channel settings"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex" style={{ borderBottom: '1px solid var(--border-1)' }}>
          {(['theme', 'nickname', 'reactions'] as const).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className="flex-1 py-2 text-xs font-semibold capitalize"
              style={{ color: tab === value ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: tab === value ? '2px solid var(--accent)' : '2px solid transparent' }}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="max-h-[50vh] space-y-4 overflow-y-auto px-4 py-4">
          {tab === 'theme' && (
            <>
              <div>
                <p className="ss4-section-label mb-2">Presets</p>
                <div className="grid grid-cols-4 gap-2">
                  {THEME_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => { setAccent(preset.accent); setWallpaper(preset.wallpaper); }}
                      className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all"
                      style={{ border: `1px solid ${accent === preset.accent ? 'var(--accent)' : 'var(--border-2)'}`, background: accent === preset.accent ? 'var(--accent-muted)' : 'transparent' }}
                    >
                      <span className="h-7 w-7 rounded-full" style={{ background: preset.accent || 'linear-gradient(140deg,#15803d,#16a34a)' }} />
                      <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="ss4-section-label mb-2">Custom color</p>
                <div className="flex items-center gap-3">
                  <input type="color" value={accent || '#16a34a'} onChange={event => setAccent(event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg" style={{ background: 'transparent', border: '1px solid var(--border-2)' }} />
                  <span className="ss4-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{accent || 'default'}</span>
                </div>
              </div>
              <div>
                <p className="ss4-section-label mb-2">Default reaction (double-click a message)</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {reactionChoices.slice(0, 8).map(value => (
                    <button key={value} type="button" onClick={() => setEmoji(value)} className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all hover:scale-110" style={{ border: `1px solid ${emoji === value ? 'var(--accent)' : 'var(--border-2)'}`, background: emoji === value ? 'var(--accent-muted)' : 'transparent' }}>
                      {value}
                    </button>
                  ))}
                  <button ref={emojiButtonRef} type="button" onClick={() => setPickerOpen(open => !open)} className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-110" style={{ border: '1px solid var(--border-2)' }} title="More emojis">
                    <SmilePlus className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  {pickerOpen && (
                    <EmojiReactionPicker
                      onSelect={value => setEmoji(value)}
                      onClose={() => setPickerOpen(false)}
                      position={emojiButtonRef.current ? { top: emojiButtonRef.current.getBoundingClientRect().bottom + 6, left: emojiButtonRef.current.getBoundingClientRect().left } : { top: 200, left: 200 }}
                    />
                  )}
                </div>
              </div>
              <button type="button" onClick={() => onApply({ accent, wallpaper, emoji })} className="ss4-send-btn h-9 w-full rounded-lg font-semibold" style={{ fontSize: 13 }}>Apply Theme</button>
            </>
          )}
          {tab === 'nickname' && (
            <div>
              <p className="ss4-section-label mb-2">Display name others see for you in {conversation.name || 'this channel'}</p>
              <input value={nickname} onChange={event => setNickname(event.target.value.slice(0, 32))} placeholder="Your real name" className="h-9 w-full rounded-lg px-3 text-sm outline-none" style={{ border: '1px solid var(--border-2)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <button type="button" onClick={saveMemberSettings} disabled={savingSettings} className="ss4-send-btn mt-3 h-9 w-full rounded-lg font-semibold" style={{ fontSize: 13 }}>Save</button>
            </div>
          )}
          {tab === 'reactions' && (
            <div>
              <p className="ss4-section-label mb-2">Pick up to 8 emoji for your quick-react bar</p>
              <div className="grid grid-cols-6 gap-1.5">
                {QUICK_REACTION_CHOICES.map(value => {
                  const active = reactions.includes(value);
                  return (
                    <button key={value} type="button" onClick={() => toggleReaction(value)} className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all" style={{ border: `1px solid ${active ? 'var(--accent)' : 'var(--border-2)'}`, background: active ? 'var(--accent-muted)' : 'transparent' }}>
                      {value}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={saveMemberSettings} disabled={savingSettings} className="ss4-send-btn mt-3 h-9 w-full rounded-lg font-semibold" style={{ fontSize: 13 }}>Save</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
