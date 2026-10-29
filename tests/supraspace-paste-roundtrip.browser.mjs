import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href
  : 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
}).outputText;
const modules = [
  ['links', '../src/lib/supra-space-links.ts'],
  ['paste', '../src/lib/supra-space-rich-paste.ts'],
  ['formatting', '../src/lib/supra-space-message-formatting.ts'],
  ['tables', '../src/lib/supra-space-tables.ts'],
].map(([name, path]) => ({ name, code: compile(fs.readFileSync(new URL(path, import.meta.url), 'utf8')) }));
const nodeModules = {};
for (const { name, code } of [...modules, { name: 'inline', code: compile(fs.readFileSync(new URL('../src/components/supraspace/SupraSpaceRichTextInline.tsx', import.meta.url), 'utf8')) }]) {
  const exports = {};
  new Function('exports', 'require', code)(exports, specifier => specifier === 'react' ? React
    : specifier.includes('links') ? nodeModules.links : specifier.includes('rich-paste') ? nodeModules.paste : nodeModules.formatting);
  nodeModules[name] = exports;
}

const fixtureHtml = `<h2>SUPRA SPACE — FORMATTING TEST</h2>
<p>Normal text<br><strong>Bold text</strong><br><em>Italic text</em><br><strong><em>Bold and italic text</em></strong><br><s>Strikethrough text</s><br><u>Underlined text</u><br><code>Inline code</code></p>
<p><strong>Bold with <em>italic</em> inside</strong><br><strong>Bold text with emojis 🚀 🔥 💯</strong><br><strong>Bold text with <a href="https://example.test/page">a clickable link</a></strong></p>
<ol><li>First numbered item</li><li>Second numbered item</li></ol>
<ul><li>First bullet<ul><li>Nested bullet</li></ul></li><li>Second bullet</li></ul>
<blockquote><strong>Important:</strong> This message contains bold formatting inside a quote.</blockquote>
<p>Literal **** marker<br>Symbols: @ # $ % ^ &amp; * () _ + = {} [] | \\ / &lt; &gt; ~ &#96;<br>VIN: <span aria-hidden="true">1HGCM82633A004352</span><br>VIN: 58ADA1C11PU035677<br>こんにちは世界 안녕하세요 你好世界</p>
<table><thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody><tr><td>John</td><td>Developer</td><td>Active</td></tr><tr><td>Maria</td><td>QA</td><td>Pending</td></tr></tbody></table>
<pre><code>const message = "Hello SupraSpace!";
console.log(message);
const literal = "**keep these stars** and _keep_ and &#96;backticks&#96;";
**literal line**
****literal stars****
{color:#ff0000}literal control
__
&lt;a href="https://example.test"&gt;Click here&lt;/a&gt;</code></pre>`;

