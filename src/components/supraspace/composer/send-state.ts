import type { SSMessage, SSGif } from '@/hooks/useSupraSpaceSocket';

export type ComposerDraft = {
  content: string;
  files: File[];
  reply: SSMessage | null;
  gif: SSGif | null;
};

export type FailedSend = ComposerDraft & {
  id: string;
  conversationId: string;
  scheduledAt?: string;
  /** Local message that stays visible while its delivery can be retried. */
  optimisticMessageId?: string;
  /** Object URLs held by a failed attachment bubble until it is retried or dismissed. */
  localPreviewUrls?: string[];
  deliveryStatus?: 'checking' | 'failed' | 'unknown';
  failureMessage?: string;
};

export function createMessageId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, '0')).join('');
}
