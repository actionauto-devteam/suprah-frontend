export type SupraSpaceVoiceRecordingIntent = {
  sendRequested: boolean;
};

export function getSupportedSupraSpaceVoiceMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
}

export function createSupraSpaceVoiceRecordingIntent(): SupraSpaceVoiceRecordingIntent {
  return { sendRequested: false };
}

export function setSupraSpaceVoiceRecordingSendIntent(
  intent: SupraSpaceVoiceRecordingIntent | null,
  sendRequested: boolean,
): void {
  if (intent) intent.sendRequested = sendRequested;
}
