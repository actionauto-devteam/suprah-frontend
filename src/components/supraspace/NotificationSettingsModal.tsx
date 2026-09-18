'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import type { SSConversation } from '@/hooks/useSupraSpaceSocket';

export type SupraSpaceNotificationPreferences = {
  type: 'all' | 'main' | 'foryou' | 'none';
  muted: boolean;
  muteUntil?: string | null;
};

const MUTE_DURATIONS: { label: string; ms: number | null }[] = [
  { label: '15 minutes', ms: 15 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '8 hours', ms: 8 * 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Until I turn it back on', ms: null },
];

type NotificationSettingsModalProps = {
  conversation: SSConversation;
  conversationName: string;
  preferences: SupraSpaceNotificationPreferences;
  onSave: (preferences: Required<SupraSpaceNotificationPreferences>) => void;
  onClose: () => void;
};

export function NotificationSettingsModal({
  conversation,
  conversationName,
  preferences,
  onSave,
  onClose,
}: NotificationSettingsModalProps) {
  const [type, setType] = React.useState<SupraSpaceNotificationPreferences['type']>(preferences.type);
  const [muted, setMuted] = React.useState(preferences.muted);
  const [muteDurationLabel, setMuteDurationLabel] = React.useState(preferences.muteUntil ? '' : 'Until I turn it back on');
  const [muteUntil, setMuteUntil] = React.useState<string | null>(preferences.muteUntil ?? null);
  const isDirectMessage = conversation.type === 'direct';
  const options = isDirectMessage
    ? [
      { value: 'all' as const, label: 'All', description: 'All new messages and threads' },
      { value: 'main' as const, label: 'Main conversations', description: 'New messages from main conversations, and replies to threads you follow' },
      { value: 'none' as const, label: 'None', description: 'No notifications' },
    ]
    : [
      { value: 'all' as const, label: 'All', description: 'All new messages and threads' },
      { value: 'main' as const, label: 'Main conversations', description: 'New messages from main conversations, and replies to threads you follow' },
      { value: 'foryou' as const, label: 'For you', description: 'Only @mentions and replies to threads you follow' },
      { value: 'none' as const, label: 'None', description: 'No notifications' },
    ];

  return (
    <div className="ss4-overlay fixed inset-0 z-200 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={event => event.stopPropagation()} style={{ background: '#2a2b2f', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: '24px 24px 16px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e3e5e8', marginBottom: 4 }}>{conversationName}</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>Notifications</p>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {options.map(option => (
            <label key={option.value} onClick={() => setType(option.value)} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', cursor: 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${type === option.value ? '#16a34a' : 'rgba(255,255,255,0.3)'}`, background: type === option.value ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
                {type === option.value && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#e3e5e8', lineHeight: 1.3 }}>{option.label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: 2 }}>{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 0 14px' }} />

        <label onClick={() => setMuted(value => !value)} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${muted ? '#16a34a' : 'rgba(255,255,255,0.3)'}`, background: muted ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
            {muted && <Check className="h-2.5 w-2.5 text-white" />}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#e3e5e8', lineHeight: 1.3 }}>Mute conversation</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: 2 }}>Muted conversations are italicized and appear at the bottom of your conversation list, and will not appear in Home</p>
          </div>
        </label>

        {muted && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingLeft: 32 }}>
            {MUTE_DURATIONS.map(option => {
              const active = muteDurationLabel === option.label;
              return (
                <button key={option.label} type="button" onClick={() => { setMuteDurationLabel(option.label); setMuteUntil(option.ms ? new Date(Date.now() + option.ms).toISOString() : null); }} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? '#16a34a' : 'rgba(255,255,255,0.15)'}`, background: active ? 'rgba(88,101,242,0.2)' : 'transparent', color: active ? '#c7cdff' : 'rgba(255,255,255,0.6)' }}>
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={() => { onSave({ type, muted, muteUntil: muted ? muteUntil : null }); onClose(); }} style={{ padding: '8px 20px', borderRadius: 8, background: '#16a34a', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  );
}
