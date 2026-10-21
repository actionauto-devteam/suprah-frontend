export type SupraSpaceVoiceRecordingIntent = {
  sendRequested: boolean;
};

export function createSupraSpaceVoiceRecordingIntent(): SupraSpaceVoiceRecordingIntent {
  return { sendRequested: false };
}

export function setSupraSpaceVoiceRecordingSendIntent(
  intent: SupraSpaceVoiceRecordingIntent | null,
  sendRequested: boolean,
): void {
  if (intent) intent.sendRequested = sendRequested;
}
