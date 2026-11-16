import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Create Load (2026-11-16): no label smaller than 11px and nothing cut off with "…".
const dir = fileURLToPath(new URL('../src/components/create-load/', import.meta.url));

for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.tsx'))) {
  test(name + ' has readable, full text', () => {
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    assert.doesNotMatch(source, /text-\[(?:[0-9]|10|10\.5)px\]/);
    assert.doesNotMatch(source, /\btruncate\b/);
    assert.doesNotMatch(source, /line-clamp-\d/);
  });
}
