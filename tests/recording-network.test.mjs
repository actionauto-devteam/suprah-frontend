import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const filename = fileURLToPath(new URL('../src/lib/recording-network.ts', import.meta.url));
const loaded = new Module(filename);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
test('recording metadata, media, grants, shares and active-call APIs bypass caches on either origin', () => {
  for (const host of ['http://localhost:3000', 'http://localhost:5000']) {
    for (const path of ['/recordings/id', '/recordings/media/id', '/recording-settings', '/recording-grants', '/recording-shares/id', '/calls/id/recording', '/calls/id/recording/control']) {
      assert.equal(loaded.exports.isRecordingApiUrl(new URL(`/api/crm/communications${path}`, host)), true);
    }
  }
});
test('normal static files and unrelated calling APIs are unchanged', () => {
  for (const path of ['/icons/icon.png', '/fixture.js', '/crm/settings', '/api/crm/communications/calls/ringing', '/api/crm/communications/calls/id/claim']) {
    assert.equal(loaded.exports.isRecordingApiUrl(new URL(path, 'http://localhost:3000')), false);
  }
});
