import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Readable text on these screens (2026-11-14): nothing smaller than 11px, like
// the rest of Transportation, Driver Tracker and the Driver Portal.
const FILES = [
  'components/LoadCard.tsx',
  'components/QuoteCard.tsx',
  'components/dispatch-channels/ChannelConversation.tsx',
  'components/dispatch-channels/ChannelList.tsx',
  'components/dispatch-channels/ChannelMembersSheet.tsx',
  'app/(customer)/customer/shop/page.tsx',
  'components/dispatch-channels/channel-people.tsx',
  'components/dispatch-channels/DriverChannelsSidebarItem.tsx',
  'components/dispatch-channels/CreateChannelDialog.tsx',
  'app/(driver)/driver/channels/page.tsx',
];

for (const rel of FILES) {
  test(`${rel} has no text smaller than 11px`, () => {
    const source = fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');
    assert.doesNotMatch(source, /text-\[(?:[1-9]|10)(?:\.\d+)?px\]/);
    assert.doesNotMatch(source, /text-\[11px\] (?:xs|sm|md|lg):text-\[11px\]/);
  });
}
