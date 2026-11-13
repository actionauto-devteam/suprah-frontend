import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Suprah Meet's meeting alerts (2026-11-13): only staff get them; customers and
// drivers no longer see the toast. Suprah Meet's own files are unchanged.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const { isStaffRole } = load(path.join(SRC, 'lib/staff-only'));

test('only dealership staff and super admins count as staff', () => {
  for (const role of ['employee', 'admin', 'super_admin']) assert.equal(isStaffRole(role), true, role);
  for (const role of ['customer', 'driver', '', null, undefined, 'Admin']) assert.equal(isStaffRole(role), false, String(role));
});

test('the staff layout mounts the meeting alerts only for staff', () => {
  const layout = fs.readFileSync(path.join(SRC, 'app/(dashboard)/layout.tsx'), 'utf8');
  assert.match(layout, /<StaffOnly>\s*<MeetAlerts \/>\s*<\/StaffOnly>/);
  assert.equal((layout.match(/<MeetAlerts \/>/g) ?? []).length, 1);
  const gate = fs.readFileSync(path.join(SRC, 'components/auth/StaffOnly.tsx'), 'utf8');
  assert.match(gate, /if \(!isStaffRole\(user\?\.role\)\) return null;/);
});
