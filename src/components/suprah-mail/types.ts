export interface MailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesUnread?: number;
}

export interface MailAttachmentMeta {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  isInline: boolean;
}

export interface MailMessageMeta {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: number;
  subject: string;
  from: { name: string; email: string };
  to: string;
  cc?: string;
  date: string;
  rfc822MessageId?: string;
  references?: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments: MailAttachmentMeta[];
  isUnread: boolean;
  isStarred: boolean;
}

export interface MailDraft {
  draftId: string;
  message: MailMessageMeta;
}

export interface ConvAttachment {
  originalName: string;
  mimeType: string;
  size: number;
  storageUrl?: string;
  gmailMessageId?: string;
  gmailAttachmentId?: string;
}

export interface ConvParticipant {
  email: string;
  name?: string;
  addedAt?: string;
}

export interface MailConv {
  _id: string;
  type: 'direct' | 'group';
  participants: ConvParticipant[];
  title?: string;
  subject: string;
  gmailThreadId?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageDirection?: 'inbound' | 'outbound';
  lastMessageFromName?: string;
  unreadCount: number;
  isArchived: boolean;
  /** Back-compat: the API still returns these virtuals; safe to keep reading. */
  externalEmail?: string;
  externalName?: string;
}

export interface ConvMessage {
  _id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: ConvAttachment[];
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  errorMessage?: string;
  readByOwner: boolean;
  sentAt: string;
}

export type ComposePrefill = {
  mode: 'new' | 'reply' | 'forward' | 'draft';
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  draftId?: string;
};

export interface MailStatus {
  connected: boolean;
  gmailAddress: string | null;
  lastSyncError?: string | null;
}

export interface ConvPushPayload {
  conversationId: string;
  message: ConvMessage;
}

export interface NewConversationPayload {
  participants: { email: string; name?: string }[];
  title?: string;
  subject: string;
}