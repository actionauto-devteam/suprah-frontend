import type { SSMessage } from '@/hooks/useSupraSpaceSocket';

export function mergeMessages(current: SSMessage[], incoming: SSMessage[]): SSMessage[] {
  const byId = new Map(current.map(message => [message._id, message]));
  incoming.forEach(message => {
    byId.delete(`optimistic-${message._id}`);
    byId.set(message._id, message);
  });
  return [...byId.values()].sort((a, b) => {
    const time = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return time || a._id.localeCompare(b._id);
  });
}

export function reconcileMessage(current: SSMessage[], message: SSMessage): SSMessage[] {
  if (current.some(item => item._id === message._id)) return current;
  return mergeMessages(current.filter(item => item._id !== `optimistic-${message._id}`), [message]);
}
