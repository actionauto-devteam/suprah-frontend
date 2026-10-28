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

const { linkedLead, leadPageHref } = loadLib('quote-lead');

test("shows the linked lead's name", () => {
  assert.deepEqual(linkedLead({ _id: 'lead-1', firstName: ' Maria ', lastName: 'Santos' }), { id: 'lead-1', name: 'Maria Santos' });
});

test('still offers the lead when its name is missing', () => {
  assert.deepEqual(linkedLead({ _id: 'lead-2' }), { id: 'lead-2', name: 'View lead' });
  assert.deepEqual(linkedLead('lead-3'), { id: 'lead-3', name: 'View lead' });
});

test('unlinked quotes show nothing', () => {
  assert.equal(linkedLead(null), null);
  assert.equal(linkedLead(undefined), null);
});

test('opens the lead on the CRM leads page', () => {
  assert.equal(leadPageHref('64b0000000000000000000ab'), '/crm/leads?leadId=64b0000000000000000000ab');
});
