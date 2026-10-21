import type { TranscriptEvent } from 'amazon-chime-sdk-js';

export type CaptionStatus = 'off' | 'starting' | 'on' | 'stopping' | 'interrupted' | 'failed';
export interface CaptionLine {
  id: string;
  resultId: string;
  speakerId: string;
  attendeeId: string;
  text: string;
  partial: boolean;
  updatedAt: number;
  startTimeMs: number;
}

export function updateCaptionLines(previous: CaptionLine[], event: TranscriptEvent, now: number): CaptionLine[] {
  if (!('results' in event)) return previous;
  let next = previous;
  for (const result of event.results) {
    if (!result.resultId || next.some((line) => line.resultId === result.resultId && !line.partial)) continue;
    const alternative = result.alternatives?.[0];
    if (!alternative?.transcript?.trim()) continue;
    const groups: { speakerId: string; attendeeId: string; words: string[] }[] = [];
    for (const item of alternative.items ?? []) {
      const attendeeId = item.attendee?.attendeeId || groups.at(-1)?.attendeeId || '';
      const externalId = item.attendee?.externalUserId || '';
      const speakerId = externalId.split('#')[0]
        || (groups.at(-1)?.attendeeId === attendeeId ? groups.at(-1)?.speakerId : '') || '';
      let group = groups.at(-1);
      if (!group || group.attendeeId !== attendeeId) {
        group = { speakerId, attendeeId, words: [] };
        groups.push(group);
      }
      group.words.push(item.content || '');
    }
    if (!groups.length) groups.push({ speakerId: '', attendeeId: '', words: [] });
    const lines = groups.map((group, index): CaptionLine => ({
      id: `${result.resultId}:${index}`, resultId: result.resultId,
      speakerId: group.speakerId, attendeeId: group.attendeeId,
      text: groups.length === 1 ? alternative.transcript.trim()
        : group.words.join(' ').replace(/\s+([,.!?;:])/g, '$1').trim(),
      partial: result.isPartial, updatedAt: now, startTimeMs: result.startTimeMs,
    })).filter((line) => line.text);
    next = [...next.filter((line) => line.resultId !== result.resultId), ...lines];
  }
  return [...next].sort((a, b) => a.startTimeMs - b.startTimeMs).slice(-20);
}
