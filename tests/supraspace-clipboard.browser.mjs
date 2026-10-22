import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href
  : 'playwright');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const file of ['../src/app/(chat)/supraspace/page.tsx', '../src/components/supraspace/ChatPopupManager.tsx']) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const helper = ast.statements.find(node => ts.isFunctionDeclaration(node)
      && node.name?.text === 'normalizeRichClipboardBoldArtifacts');
    assert.ok(helper, file);
    const compiled = ts.transpileModule(helper.getText(ast), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText;
    await page.addScriptTag({ content: compiled });
    const results = await page.evaluate(() => {
      const normalize = window.normalizeRichClipboardBoldArtifacts;
      const root = document.createElement('div');
      root.innerHTML = normalize('<div style="color:red"><b>**Email: person@example.test**</b></div><div>**Temporary password: Sample123**</div>');
      const formatted = { text: root.textContent, bold: [...root.querySelectorAll('strong')].map(node => node.textContent) };
      const literals = '<p>employee_name_ and 2 * 3 and **unfinished</p><pre>**code**</pre><code>**inline code**</code>';
      return { formatted, literals: normalize(literals), idempotent: normalize(root.innerHTML) === root.innerHTML };
    });
    assert.equal(results.formatted.text, 'Email: person@example.testTemporary password: Sample123');
    assert.deepEqual(results.formatted.bold, ['Email: person@example.test', 'Temporary password: Sample123']);
    assert.equal(results.literals, '<p>employee_name_ and 2 * 3 and **unfinished</p><pre>**code**</pre><code>**inline code**</code>');
    assert.equal(results.idempotent, true);
    // Exercise the native text-only insertion command used by both editors.
    await page.setContent('<div contenteditable="true" id="editor"></div>');
    const pasted = await page.evaluate(() => {
      const editor = document.querySelector('#editor');
      editor.focus();
      document.execCommand('insertText', false, 'Candidate Name\nSecond Name');
      return { text: editor.innerText, styled: !!editor.querySelector('span,b,strong,font,[style]') };
    });
    assert.equal(pasted.text, 'Candidate Name\nSecond Name');
    assert.equal(pasted.styled, false);
    const handlers = [];
    const visit = node => {
      if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onPaste'
        && node.initializer && ts.isJsxExpression(node.initializer)) {
        handlers.push(node.initializer.expression.getText(ast));
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.equal(handlers.length, 2, 'cover both editing and composing');
    for (const handler of handlers) {
      const compiledHandler = ts.transpileModule(`const handle = ${handler}`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText;
      const actual = await page.evaluate(code => {
        const editor = document.querySelector('#editor');
        editor.innerHTML = '';
        editor.focus();
        const bindings = {
          pasteMode: 'plain', editPasteMode: 'plain',
          pastePlainTextShortcutRef: { current: false }, editPastePlainTextShortcutRef: { current: false },
          pastedPlainTextRef: { current: '' }, textareaRef: { current: editor },
          clipboardAttachmentFiles: () => [], clipboardImageFiles: () => [],
          getSS4PastedMediaReference: () => null,
          clipboardPayloadToPlainText: text => text,
          clipboardPayloadToRichEditorHtml: () => { throw new Error('Text-only paste must skip rich HTML parsing'); },
          getContentEditableSelectionLength: () => 0,
          SS4_MAX_MESSAGE_CHARS: 20000,
          clampSupraSpaceMessageText: (text, remaining) => text.slice(0, remaining),
          setMentionQuery: () => {}, setMentionAnchor: () => {}, requestAnimationFrame: () => {},
        };
        const run = new Function(...Object.keys(bindings), `${code}; return handle;`)(...Object.values(bindings));
        let prevented = false;
        run({
          clipboardData: { getData: type => type === 'text/plain' ? 'Candidate Name' : '<b style="color:red;font-size:48px">Candidate Name</b>' },
          preventDefault: () => { prevented = true; },
        });
        return { text: editor.innerText, html: editor.innerHTML, prevented };
      }, compiledHandler);
      assert.deepEqual(actual, { text: 'Candidate Name', html: 'Candidate Name', prevented: true });
    }
    console.log(`${file}: clipboard browser checks passed`);
  }
} finally {
  await browser.close();
}
