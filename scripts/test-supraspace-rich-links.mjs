import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import typescript from 'typescript';

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, {
    URL,
    module: loadedModule,
    exports: loadedModule.exports,
    require: specifier => dependencies[specifier],
  });
  return loadedModule.exports;
}

const links = loadTypeScriptModule('../src/lib/supra-space-links.ts');
const formatting = loadTypeScriptModule('../src/lib/supra-space-message-formatting.ts', {
  './supra-space-links': links,
});

const meetUrl = 'https://meet.google.com/esg-zidk-mhv';
const legacyMeet = links.findSupraSpaceMarkdownLink(`[https://](${meetUrl})`);
assert.equal(legacyMeet?.start, 0);
assert.equal(legacyMeet?.end, `[https://](${meetUrl})`.length);
assert.equal(legacyMeet?.label, meetUrl);
assert.equal(legacyMeet?.href, meetUrl);

const labeled = links.findSupraSpaceMarkdownLink('[Join the interview](https://example.com/schedule?candidate=1#today)');
assert.equal(labeled?.label, 'Join the interview');
assert.equal(labeled?.href, 'https://example.com/schedule?candidate=1#today');

const nested = links.findSupraSpaceMarkdownLink('[Reference](https://example.com/a_(b)?q=(c))');
assert.equal(nested?.href, 'https://example.com/a_(b)?q=(c)');

const multiple = links.supraSpaceMarkdownToEditorInlineHtml(
  `[Meet](${meetUrl}) and [Schedule](https://example.com/interviews?day=1).`,
);
assert.match(multiple, new RegExp(`href=\"${meetUrl}\"`));
assert.match(multiple, /href="https:\/\/example\.com\/interviews\?day=1"/);
assert.doesNotMatch(multiple, /\]\(https?:\/\//);

assert.equal(links.findSupraSpaceMarkdownLink('[Unsafe](javascript:alert(1))'), null);
assert.equal(links.isSafeSupraSpaceLinkHref('https://example.com'), true);
assert.equal(links.isSafeSupraSpaceLinkHref('https://'), false);
assert.equal(links.isSafeSupraSpaceLinkHref('javascript:alert(1)'), false);

assert.equal(formatting.normalizeSupraSpaceBoldMarkerRuns('****Applicant****'), '**Applicant**');
assert.equal(formatting.normalizeSupraSpaceBoldMarkerRuns('****'), '****');

console.log('SupraSpace rich-link and bold-marker regression checks passed.');
