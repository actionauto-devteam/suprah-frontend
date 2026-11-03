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
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { dealershipChatTitle } = loadLib('api/customerDealershipChat');

test("names the dealership's AI Agent, or the dealership when it has none", () => {
  assert.equal(dealershipChatTitle({ agentName: 'Anna', dealerName: 'Action Auto Utah' }), 'Chat with Anna');
  assert.equal(dealershipChatTitle({ dealerName: 'Action Auto Utah' }), 'Chat with Action Auto Utah');
  assert.equal(dealershipChatTitle({ agentName: '  ' }), 'Chat with your dealership');
});
