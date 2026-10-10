import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import typescript from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/supraspace-unread-boundary.ts', import.meta.url), 'utf8');
const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 } }).outputText;
const loadedModule = { exports: {} };
vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports });
const { findSupraSpaceUnreadBoundary } = loadedModule.exports;

const messages = [
  { _id: 'read', sender: { _id: 'other' }, readBy: ['viewer'] },
  { _id: 'first-unread', sender: { _id: 'other' }, readBy: [] },
  { _id: 'second-unread', sender: { _id: 'other' }, readBy: [] },
];

assert.equal(findSupraSpaceUnreadBoundary(messages, 'viewer', 2), 'first-unread');
assert.equal(findSupraSpaceUnreadBoundary(messages, 'viewer', 3), null);
assert.equal(findSupraSpaceUnreadBoundary(messages, 'viewer', 0), null);
assert.equal(findSupraSpaceUnreadBoundary([{ _id: 'own', sender: { _id: 'viewer' }, readBy: [] }], 'viewer', 1), null);
console.log('SupraSpace unread-boundary regression checks passed.');
