import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const filename = fileURLToPath(new URL('../src/lib/meet-schedule.ts', import.meta.url));
const loaded = new Module(filename);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { extractMeetCode, formatMeetDateTime, isTodaysMeetSchedule, meetCalendarDay } = loaded.exports;
test('Up next only includes today in Mountain time, independent of viewer timezone', () => {
  const now = Date.parse('2026-10-30T23:00:00Z');
  assert.equal(isTodaysMeetSchedule('2026-10-31T02:00:00Z', now), true);
  assert.equal(isTodaysMeetSchedule('2026-10-31T16:00:00Z', now), false);
  assert.equal(isTodaysMeetSchedule(null, now), false);
});
test('Mountain midnight removes yesterday even inside the missed-meeting grace period', () => {
  const now = Date.parse('2026-10-31T06:01:00Z');
  assert.equal(isTodaysMeetSchedule('2026-10-31T05:59:00Z', now), false);
  assert.equal(isTodaysMeetSchedule('2026-10-31T15:00:00Z', now), true);
});
test('a missed schedule moves out of Up next after fifteen minutes', () => {
  const now = Date.parse('2026-10-30T18:00:00Z');
  assert.equal(isTodaysMeetSchedule('2026-10-30T17:45:00Z', now), true);
  assert.equal(isTodaysMeetSchedule('2026-10-30T17:44:59Z', now), false);
});
test('calendar boundaries follow the switch from daylight to standard Mountain time', () => {
  assert.equal(meetCalendarDay('2026-11-01T06:30:00Z'), '2026-11-01');
  assert.equal(meetCalendarDay('2026-11-02T06:30:00Z'), '2026-11-01');
  assert.equal(meetCalendarDay('2026-11-02T07:00:00Z'), '2026-11-02');
});

test('Paste accepts meeting codes, signed-in and guest links, and invite text', () => {
  for (const value of ['meet-1234', ' 1234 ', 'https://suprah.example/meet/MEET-1234',
    'https://suprah.example/crm/suprah-meet/room/MEET-1234?from=invite',
    'Join our meeting: https://suprah.example/meet/MEET%2D1234']) {
    assert.equal(extractMeetCode(value), 'MEET-1234');
  }
});
test('Paste rejects unrelated or malformed clipboard contents', () => {
  for (const value of ['', 'https://unrelated.example/', 'MEET-12345', 'MEET-1234evil', 'notameet-1234', 'MEET-abcd']) {
    assert.equal(extractMeetCode(value), null);
  }
});

test('displayed schedules and shared invites use the date Mountain abbreviation across daylight saving', () => {
  assert.match(formatMeetDateTime('2026-10-30T17:00:00Z'), /11:00 AM MDT$/);
  assert.match(formatMeetDateTime('2026-11-02T18:00:00Z'), /11:00 AM MST$/);
});
