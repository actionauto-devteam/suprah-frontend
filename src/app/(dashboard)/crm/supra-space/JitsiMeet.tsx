'use client';

import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

interface JitsiMeetProps {
  roomName: string; // already tenant-prefixed by the backend for JaaS
  displayName: string;
  email?: string;
  avatarUrl?: string;
  jwt?: string; // undefined when JaaS isn't configured (fallback path)
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
  // Guard: only close when the user has actually entered the conference.
  // videoConferenceLeft can fire during a failed join attempt (JWT error, room
  // rejected, etc.), which would kick users back before the call ever starts.
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
              /* avatar is best-effort */
            }
          }
          externalApi.addEventListeners({
            videoConferenceJoined: () => { hasJoined.current = true; },
            videoConferenceLeft: () => { if (hasJoined.current) onClose(); },
          });
        }}
        onReadyToClose={onClose}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100vh';
          iframeRef.style.width = '100vw';
        }}
      />
    </div>
  );
}
