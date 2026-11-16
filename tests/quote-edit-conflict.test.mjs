import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Quote edits and answers when several staff work at once (2026-11-16).
const read = (rel) => fs.readFileSync(fileURLToPath(new URL('../src/' + rel, import.meta.url)), 'utf8');

test('the Edit Quote window starts from the latest quote each time it opens', () => {
  assert.match(read('components/QuoteCard.tsx'), /\{isEditModalOpen && \(\s+<EditQuoteModal/);
  assert.match(read('components/transportation/TransportationMobileQuoteCard.tsx'), /\{editOpen && \(<EditQuoteModal/);
});

test('a save carries the version that was opened and shows why it failed', () => {
  const modal = read('components/EditQuoteModal.tsx');
  assert.match(modal, /const \[openedVersion\] = useState\(quote\.updatedAt\)/);
  assert.match(modal, /\.\.\.\(openedVersion \? \{ expectedUpdatedAt: openedVersion \} : \{\}\)/);
  assert.match(modal, /role="alert"/);
  assert.doesNotMatch(modal, /console\.error\('Error saving quote:'/);
});

test('accept and decline send the status the card showed, and refresh the card when refused', () => {
  assert.match(read('components/transportation/CustomerRequestActions.tsx'), /mode === "decline" \? trimmed : undefined, quote\.status\)/);
  const hook = read('hooks/useTransportationData.ts');
  assert.match(hook, /\.\.\.\(expectedStatus \? \{ expectedStatus \} : \{\}\)/);
  assert.match(hook, /\/\/ Someone else may have answered it: show the card as it is now\.\s+void refreshQuoteSnapshot\(\);/);
});
