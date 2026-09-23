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
};

export function createMessageId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, '0')).join('');
}
