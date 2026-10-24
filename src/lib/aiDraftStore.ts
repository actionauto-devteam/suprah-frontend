import { useSyncExternalStore } from "react";
import type { AiDraftFailure } from "./api/aiAgentDraft";

export interface AiDraftSlot {
  inFlight?: boolean;
  pending?: string;
  note?: string;
  failure?: AiDraftFailure;
  drafted?: boolean;
}

interface ActiveComposer {
  key: string | null;
  text: () => string;
  insert: (draft: string) => void;
}

const EMPTY: AiDraftSlot = {};
const slots = new Map<string, AiDraftSlot>();
const listeners = new Set<() => void>();
let version = 0;
let activeComposer: ActiveComposer | null = null;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => version;

export function readAiDraft(key: string | null): AiDraftSlot {
  return (key && slots.get(key)) || EMPTY;
}

export function updateAiDraft(key: string, patch: Partial<AiDraftSlot>) {
  const next: AiDraftSlot = { ...slots.get(key), ...patch };
  for (const field of Object.keys(next) as Array<keyof AiDraftSlot>) {
    if (next[field] === undefined || next[field] === false) delete next[field];
  }
  if (Object.keys(next).length) slots.set(key, next);
  else slots.delete(key);
  emit();
}

export function useAiDraftSlot(key: string | null): AiDraftSlot {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  return readAiDraft(key);
}

export function registerAiComposer(composer: ActiveComposer): () => void {
  activeComposer = composer;
  return () => {
    if (activeComposer === composer) activeComposer = null;
  };
}

export function insertIntoOpenComposer(key: string, baseline: string, draft: string): boolean {
  const composer = activeComposer;
  if (!composer || composer.key !== key) return false;
  const current = composer.text();
  if (current !== baseline || current.trim()) return false;
  composer.insert(draft);
  return true;
}