try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    for (const file of ['../src/app/(chat)/supraspace/page.tsx', '../src/components/supraspace/ChatPopupManager.tsx']) {
      const page = await browser.newPage({ viewport, permissions: ['clipboard-read', 'clipboard-write'] });
      await page.route('http://localhost:43127/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
      await page.goto('http://localhost:43127/');
      await page.setContent('<div id="source"></div><div id="editor" contenteditable="true" style="white-space:pre-wrap"></div>');
      await page.evaluate(modules => {
        window.probeModules = {};
        for (const { name, code } of modules) {
          const exports = {};
          new Function('exports', 'require', code)(exports, specifier => {
            const key = specifier.includes('links') ? 'links' : specifier.includes('rich-paste') ? 'paste' : specifier.includes('formatting') ? 'formatting' : null;
            if (!key) throw new Error(`Unsupported module ${specifier}`);
            return window.probeModules[key];
          });
          window.probeModules[name] = exports;
          Object.assign(window, exports);
        }
      }, modules);
      const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name && !node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword));
      const constantNames = /^(?:SS4_(?:DEFAULT_FONT_FAMILY|DEFAULT_FONT_SIZE|FONT_FAMILIES|FONT_SIZES|BULLET_GLYPHS|LIST_INDENT_STEP|SOURCE_BULLET_RE)|POPUP_(?:BULLET_GLYPHS|LIST_INDENT_STEP|SOURCE_BULLET_RE)|popupBulletGlyphForDepth|CLIPBOARD_METADATA_TEXT_RE|STRUCTURED_LEAD_LABEL_PATTERN|MEDIA_LABELS)$/;
      const constants = ast.statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.every(declaration => constantNames.test(declaration.name.getText(ast))));
      await page.addScriptTag({ content: compile([...constants, ...functions].map(node => node.getText(ast).replace(/^export /, '')).join('\n')) });
      const pasteHandlers = [];
      const visit = node => {
        if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onPaste' && ts.isJsxExpression(node.initializer)) {
          pasteHandlers.push(compile(`window.testPaste = ${node.initializer.expression.getText(ast)};`));
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
      assert.equal(pasteHandlers.length, 2, 'compose and edit paste handlers must be exercised');
      await page.evaluate(html => {
        document.querySelector('#source').innerHTML = html;
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('#source'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }, fixtureHtml);
      await page.keyboard.press('Control+c');
      const payload = await page.evaluate(async () => {
        const [item] = await navigator.clipboard.read();
        return { html: await (await item.getType('text/html')).text(), plain: await (await item.getType('text/plain')).text() };
      });
      const result = await page.evaluate(({ html, plain }) => {
        const source = document.querySelector('#source');
        const editor = document.querySelector('#editor');
        source.innerHTML = html;
        const converted = clipboardPayloadToRichEditorHtml(plain, html);
        const fallback = richPasteDropsVisibleText(plain, html);
        editor.innerHTML = converted;
        const originalGuard = window.richTextSerializationDropsVisibleText;
        let comparison;
        window.richTextSerializationDropsVisibleText = (visible, candidate) => {
          comparison = { visible, candidate, loses: originalGuard(visible, candidate) };
          const compared = stripRichTextMarkupForPlainPaste(supraSpaceTablesToComparableText(candidate))
            .replace(/^\s*>\s?/gm, '')
            .replace(/^\s*(?:[-*+\u2022\u00b7\u2023\u2043\u25e6\u25aa\u25ab\u25cf\u25cb\u2013\u2014]|\d+[.)])\s+/gm, '')
            .replace(/^\s*```[^\n]*$/gm, '');
          const a = visible.replace(/\s+/g, '');
          const b = compared.replace(/\s+/g, '');
          let first = 0;
          while (first < a.length && a[first] === b[first]) first++;
          comparison.mismatch = { first, visible: a.slice(first, first + 150), compared: b.slice(first, first + 150) };
          return comparison.loses;
        };
        const stored = normalizeMessageMarkdownText(canonicalizeColorMarkup(htmlToMarkdown(editor)));
        return { plain, converted, fallback, stored, comparison, reopened: markdownTextToEditorHtml(stored) };
      }, payload);
      if (result.fallback || result.comparison.loses) console.log(JSON.stringify({ file, width: viewport.width, ...result }, null, 2));
      assert.equal(result.fallback, false, 'complete browser clipboard HTML must stay formatted');
      assert.match(result.stored, /\*\*Bold text\*\*/, 'bold must survive send');
      assert.match(result.stored, /_Italic text_/, 'italic must survive send');
      assert.match(result.stored, /__Underlined text__/, 'underline must survive send');
      assert.match(result.reopened, /<table>/, 'table must survive send and reopen');
      assert.match(result.stored, /1HGCM82633A004352/);
      assert.match(result.stored, /58ADA1C11PU035677/);
      const renderBindings = { React, ...Object.assign({}, ...Object.values(nodeModules)) };
      const renderBody = compile([...constants, ...functions].map(node => node.getText(ast).replace(/^export /, '')).join('\n'));
      const render = new Function(...Object.keys(renderBindings), `${renderBody}; return typeof renderMessageContent === 'function' ? content => renderMessageContent(content, true) : content => renderContent({ type: 'text', content }, true);`)(...Object.values(renderBindings));
      const rendered = renderToStaticMarkup(React.createElement('div', null, render(result.stored)));
      assert.match(rendered, /<strong>Bold text<\/strong>/);
      assert.match(rendered, /<em>Italic text<\/em>/);
      assert.match(rendered, /<u>Underlined text<\/u>/);
      assert.match(rendered, /<table/);
      assert.match(rendered, /<pre/);
      assert.match(rendered, /Literal \*\*\*\* marker/);
      assert.match(rendered, /\*\*keep these stars\*\* and _keep_ and `backticks`/);
      assert.match(rendered, /\*\*literal line\*\*\n\*\*\*\*literal stars\*\*\*\*\n\{color:#ff0000\}literal control\n__/);
      const safety = await page.evaluate(({ html, plain, stored }) => {
        const editor = document.querySelector('#editor');
        const incompleteHtml = '<ul><li>Vehicle details</li></ul>';
        const completeText = 'Vehicle details\nVIN: 1HGCM82633A004352\nVIN: 58ADA1C11PU035677\nLiteral **** and _identifier_';
        const missingFallsBack = richPasteDropsVisibleText(completeText, incompleteHtml);
        const completeFallback = clipboardPayloadToPlainText(completeText, incompleteHtml);
        editor.innerHTML = clipboardPayloadToRichEditorHtml('', '<p><b>Vehicle details</b></p><p>VIN: <span aria-hidden="true">1HGCM82633A004352</span></p><p>VIN: <input value="58ADA1C11PU035677"></p><span style="display:none">hidden secret</span>');
        const withVins = htmlToMarkdown(editor);
        const vinNode = [...editor.querySelectorAll('div')].find(node => node.textContent.includes('1HGCM82633A004352'));
        vinNode.remove();
        const afterDelete = htmlToMarkdown(editor);
        editor.innerHTML = 'first<br data-ss4-soft-break="true"><br data-ss4-soft-break="true">second';
        const breaks = htmlToMarkdown(editor);
        return { missingFallsBack, completeFallback, completeText, withVins, afterDelete, breaks,
          comparableMarkdown: richPasteComparablePlainText(stored), htmlText: clipboardHtmlToPlainText(html),
          markdownPayloadFallback: richPasteDropsVisibleText(stored, html),
          windowsMarkdownFallback: richPasteDropsVisibleText(stored.replace(/\n/g, '\r\n'), html) };
      }, { html: payload.html, plain: payload.plain, stored: result.stored });
      assert.equal(safety.missingFallsBack, true, 'incomplete source HTML must trigger the content safeguard');
      assert.equal(safety.completeFallback, safety.completeText, 'fallback must retain every VIN and literal character');
      assert.match(safety.withVins, /\*\*Vehicle details\*\*/);
      assert.match(safety.withVins, /1HGCM82633A004352/);
      assert.match(safety.withVins, /58ADA1C11PU035677/);
      assert.doesNotMatch(safety.withVins, /hidden secret/);
      assert.doesNotMatch(safety.afterDelete, /1HGCM82633A004352/, 'intentional deletion must win');
      assert.match(safety.afterDelete, /58ADA1C11PU035677/);
      assert.equal(safety.breaks, 'first\n\nsecond');
      if (safety.markdownPayloadFallback) console.log(JSON.stringify(safety, null, 2));
      assert.equal(safety.markdownPayloadFallback, false, 'Markdown plain text paired with equivalent HTML must remain rich');
      assert.equal(safety.windowsMarkdownFallback, false, 'Windows clipboard line endings must preserve code boundaries');
      for (const handler of pasteHandlers) {
        for (const shortcut of [false, true]) {
          await page.evaluate(({ handler, payload }) => {
            const editor = document.querySelector('#editor');
            editor.innerHTML = '';
            const ref = { current: editor };
            const noop = () => {};
            const bindings = {
              pasteMode: 'formatted', editPasteMode: 'formatted',
              pastePlainTextShortcutRef: { current: false }, editPastePlainTextShortcutRef: { current: false },
              pastedPlainTextRef: { current: '' }, textareaRef: ref, inputRef: ref, editAreaRef: ref,
              pasteUndoRef: { current: null }, editPasteUndoRef: { current: null },
              clipboardAttachmentFiles: () => [], clipboardImageFiles: () => [], getSS4PastedMediaReference: () => null,
              SS4_MAX_MESSAGE_CHARS: 10000, showMessageLimitNotice: () => { throw new Error('Unexpected message limit'); },
              setMentionQuery: noop, setMentionAnchor: noop, syncComposerText: noop, syncEditDraft: noop,
              saveComposerSelection: noop, refreshActiveFormats: noop, rememberEditSelection: noop,
              refreshEditActiveFormats: noop, refreshPopupEditFormats: noop, rememberComposerSelection: noop,
              refreshComposerCaretFormats: noop, enforceComposerLengthFromDom: () => htmlToMarkdown(editor),
            };
            const run = new Function(...Object.keys(bindings), `${handler}; return window.testPaste;`)(...Object.values(bindings));
            editor.onkeydown = event => {
              if (isSupraSpacePlainTextPasteShortcut(event)) {
                bindings.pastePlainTextShortcutRef.current = true;
                bindings.editPastePlainTextShortcutRef.current = true;
              }
            };
            editor.onpaste = run;
            window.clipboardPayload = payload;
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
          }, { handler, payload });
          await page.keyboard.press(shortcut ? 'Control+Shift+v' : 'Control+v');
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const pasted = await page.evaluate(() => {
            const editor = document.querySelector('#editor');
            return { text: editor.innerText, styled: !!editor.querySelector('strong,em,u,table,pre'), stored: htmlToMarkdown(editor) };
          });
          assert.equal(pasted.styled, !shortcut, `${file}: native paste shortcut must choose the expected mode`);
          if (!shortcut) assert.match(pasted.stored, /\*\*Bold text\*\*/);
          assert.equal(pasted.text.replace(/\s+/g, ''), payload.plain.replace(/\s+/g, ''), `${file}: paste must preserve all visible text`);
        }
      }
      console.log(`${file} at ${viewport.width}px: native clipboard round trip passed`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
