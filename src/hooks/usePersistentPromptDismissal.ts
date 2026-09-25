import * as React from 'react';

type Listener = () => void;

const listenersByKey = new Map<string, Set<Listener>>();

function notify(key: string) {
  listenersByKey.get(key)?.forEach((listener) => listener());
}

function readDismissal(key: string): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function getServerSnapshot(): null {
  return null;
}

export function usePersistentPromptDismissal(key: string) {
  const subscribe = React.useCallback((listener: Listener) => {
    const listeners = listenersByKey.get(key) ?? new Set<Listener>();
    listeners.add(listener);
    listenersByKey.set(key, listeners);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) listenersByKey.delete(key);
      window.removeEventListener('storage', onStorage);
    };
  }, [key]);
  const getSnapshot = React.useCallback(() => readDismissal(key), [key]);
  const isDismissed = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dismiss = React.useCallback(() => {
    try {
      window.localStorage.setItem(key, '1');
    } finally {
      notify(key);
    }
  }, [key]);

  return { isDismissed, dismiss };
}
