'use client';

import type { SSConversation, SSMessage } from '@/hooks/useSupraSpaceSocket';

type SupraSpaceCachedUser = {
  _id: string;
  fullName?: string;
  username?: string;
  avatar?: string;
  role?: string;
};

export type SupraSpaceCacheSnapshot = {
  userId: string;
  activeConversationId?: string | null;
  conversations: SSConversation[];
  messages: Record<string, SSMessage[]>;
  hasMore: Record<string, boolean>;
  myProfile?: SupraSpaceCachedUser;
  allUsers?: SupraSpaceCachedUser[];
  updatedAt: number;
};

const DB_NAME = 'suprah-space-cache';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_CONVERSATIONS = 100;
const MAX_MESSAGE_CONVERSATIONS = 16;
const MAX_MESSAGES_PER_CONVERSATION = 50;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getSupraSpaceCacheUserIdFromToken(token?: string | null): string | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const payload = JSON.parse(window.atob(token.split('.')[1] || ''));
    return typeof payload?.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open cache'));
  });
  return dbPromise;
}

function runStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = callback(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Cache request failed'));
    tx.onerror = () => reject(tx.error || new Error('Cache transaction failed'));
  }));
}

function normalizeSnapshot(snapshot: SupraSpaceCacheSnapshot): SupraSpaceCacheSnapshot {
  const conversations = snapshot.conversations.slice(0, MAX_CONVERSATIONS);
  const activeId = snapshot.activeConversationId || conversations[0]?._id || null;
  const conversationIds = conversations.map((conversation) => conversation._id);
  const rankedIds = [
    ...(activeId ? [activeId] : []),
    ...conversationIds,
  ].filter((id, index, list) => id && list.indexOf(id) === index).slice(0, MAX_MESSAGE_CONVERSATIONS);
  const messages = rankedIds.reduce<Record<string, SSMessage[]>>((acc, id) => {
    const existing = snapshot.messages[id] || [];
    if (existing.length) acc[id] = existing.slice(-MAX_MESSAGES_PER_CONVERSATION);
    return acc;
  }, {});
  const hasMore = Object.keys(messages).reduce<Record<string, boolean>>((acc, id) => {
    acc[id] = Boolean(snapshot.hasMore[id]);
    return acc;
  }, {});

  return {
    ...snapshot,
    activeConversationId: activeId,
    conversations,
    messages,
    hasMore,
    allUsers: snapshot.allUsers?.slice(0, 160),
    updatedAt: Date.now(),
  };
}

export async function readSupraSpaceCache(userId: string): Promise<SupraSpaceCacheSnapshot | null> {
  if (!userId) return null;
  try {
    const snapshot = await runStore<SupraSpaceCacheSnapshot | undefined>('readonly', (store) => store.get(userId));
    return snapshot || null;
  } catch {
    return null;
  }
}

export async function writeSupraSpaceCache(snapshot: SupraSpaceCacheSnapshot): Promise<void> {
  if (!snapshot.userId) return;
  try {
    const next = normalizeSnapshot(snapshot);
    await runStore<IDBValidKey>('readwrite', (store) => store.put(next, next.userId));
  } catch {
  }
}
