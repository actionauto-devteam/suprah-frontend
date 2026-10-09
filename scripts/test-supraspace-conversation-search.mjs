import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import typescript from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/supraspace-conversation-search.ts', import.meta.url), 'utf8');
const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 } }).outputText;
const loadedModule = { exports: {} };
vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports });
const search = loadedModule.exports;
const conversations = [
  { _id: 'a', name: 'Hiring Team', members: [{ fullName: 'Allia Perez', username: 'allia' }], lastMessageAt: '2026-10-08T10:00:00.000Z' },
  { _id: 'b', name: 'Operations', members: [{ fullName: 'Andy Curtis', username: 'andy' }], lastMessageAt: '2026-10-09T10:00:00.000Z' },
  { _id: 'a', name: 'Hiring Team', members: [], lastMessageAt: '2026-10-01T10:00:00.000Z' },
];
assert.equal(search.normalizeSupraSpaceConversationSearch('  ALLIA\u00A0 PEREZ  '), 'allia perez');
assert.deepEqual(Array.from(search.filterSupraSpaceConversations(conversations.slice(0, 2), conversation => conversation.name, '  allia   perez ').map(conversation => conversation._id)), ['a']);
assert.deepEqual(Array.from(search.recentSupraSpaceConversations(conversations).map(conversation => conversation._id)), ['b', 'a']);
console.log('SupraSpace conversation-search regression checks passed.');
