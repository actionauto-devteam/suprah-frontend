import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dispatch Chat, channels and the customer chat never scroll sideways: a long
// message (one long word, a link, a load number) wraps onto more lines inside
// the bubble on every screen size (2026-11-12).
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const read = (file) => fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\s+/g, ' ');

const CHAT_FILES = [
  'components/dispatch-chat/DispatchChatDialog.tsx',
  'components/dispatch-chat/ChatDetailsPanel.tsx',
  'components/dispatch-chat/NewDispatchMessageDialog.tsx',
  'components/dispatch-channels/ChannelConversation.tsx',
  'components/shipment-chat/ShipmentChatPanel.tsx',
];

test('message bubbles stay inside the chat width, so long text wraps', () => {
  for (const file of ['components/dispatch-chat/DispatchChatDialog.tsx', 'components/dispatch-channels/ChannelConversation.tsx']) {
    const source = read(file);
    assert.match(source, /min-w-28 max-w-full rounded-2xl rounded-br-md bg-emerald-600/, `${file}: own bubble`);
    assert.match(source, /min-w-28 max-w-full rounded-2xl rounded-bl-md/, `${file}: other person's bubble`);
    assert.match(source, /flex min-w-0 max-w-\[88%\]/, `${file}: bubble column`);
    assert.match(source, /whitespace-pre-wrap break-words \[overflow-wrap:anywhere\]">\s*\{message\.content\}/, `${file}: message text`);
  }
});

test('chat panels scroll up and down only, never sideways', () => {
  for (const file of CHAT_FILES) {
    const source = read(file);
    assert.doesNotMatch(source, /overflow-x-(auto|scroll)/, `${file}: sideways scrolling`);
    const panels = source.match(/className="min-h-0 flex-1[^"]*overflow-y-auto[^"]*"/g) ?? [];
    assert.ok(panels.length > 0, `${file}: no scrolling panel found`);
    for (const panel of panels) assert.match(panel, /overflow-x-hidden/, `${file}: ${panel}`);
  }
});
