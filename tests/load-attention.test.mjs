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
  const requireLib = (specifier) => loadLib(specifier.replace(/^@\/lib\//, ''));
  new Function('exports', 'require', 'module', outputText)(cjs.exports, requireLib, cjs);
  return cjs.exports;
}

const {
  ATTENTION_KIND_ORDER,
  attentionHref,
  attentionKey,
  attentionKindLabel,
  attentionTitle,
  describeAttention,
  mountainTodayKey,
} = loadLib('load-attention');
const { quoteWaitingLabel } = loadLib('quote-age');

const NOW = Date.parse('2026-10-13T18:00:00Z');
const HOUR = 3_600_000;
const item = (overrides) => ({ loadId: 'L1', loadNumber: 'LD-1', status: 'Posted', ...overrides });

test('matches the server list of kinds, in order (when the backend sits next to this repo)', (t) => {
  let server;
  try {
    server = fs.readFileSync(
      fileURLToPath(new URL('../../suprah-backend/src/services/loadAttention.service.ts', import.meta.url)),
      'utf8',
    );
  } catch {
    t.skip('suprah-backend is not next to this repo');
    return;
  }
  const block = server.slice(server.indexOf('ATTENTION_KINDS = ['), server.indexOf('] as const'));
  const serverKinds = [...block.matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
  if (serverKinds.length) assert.deepEqual(ATTENTION_KIND_ORDER, serverKinds);
});

test('summary words are plain and pluralized', () => {
  assert.equal(attentionKindLabel('unassigned_pickup', 1), '1 load with no driver on pickup day');
  assert.equal(attentionKindLabel('release_request', 2), '2 release requests');
  assert.equal(attentionKindLabel('customer_request', 3), '3 customer shipping requests');
  for (const kind of ATTENTION_KIND_ORDER) assert.ok(attentionKindLabel(kind, 2).startsWith('2 '));
});

test('explains each new item in plain English', () => {
  assert.equal(
    describeAttention(item({ kind: 'unassigned_pickup', date: '2026-10-13' }), '2026-10-13', NOW),
    "Pickup is today and there's no driver yet",
  );
  assert.equal(
    describeAttention(item({ kind: 'unassigned_pickup', date: '2026-10-11' }), '2026-10-13', NOW),
    "Pickup was due Oct 11 and there's no driver yet",
  );
  assert.equal(
    describeAttention(item({ kind: 'not_accepted', driverName: 'Sam', since: new Date(NOW - 3 * HOUR).toISOString() }), '2026-10-13', NOW),
    "Sam hasn't accepted this load yet · assigned 3 h ago",
  );
  assert.equal(
    describeAttention(item({ kind: 'release_request', driverName: 'Sam', emergency: true }), '2026-10-13', NOW),
    'Sam asked to be released from this load (emergency)',
  );
  assert.equal(describeAttention(item({ kind: 'load_request', requestCount: 1 }), '2026-10-13', NOW), '1 driver is waiting for your answer');
  assert.equal(describeAttention(item({ kind: 'load_request', requestCount: 3 }), '2026-10-13', NOW), '3 drivers are waiting for your answer');
  assert.equal(
    describeAttention(item({ kind: 'customer_request', loadId: '', vehicleName: '2021 Toyota Camry' }), '2026-10-13', NOW),
    'Asked for shipping on 2021 Toyota Camry',
  );
});

test('rows open the place where the work is done', () => {
  assert.equal(attentionHref(item({ kind: 'proof_waiting' }), false), '/billing/driver-payouts/L1');
  assert.equal(attentionHref(item({ kind: 'proof_waiting' }), true), '/transportation/load/L1');
  assert.equal(attentionHref(item({ kind: 'release_request', driverId: 'd 1' }), false), '/driver-tracker?driverId=d%201');
  assert.equal(attentionHref(item({ kind: 'load_request' }), false), '/driver-tracker');
  assert.equal(attentionHref(item({ kind: 'customer_request', loadId: '' }), true), '/transportation?tab=drafts');
  assert.equal(attentionHref(item({ kind: 'unassigned_pickup' }), false), '/transportation/load/L1');
});

test('customer requests show the customer and have their own key', () => {
  const request = item({ kind: 'customer_request', loadId: '', loadNumber: '', quoteId: 'Q9', customerName: 'Maria Santos' });
  assert.equal(attentionTitle(request), 'Maria Santos');
  assert.equal(attentionKey(request), 'customer_request:Q9:');
  assert.equal(attentionTitle(item({ kind: 'late_pickup' })), 'LD-1');
});

test('today follows the Mountain Time calendar', () => {
  assert.equal(mountainTodayKey(new Date('2026-10-14T03:00:00Z')), '2026-10-13');
  assert.equal(mountainTodayKey(new Date('2026-10-14T07:00:00Z')), '2026-10-14');
});

test('pending quotes say how long they have waited', () => {
  assert.equal(quoteWaitingLabel('pending', new Date(NOW - 10 * 60_000).toISOString(), NOW), 'Waiting less than an hour');
  assert.equal(quoteWaitingLabel('pending', new Date(NOW - 5 * HOUR).toISOString(), NOW), 'Waiting 5 h');
  assert.equal(quoteWaitingLabel('pending', new Date(NOW - 25 * HOUR).toISOString(), NOW), 'Waiting 1 day');
  assert.equal(quoteWaitingLabel('Pending', new Date(NOW - 80 * HOUR).toISOString(), NOW), 'Waiting 3 days');
  assert.equal(quoteWaitingLabel('booked', new Date(NOW - 80 * HOUR).toISOString(), NOW), null);
  assert.equal(quoteWaitingLabel('pending', 'not a date', NOW), null);
});

test("vehicles removed from inventory point to the load or the Quotes tab", () => {
  const onLoad = item({ kind: "vehicle_removed", vehicleName: "2020 Honda Civic" });
  const onQuote = item({ kind: "vehicle_removed", loadId: "", loadNumber: "", quoteId: "Q2", customerName: "Maria Santos", vehicleName: "Camry" });
  assert.equal(describeAttention(onLoad, "2026-10-13", NOW), "2020 Honda Civic on this load was removed from inventory before pickup");
  assert.equal(describeAttention(onQuote, "2026-10-13", NOW), "Camry on this quote was removed from inventory");
  assert.equal(attentionHref(onLoad, false), "/transportation/load/L1");
  assert.equal(attentionHref(onQuote, false), "/transportation?tab=drafts");
  assert.equal(attentionTitle(onQuote), "Maria Santos");
  assert.equal(attentionKindLabel("vehicle_removed", 1), "1 vehicle removed from inventory");
});
