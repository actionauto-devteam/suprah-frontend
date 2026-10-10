import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts from 'typescript';
const filename = fileURLToPath(new URL('../src/lib/recording-access.ts', import.meta.url));
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } });
const loaded = new Module(filename);
loaded._compile(compiled.outputText, filename);
const access = loaded.exports;
const staff = { id: 'same-id', kind: 'crm', name: 'Taylor Reed', email: 'taylor@example.com', role: 'employee', department: 'Service' };

test('approved presets contain exactly the existing permission keys', () => {
  assert.deepEqual(access.RECORDING_ACCESS_PRESETS.map(p => [p.level, [...p.permissions].sort()]), [
    ['Viewer', ['view']],
    ['QA/Reviewer', ['download', 'review', 'share', 'view']],
    ['Full Access', ['control', 'delete', 'download', 'review', 'share', 'view']],
  ]);
});
test('edit inference uses exact sets, not order, role or permission subsets', () => {
  for (const preset of access.RECORDING_ACCESS_PRESETS) assert.equal(access.recordingAccessLevel([...preset.permissions].reverse()), preset.level);
  assert.equal(access.recordingAccessLevel(['view', 'view']), 'Viewer');
  assert.equal(access.recordingAccessLevel(['control']), 'Custom');
  assert.equal(access.recordingAccessLevel(['view', 'review', 'download', 'share', 'control']), 'Custom');
  assert.equal(access.recordingAccessLevel(['view', 'download']), 'Custom');
  assert.equal(access.recordingAccessLevel([]), 'Custom');
});
test('grants are matched by identity kind and zero grants remain unauthorized', () => {
  const grants = [{ principalId: staff.id, principalKind: 'main', permissions: ['view'] }];
  assert.deepEqual(access.recordingPermissionsFor(staff, grants), []);
  assert.deepEqual(access.recordingPermissionsFor({ ...staff, kind: 'main' }, grants), ['view']);
  assert.deepEqual(access.recordingPermissionsFor(staff, [{ principalId: staff.id, principalKind: 'crm', permissions: [] }]), []);
});
test('search uses actual name, email, role and department', () => {
  for (const query of [' reed ', 'TAYLOR@', 'employee', 'service']) assert.equal(access.matchesRecordingStaff(staff, query), true);
  assert.equal(access.matchesRecordingStaff(staff, 'manager'), false);
  assert.equal(access.recordingStaffDescription(staff), 'Employee - Service');
  assert.equal(access.recordingStaffDescription({ ...staff, role: undefined, department: undefined }), '');
});
test('successful cache updates preserve policies and the other identity', () => {
  const data = { staff: [staff], permissions: ['view'], policies: [{ enabled: false }], grants: [{ principalId: staff.id, principalKind: 'main', permissions: ['view'] }] };
  const saved = access.updateRecordingGrant(data, staff, ['control', 'control']);
  assert.equal(saved.policies, data.policies);
  assert.deepEqual(saved.grants, [...data.grants, { principalId: staff.id, principalKind: 'crm', permissions: ['control'] }]);
  assert.equal(data.grants.length, 1);
  const removed = access.updateRecordingGrant(saved, staff, []);
  assert.deepEqual(access.recordingPermissionsFor(staff, removed.grants), []);
  assert.equal(removed.grants.length, 2);
});
test('summaries describe existing capabilities without invented annotation', () => {
  assert.equal(access.recordingAccessSummary(['control']), 'Pause / Resume recording');
  assert.equal(access.recordingAccessSummary(['view', 'download']), 'Listen to recordings, Download recordings');
  assert.equal(access.recordingAccessSummary([]), 'No recording access');
  assert.equal(access.RECORDING_PERMISSION_LABELS.review, 'Review recordings');
});
