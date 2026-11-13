"use client";

/**
 * Bridge to the MeetScreenShare Capacitor plugin (iOS app only).
 *
 * Real screen capture is impossible in the webview, so inside the native app
 * the Meet share button hands off to a ReplayKit broadcast extension that
 * joins the same Chime meeting as the content share. This module is the thin
 * typed wrapper the web code calls; on the website it is never invoked
 * (guard call sites with isNativeApp()).
 */

import { registerPlugin } from "@capacitor/core";

export interface MeetScreenSharePlugin {
  /** Stage the Chime join credentials for the broadcast extension.
   *  Call right after a successful meeting join. */
  prepare(options: {
    meetingJson: string;
    attendeeJson: string;
  }): Promise<void>;
  /** Open the iOS system broadcast picker targeted at the Suprah extension. */
  presentPicker(): Promise<void>;
  /** Ask a running broadcast to finish (no-op when none is running). */
  stop(): Promise<void>;
  /** Wipe staged credentials — call when leaving the meeting. */
  clear(): Promise<void>;
}

export const MeetScreenShare =
  registerPlugin<MeetScreenSharePlugin>("MeetScreenShare");
