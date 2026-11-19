import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/components/supraspace/ChatPopupManager.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('popup.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
const visit = node => {
  if (ts.isVariableDeclaration(node) && ['visibleMessages', 'prevVisible', 'nextVisible'].includes(node.name.getText(ast))) {
    declarations.set(node.name.getText(ast), node.initializer.getText(ast));
  }
  ts.forEachChild(node, visit);
};
visit(ast);
const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test('Mini chat keeps deleted and system-message grouping correct with linear history access', () => {
  let reads = 0;
  const track = rows => new Proxy(rows, { get(target, key, receiver) {
    if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
    return Reflect.get(target, key, receiver);
  } });
  const rows = Array.from({ length: 3000 }, (_, index) => ({
    _id: String(index), type: index % 11 === 0 ? 'system' : 'text', isDeleted: index % 7 === 0,
  }));
  assert.ok(declarations.get('visibleMessages'));
  const visible = new Function('messages', 'React', compile(`return ${declarations.get('visibleMessages')};`))(
    track(rows), { useMemo: callback => callback() },
  );
  const neighbors = new Function('visibleMessages', 'messages', 'idx', compile(`
    const previous = ${declarations.get('prevVisible')};
    const next = ${declarations.get('nextVisible')};
    return [previous?._id ?? null, next?._id ?? null];
  `));
  const trackedVisible = track(visible);
  visible.forEach((message, index) => {
    assert.equal(message.isDeleted, false);
    assert.deepEqual(neighbors(trackedVisible, track(rows), index), [
      visible[index - 1]?._id ?? null, visible[index + 1]?._id ?? null,
    ]);
  });
  assert.ok(reads <= rows.length * 3, `${reads} history reads for ${rows.length} messages`);
});
