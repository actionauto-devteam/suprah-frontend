
'use client';

import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

interface JitsiMeetProps {
  roomName: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  jwt?: string;
  domain?: string;
  onClose: () => void;
  onError?: (error: any) => void;
}

export function JitsiMeet({
  roomName,
  displayName,
  email,
  avatarUrl,
  jwt,
  domain,
  onClose,
  onError,
}: JitsiMeetProps) {
  const resolvedDomain = domain || process.env.NEXT_PUBLIC_JITSI_DOMAIN || '8x8.vc';
  const hasJoined = React.useRef(false);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <JitsiMeeting
        domain={resolvedDomain}
        roomName={roomName}
        jwt={jwt}
        configOverwrite={{
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          disableModeratorIndicator: false,
          disableDeepLinking: true,
          disableInviteFunctions: true,
          enableEmailInStats: false,
          toolbarButtons: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'recording',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'tileview',
            'select-background',
            'mute-everyone',
            'security',
          ],
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          MOBILE_APP_PROMO: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Team Member',
        }}
        userInfo={{ displayName, email: email || '' }}
        onApiReady={(externalApi) => {
          if (avatarUrl) {
            try {
              externalApi.executeCommand('avatarUrl', avatarUrl);
            } catch {
            }
          }
          externalApi.addEventListeners({
            videoConferenceJoined: () => { hasJoined.current = true; },
            videoConferenceLeft: () => { if (hasJoined.current) onClose(); },
          });
        }}
        onReadyToClose={onClose}
        getIFrameRef={(iframeRef) => {
          // 100vh/100vw don't account for iOS's dynamic browser chrome and
          // safe areas (notch/Dynamic Island) — Jitsi's own internal layout
          // (its top call-info bar, bottom toolbar) then computes against an
          // incorrect viewport, pushing its own controls up under the notch
          // (unreachable) and leaving dead space elsewhere. 100dvh/100dvw
          // resolve to the actual visible viewport instead — same fix this
          // codebase already uses elsewhere (see ss4-mobile-emoji-panel).
          iframeRef.style.height = '100dvh';
          iframeRef.style.width = '100dvw';
        }}
      />
    </div>
  );
}
