import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Batch D (2026-11-18): pop-ups, dialogs and side panels in Transportation,
// Inventory, Dispatch Chat, the Driver Portal and the customer quote and chat
// windows: no text under 11px, no "…" cut-offs, nothing that scrolls sideways.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const FILES = [
  'components/TransportationSidebar.tsx',
  'components/QuoteResultModal.tsx',
  'components/EditQuoteModal.tsx',
  'components/QuoteLoadRouteCompletionDialog.tsx',
  'components/reports/transportation/TransportationPreviewModal.tsx',
  'components/VehiclePriceHistoryDialog.tsx',
  'components/shipping-quote-modal.tsx',
  'components/vehicle-inquiry-modal.tsx',
  'components/shipment-chat/CustomerChatPane.tsx',
  'components/shipment-chat/ShipmentChatPanel.tsx',
  'components/suprah-mail/DispatchChatInlinePane.tsx',
  'components/suprah-mail/DispatchChatTab.tsx',
  'components/driver-sidebar.tsx',
];

test('no text under 11px, in classes or set in code', () => {
  for (const file of FILES) {
    const src = read(file);
    assert.doesNotMatch(src, /text-\[(?:7|8|9|9\.5|10|10\.5)px\]/, file);
    assert.doesNotMatch(src, /fontSize:\s*['"]?(?:7|8|9|10)(?:px)?['"]?\s*[,}]/, file);
    assert.doesNotMatch(src, /font-size:\s*(?:7|8|9|10)(?:\.\d+)?px/, file);
  }
});

test('text wraps instead of ending in "…"', () => {
  for (const file of FILES) {
    let src = read(file);
    // The sidebar's menu button keeps its own short fixed labels on one line.
    if (file === 'components/driver-sidebar.tsx') {
      src = src.split('<span className="min-w-0 flex-1 truncate">{item.title}</span>').join('');
    }
    assert.doesNotMatch(src, /["'`\s]truncate["'`\s]/, file);
    assert.doesNotMatch(src, /line-clamp-\d/, file);
  }
});

test('nothing scrolls sideways', () => {
  for (const file of FILES) assert.doesNotMatch(read(file), /overflow-x-(?:auto|scroll)/, file);
  assert.match(read('components/suprah-mail/DispatchChatTab.tsx'), /<div className="flex flex-wrap items-center gap-1 pb-0\.5">/);
});

test('report previews: one card per row on phones and tablets, a fitted table on computers', () => {
  const src = read('components/reports/transportation/TransportationPreviewModal.tsx');
  assert.equal(src.split('<ul className="divide-y divide-border lg:hidden">').length - 1, 2);
  assert.equal(src.split('<div className="hidden lg:block">').length - 1, 2);
  assert.equal(
    src.split('<Table className="table-fixed [&_td]:whitespace-normal [&_td]:break-words [&_th]:whitespace-normal">').length - 1,
    2,
  );
  // Each table's column widths add up to the full width.
  const loads = src.slice(src.indexOf('function LoadPreview('), src.indexOf('function QuotePreview('));
  const quotes = src.slice(src.indexOf('function QuotePreview('), src.indexOf('export function TransportationPreviewModal('));
  for (const [name, part] of [['loads', loads], ['quotes', quotes]]) {
    const widths = [...part.matchAll(/<TableHead className="[^"]*\bw-\[(\d+)%\]/g)].map((m) => Number(m[1]));
    assert.equal(widths.length, 10, name);
    assert.equal(widths.reduce((a, b) => a + b, 0), 100, name);
  }
  assert.match(src, /<PreviewField label="VIN">/);
  // Status badges on the cards may wrap too.
  assert.match(src, /className=\{`h-auto whitespace-normal text-\[11px\] font-medium \$\{statusBadgeClass\(l\.status\)\}`\}/);
  assert.match(src, /className=\{`h-auto whitespace-normal text-\[11px\] font-medium capitalize \$\{quoteStatusBadgeClass\(q\.status\)\}`\}/);
});

test('the driver sidebar: readable labels, and the account button grows for a long name or email', () => {
  const src = read('components/driver-sidebar.tsx');
  assert.match(src, /\.dsb-section-label \{[^}]*font-size: 11px;/);
  assert.match(src, /\.dsb-telemetry \{[^}]*font-size: 11px;/);
  assert.match(src, /className="dsb-hud-card h-auto min-h-12 w-full rounded-lg/);
});

test('the quote form shows the chosen car in full, and the Bill of Lading footer is 11px on screen', () => {
  assert.match(read('components/shipping-quote-modal.tsx'), /\{selectedVehicle\.year\} \{selectedVehicle\.make\} \{selectedVehicle\.model\}/);
  const bol = read('lib/transportation-reports.ts');
  const screen = bol.slice(bol.indexOf('@media screen {'), bol.indexOf('@media print {'));
  assert.match(screen, /\.footer \{[^}]*font-size: 8\.25pt;/);
});
