import type { SSMessage } from '@/hooks/useSupraSpaceSocket';

// Resolve the exact ID first: timestamps alone can omit the target when many
// messages share the same timestamp. Fetch context before publishing the window.
export async function loadSupraSpaceMessageTarget(
  get: (path: string, params?: Record<string, string | number>) => Promise<{ data: { data: unknown } }>,
  conversationId: string,
  messageId: string,
  existing: readonly SSMessage[] = [],
  isCurrent: () => boolean = () => true,
): Promise<{ messages: SSMessage[]; hasOlder: boolean }> {
  const base = `/api/supraspace/conversations/${conversationId}/messages`;
  const response = await get(`${base}/${messageId}`, { history: 'true' });
  const target = response.data.data as SSMessage;
  if (target?._id !== messageId || target.isDeleted || !isCurrent()) throw new Error('Message unavailable');
  const context = await get(base, { before: target.createdAt, beforeId: target._id, limit: 40 });
  const messages = [...context.data.data as SSMessage[], target];
  // Keep the timeline continuous after a distant jump. Otherwise merging just
  // two windows silently skips every message between the target and the cache.
  const compare = (a: SSMessage, b: SSMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a._id.localeCompare(b._id);
  let oldestBoundary = [...messages].sort(compare)[0];
  let hasOlder = messages.length === 41;
  const cached = [...existing].sort(compare);
  const boundary = cached[0] && compare(cached[0], target) < 0 ? cached[0] : target;
  let cursor = cached.at(-1);
  if (cursor && compare(cursor, target) < 0) cursor = target;
  while (!cursor || compare(cursor, boundary) > 0) {
    if (!isCurrent()) throw new Error('Navigation superseded');
    const response = await get(base, cursor
      ? { before: cursor.createdAt, beforeId: cursor._id, limit: 100 }
      : { limit: 100 });
    const page = response.data.data as SSMessage[];
    if (!page.length) break;
    messages.push(...page);
    const oldest = [...page].sort(compare)[0];
    if (compare(oldest, oldestBoundary) <= 0) {
      oldestBoundary = oldest;
      hasOlder = page.length === 100;
    }
    if (cursor && compare(oldest, cursor) >= 0) throw new Error('Invalid history cursor');
    cursor = oldest;
  }
  if (!isCurrent()) throw new Error('Navigation superseded');
  return { messages: Array.from(new Map(messages.map(message => [message._id, message])).values()).sort(compare), hasOlder };
}

// Hold the destination through delayed image/layout changes. A user gesture
// immediately releases it so the user can continue scrolling in either direction.
export function revealSupraSpaceMessage(target: HTMLElement, container: HTMLElement, query = ''): () => void {
  let stopped = false;
  let frame = 0;
  const ranges: Range[] = [];
  const needle = query.trim();
  if (needle) {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number }[] = [];
    let text = '';
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      nodes.push({ node, start: text.length });
      text += node.data;
    }
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const match of text.matchAll(new RegExp(escaped, 'gi'))) {
      const from = match.index;
      const first = nodes.find(entry => entry.start + entry.node.length > from);
      const last = nodes.find(entry => entry.start + entry.node.length >= from + needle.length);
      if (!first || !last) continue;
      const range = document.createRange();
      range.setStart(first.node, from - first.start);
      range.setEnd(last.node, from + needle.length - last.start);
      ranges.push(range);
    }
  }
  // CSS highlights leave React-owned text nodes untouched, including rich text.
  const highlight = typeof Highlight !== 'undefined' && ranges.length ? new Highlight(...ranges) : null;
  if (highlight && CSS.highlights) {
    if (!document.getElementById('ss4-search-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'ss4-search-highlight-style';
      style.textContent = '::highlight(ss4-search-match) { background: #fbbf24; color: #1c1917; }';
      document.head.append(style);
    }
    CSS.highlights.set('ss4-search-match', highlight);
  }
  const align = () => {
    if (stopped || !target.isConnected) return;
    const row = target.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    const match = ranges[0]?.getClientRects()[0];
    const destination = match || row;
    const inset = destination.height > container.clientHeight - 48 ? 24 : Math.max(24, (container.clientHeight - destination.height) / 2);
    container.scrollTo({ top: container.scrollTop + destination.top - viewport.top - container.clientTop - inset, behavior: 'instant' });
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(align);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(container);
  // Earlier rows can grow too, moving the destination without resizing it.
  for (const child of Array.from(container.children)) observer.observe(child);
  container.addEventListener('load', schedule, true);
  const animation = target.animate([
    { outline: '3px solid #fbbf24', outlineOffset: '-3px', backgroundColor: 'rgba(251,191,36,.22)' },
    { outline: '3px solid #fbbf24', outlineOffset: '-3px', backgroundColor: 'rgba(251,191,36,.22)', offset: .8 },
    { outline: '3px solid transparent', outlineOffset: '-3px', backgroundColor: 'transparent' },
  ], { duration: 4500, easing: 'ease-out' });
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    container.removeEventListener('load', schedule, true);
    for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) container.removeEventListener(event, stop);
    window.clearTimeout(timer);
    animation.cancel();
    if (highlight && CSS.highlights?.get('ss4-search-match') === highlight) CSS.highlights.delete('ss4-search-match');
  };
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) container.addEventListener(event, stop, { passive: true });
  const timer = window.setTimeout(stop, 4600);
  align();
  schedule();
  return stop;
}

export function supraSpaceSearchExcerpt(text: string, query: string): { text: string; match: boolean }[] {
  const needle = query.trim();
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = needle ? new RegExp(escaped, 'i').exec(text)?.index ?? -1 : -1;
  const from = start < 0 ? 0 : Math.max(0, start - 90);
  const to = Math.min(text.length, Math.max(from + 300, start + needle.length + 90));
  const excerpt = `${from ? '…' : ''}${text.slice(from, to)}${to < text.length ? '…' : ''}`;
  if (!needle) return [{ text: excerpt, match: false }];
  return excerpt.split(new RegExp(`(${escaped})`, 'gi')).map((part, index) => ({ text: part, match: index % 2 === 1 }));
}
