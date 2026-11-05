import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do.
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  const requireLib = (specifier) => {
    if (specifier === '@/lib/api-client') return { apiClient: {} };
    return loadLib(specifier.replace(/^@\/lib\//, ''));
  };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, requireLib, cjs);
  return cjs.exports;
}

const {
  chatDayLabel,
  chatTime,
  chatZoneNote,
  checkChatPhotos,
  closesAtLine,
  customerChatAbout,
  customerChatMatches,
  customerChatPreview,
  mergeChatMessages,
  newestMessageAt,
  unreadLabel,
} = loadLib('shipment-chat');
const { eventIsFor } = loadLib('api/shipmentChat');
const { CUSTOMER_SEES_DRIVER_NOTICE } = loadLib('driver-privacy');

// Thursday, Nov 5, 2026, 10:00 AM in Mountain Time (MST, UTC-7).
const NOW = Date.parse('2026-11-05T17:00:00Z');

test('message times and days read in Mountain Time', () => {
  assert.equal(chatTime('2026-11-05T22:40:00Z'), '3:40 PM');
  assert.equal(chatTime('not a time'), '');
  assert.equal(chatDayLabel('2026-11-05T15:00:00Z', NOW), 'Today');
  // 11 PM on Nov 4 in Utah is already Nov 5 in UTC: still "Yesterday".
  assert.equal(chatDayLabel('2026-11-05T06:00:00Z', NOW), 'Yesterday');
  assert.equal(chatDayLabel('2026-11-02T18:00:00Z', NOW), 'Mon, Nov 2');
  assert.equal(chatDayLabel('2025-12-24T18:00:00Z', NOW), 'Wed, Dec 24, 2025');
  assert.equal(chatZoneNote(NOW), 'Times are in Mountain Time (MST).');
  assert.equal(chatZoneNote(Date.parse('2026-07-01T17:00:00Z')), 'Times are in Mountain Time (MDT).');
});

test('the driver chat says when it closes after delivery', () => {
  assert.equal(closesAtLine('2026-11-06T22:40:00Z'), 'This chat closes Fri, Nov 6 at 3:40 PM MST.');
  assert.equal(closesAtLine(null), '');
  assert.equal(closesAtLine('soon'), '');
});

test('new-message counts stay short', () => {
  assert.equal(unreadLabel(0), '');
  assert.equal(unreadLabel(undefined), '');
  assert.equal(unreadLabel(3), '3 new');
  assert.equal(unreadLabel(12), '9+ new');
});

test('photos are checked before sending, with what to fix', () => {
  const jpg = { name: 'front.jpg', type: 'image/jpeg', size: 2_000_000 };
  assert.deepEqual(checkChatPhotos([jpg]), { ok: true });
  assert.deepEqual(checkChatPhotos([{ name: 'papers.pdf', type: 'application/pdf', size: 10 }]), {
    ok: false,
    error: "papers.pdf isn't a photo we can send. Send photos as JPG, PNG or WebP.",
  });
  assert.deepEqual(checkChatPhotos([{ ...jpg, name: 'huge.jpg', size: 11 * 1024 * 1024 }]), {
    ok: false,
    error: 'huge.jpg is larger than 10 MB. Choose a smaller photo.',
  });
  assert.deepEqual(checkChatPhotos(Array.from({ length: 6 }, () => jpg)), { ok: false, error: 'You can send up to 5 photos at once.' });
});

test('a message that arrives live and from the send reply shows once, in order', () => {
  const a = { id: 'a', createdAt: '2026-11-05T17:00:00Z', content: 'Hi', seen: false };
  const b = { id: 'b', createdAt: '2026-11-05T17:05:00Z', content: 'On my way' };
  const merged = mergeChatMessages([b], [a, { ...a, seen: true }]);
  assert.deepEqual(merged.map((m) => m.id), ['a', 'b']);
  assert.equal(merged[0].seen, true);
  assert.equal(newestMessageAt(merged), '2026-11-05T17:05:00Z');
  assert.equal(newestMessageAt([]), null);
});

test('live updates are matched to the right chat', () => {
  const event = { threadId: 't', loadId: 'L1', quoteId: 'Q1', kind: 'driver' };
  assert.equal(eventIsFor({ side: 'customer', shipmentId: 'Q1', kind: 'driver' }, event), true);
  assert.equal(eventIsFor({ side: 'customer', shipmentId: 'Q1', kind: 'dispatcher' }, event), false);
  assert.equal(eventIsFor({ side: 'customer', shipmentId: 'Q2', kind: 'driver' }, event), false);
  assert.equal(eventIsFor({ side: 'load', loadId: 'L1' }, event), true);
  assert.equal(eventIsFor({ side: 'load', loadId: 'L2' }, event), false);
  assert.equal(eventIsFor({ side: 'load', loadId: 'L1' }, null), false);
});

test('drivers are told customers can message them, and until when', () => {
  assert.match(CUSTOMER_SEES_DRIVER_NOTICE, /message you in a private chat (under Customers in Messages, and on the load) from when you accept until 24 hours after delivery/);
  assert.match(CUSTOMER_SEES_DRIVER_NOTICE, /never see your phone number or email/);
});

test("Dispatch Chat's Customers section: what each row says and what search finds", () => {
  const chat = {
    customerName: 'Maria Lopez',
    vehicleName: '2021 Toyota Camry',
    loadNumber: 'L-1001',
    dealerName: 'Action Auto Utah',
    lastMessagePreview: 'Is it on the way?',
    lastMessageMine: false,
  };
  assert.equal(customerChatAbout(chat), '2021 Toyota Camry · Load L-1001 · Action Auto Utah');
  assert.equal(customerChatAbout(chat, false), '2021 Toyota Camry · Load L-1001');
  assert.equal(customerChatAbout({ vehicleName: '', loadNumber: '', dealerName: ' ' }), '');
  assert.equal(customerChatPreview(chat), 'Is it on the way?');
  assert.equal(customerChatPreview({ ...chat, lastMessageMine: true }), 'You: Is it on the way?');
  assert.equal(customerChatPreview({ lastMessagePreview: '  ', lastMessageMine: false }), 'No messages yet');
  for (const query of ['', 'maria', 'CAMRY', 'l-1001', 'on the way']) assert.equal(customerChatMatches(chat, query), true, query);
  assert.equal(customerChatMatches(chat, 'peterbilt'), false);
});
