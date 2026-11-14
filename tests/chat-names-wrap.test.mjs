import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Dispatch Chat (2026-11-14): channel names, people's names, descriptions and
// message previews wrap onto more lines instead of being cut off.
const FILES = [
  'components/dispatch-channels/ChannelConversation.tsx',
  'components/dispatch-channels/ChannelList.tsx',
  'components/dispatch-channels/ChannelMembersSheet.tsx',
  'components/dispatch-channels/CreateChannelDialog.tsx',
  'components/dispatch-channels/DriverChannelsSidebarItem.tsx',
  'app/(driver)/driver/channels/page.tsx',
];

for (const rel of FILES) {
  test(`${rel} wraps names instead of cutting them off`, () => {
    const source = fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');
    assert.doesNotMatch(source, /["'`\s]truncate["'`\s]/);
    assert.doesNotMatch(source, /line-clamp-\d|text-ellipsis/);
  });
}

test('people chips in New channel use the width they need', () => {
  const dialog = fs.readFileSync(fileURLToPath(new URL('../src/components/dispatch-channels/CreateChannelDialog.tsx', import.meta.url)), 'utf8');
  assert.doesNotMatch(dialog, /max-w-40/);
  assert.match(dialog, /<span className="min-w-0 break-words \[overflow-wrap:anywhere\]">\{person\.name\}<\/span>/);
});
