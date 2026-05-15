'use client';

import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

interface JitsiMeetProps {
  roomName: string;
  displayName: string;
  onClose: () => void;
  onError?: (error: any) => void;
}

export function JitsiMeet({ roomName, displayName, onClose, onError }: JitsiMeetProps) {
  const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <JitsiMeeting
        domain={domain}
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          disableModeratorIndicator: false,
          startScreenSharing: false,
          enableEmailInStats: false,
          prejoinPageEnabled: false,
          disableInviteFunctions: true,
          hideConferenceSubject: false,
          hideConferenceTimer: false,
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
            'livestreaming',
            'etherpad',
            'sharedvideo',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'stats',
            'shortcuts',
            'tileview',
            'select-background',
            'help',
            'mute-everyone',
          ],
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_ALWAYS_VISIBLE: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Team Member',
          MOBILE_APP_PROMO: false,
        }}
        userInfo={{
          displayName: displayName,
          email: '',
        }}
        onApiReady={(externalApi) => {
          console.log('[Jitsi] API Ready');
          
          // Add custom event listeners
          externalApi.addEventListeners({
            readyToClose: () => {
              console.log('[Jitsi] Ready to close');
              onClose();
            },
            videoConferenceLeft: () => {
              console.log('[Jitsi] Left conference');
              onClose();
            },
            participantLeft: (participant: any) => {
              console.log('[Jitsi] Participant left:', participant);
            },
            participantJoined: (participant: any) => {
              console.log('[Jitsi] Participant joined:', participant);
            },
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