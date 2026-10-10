import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function config(env) {
  const sandbox = { exports: {}, process: { env: { ...env } }, URL, require: name => {
    if (name === '@serwist/next') return { default: () => value => value };
    throw new Error(`Unexpected import ${name}`);
  } };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports.default;
}

test('production builds require an explicit non-loopback HTTPS API', async () => {
  for (const value of [undefined, '', 'http://localhost:5000', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://demo.localhost', 'https://user:secret@example.com']) {
    assert.throws(() => config({ NODE_ENV: 'production', NEXT_PUBLIC_API_URL: value }), /Production builds require/);
  }
  const value = config({ NODE_ENV: 'production', NEXT_PUBLIC_API_URL: 'https://release-audit.example.invalid' });
  assert.equal((await value.rewrites()).fallback[0].destination, 'https://release-audit.example.invalid/api/:path*');
});

test('development keeps its existing local proxy fallback', async () => {
  const value = config({ NODE_ENV: 'development' });
  assert.equal((await value.rewrites()).fallback[0].destination, 'http://localhost:5000/api/:path*');
});
