import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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
  needsReplyBannerLabel,
  needsReplyCountLabel,
  needsReplyHint,
  needsReplyTime,
  waitingLabel,
} = loadLib('needsReply');

const NOW = Date.parse('2026-11-18T19:00:00Z');
const ago = (minutes) => new Date(NOW - minutes * 60000).toISOString();

test('reads the waiting time only when the lead is really waiting', () => {
  assert.equal(needsReplyTime(null), 0);
  assert.equal(needsReplyTime(undefined), 0);
  assert.equal(needsReplyTime(''), 0);
  assert.equal(needsReplyTime('not a date'), 0);
  assert.equal(needsReplyTime(ago(5)), NOW - 5 * 60000);
});

test('shows a short waiting time on the chip', () => {
  assert.equal(waitingLabel(null, NOW), '');
  assert.equal(waitingLabel(ago(0), NOW), 'now');
  assert.equal(waitingLabel(ago(0.5), NOW), 'now');
  assert.equal(waitingLabel(ago(1), NOW), '1m');
  assert.equal(waitingLabel(ago(59), NOW), '59m');
  assert.equal(waitingLabel(ago(60), NOW), '1h');
  assert.equal(waitingLabel(ago(23 * 60 + 59), NOW), '23h');
  assert.equal(waitingLabel(ago(24 * 60), NOW), '1d');
  assert.equal(waitingLabel(ago(5 * 24 * 60), NOW), '5d');
});

test('never shows a negative time when the clocks differ', () => {
  assert.equal(waitingLabel(new Date(NOW + 90000).toISOString(), NOW), 'now');
});

test('explains the wait in full words inside the open lead', () => {
  assert.equal(needsReplyBannerLabel(null, NOW), '');
  assert.equal(needsReplyBannerLabel(ago(0), NOW), 'The customer just wrote and has no answer yet.');
  assert.equal(needsReplyBannerLabel(ago(1), NOW), 'The customer has been waiting 1 minute for an answer.');
  assert.equal(needsReplyBannerLabel(ago(12), NOW), 'The customer has been waiting 12 minutes for an answer.');
  assert.equal(needsReplyBannerLabel(ago(60), NOW), 'The customer has been waiting 1 hour for an answer.');
  assert.equal(needsReplyBannerLabel(ago(3 * 60), NOW), 'The customer has been waiting 3 hours for an answer.');
  assert.equal(needsReplyBannerLabel(ago(24 * 60), NOW), 'The customer has been waiting 1 day for an answer.');
  assert.equal(needsReplyBannerLabel(ago(3 * 24 * 60), NOW), 'The customer has been waiting 3 days for an answer.');
});

test('says since when, in Mountain time', () => {
  assert.equal(needsReplyHint(null), '');
  assert.equal(
    needsReplyHint('2026-11-18T12:12:00Z'),
    "The customer's last message has no answer yet. Waiting since Nov 18, 5:12 AM MST.",
  );
  assert.equal(
    needsReplyHint('2026-07-04T18:30:00Z'),
    "The customer's last message has no answer yet. Waiting since Jul 4, 12:30 PM MDT.",
  );
});

test('counts the customers waiting for the person looking', () => {
  assert.equal(needsReplyCountLabel(0), '');
  assert.equal(needsReplyCountLabel(-2), '');
  assert.equal(needsReplyCountLabel(1), '1 customer needs your reply');
  assert.equal(needsReplyCountLabel(2), '2 customers need your reply');
  assert.equal(needsReplyCountLabel(99), '99 customers need your reply');
  assert.equal(needsReplyCountLabel(250), '99+ customers need your reply');
});
