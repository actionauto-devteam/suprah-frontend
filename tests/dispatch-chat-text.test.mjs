import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dispatch Chat (2026-11-16): names, file names, previews and search results
// wrap instead of being cut off with "…", no text is smaller than 11px, and the
// small unread counters keep their number centered.
const dir = fileURLToPath(new URL('../src/components/dispatch-chat/', import.meta.url));
const files = fs.readdirSync(dir).filter((file) => file.endsWith('.tsx'));

for (const name of files) {
  test(name + ' has readable, full text', () => {
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    assert.doesNotMatch(source, /\btruncate\b/);
    assert.doesNotMatch(source, /line-clamp-\d/);
    assert.doesNotMatch(source, /text-\[(?:[0-9]|10|10\.5)px\]/);
  });
}

test('unread counters keep their number inside the circle', () => {
  const badges = files
    .flatMap((name) => fs.readFileSync(path.join(dir, name), 'utf8').match(/"[^"\n]*rounded-full[^"\n]*text-\[11px\][^"\n]*"/g) ?? [])
    .filter((classes) => /\b(h-4|h-5|h-\[18px\])\b/.test(classes) && /justify-center/.test(classes));
  assert.ok(badges.length >= 5);
  for (const classes of badges) assert.match(classes, /leading-none/);
});
