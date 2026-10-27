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
      jsx: typescript.JsxEmit.React,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, {
    URL,
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    module: loadedModule,
    exports: loadedModule.exports,
    require: specifier => dependencies[specifier],
  });
  return loadedModule.exports;
}

function loadSupraSpacePastedMediaHelpers() {
  const source = fs.readFileSync(new URL('../src/app/(chat)/supraspace/page.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('function cleanSS4PastedUrlCandidate');
  const end = source.indexOf('async function ss4PastedMediaUrlToFile', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const compiled = typescript.transpileModule(`${source.slice(start, end)}\nmodule.exports = { getSS4PastedMediaReference };`, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, {
    URL,
    Set,
    module: loadedModule,
    exports: loadedModule.exports,
    getMediaExtension: pathname => (pathname.match(/\.[^./]+$/)?.[0] || '').toLowerCase(),
    SS4_PASTED_ATTACHMENT_EXTENSIONS: new Set(['.png', '.pdf']),
  });
  return loadedModule.exports;
}

const links = loadTypeScriptModule('../src/lib/supra-space-links.ts');
const richPaste = loadTypeScriptModule('../src/lib/supra-space-rich-paste.ts', {
  './supra-space-links': links,
});
const formatting = loadTypeScriptModule('../src/lib/supra-space-message-formatting.ts', {
  './supra-space-links': links,
});
const react = {
  Fragment: Symbol.for('react.fragment'),
  createElement(type, props, ...children) {
    return { type, props: { ...props, children: children.length === 1 ? children[0] : children } };
  },
};
const richInline = loadTypeScriptModule('../src/components/supraspace/SupraSpaceRichTextInline.tsx', {
  react,
  '@/lib/supra-space-message-formatting': formatting,
  '@/lib/supra-space-links': links,
});
const pastedMedia = loadSupraSpacePastedMediaHelpers();

assert.equal(richPaste.hasSupraSpaceTextSelection(), false);
assert.equal(richPaste.getSupraSpaceSelectionClipboardData({}), null);
assert.equal(links.supraSpaceMarkdownToEditorInlineHtml('*Italic text*'), '<em>Italic text</em>');
assert.equal(links.supraSpaceMarkdownToEditorInlineHtml('***Bold and italic text***'), '<strong><em>Bold and italic text</em></strong>');
assert.equal(links.supraSpaceMarkdownToEditorInlineHtml('**Bold with *italic* inside**'), '<strong>Bold with <em>italic</em> inside</strong>');
const externalClassFormatting = richPaste.getSupraSpaceClipboardSemanticClassFormatting(
  'font-semibold fst-italic text-underline line-through',
);
assert.equal(externalClassFormatting.bold, true);
assert.equal(externalClassFormatting.italic, true);
assert.equal(externalClassFormatting.underline, true);
assert.equal(externalClassFormatting.strike, true);
const unrelatedExternalClassFormatting = richPaste.getSupraSpaceClipboardSemanticClassFormatting(
  'layout-card theme-dark text-blue-500',
);
assert.equal(unrelatedExternalClassFormatting.bold, false, 'unrelated external classes must not become persisted formatting');
assert.equal(unrelatedExternalClassFormatting.italic, false, 'unrelated external classes must not become persisted formatting');
assert.equal(unrelatedExternalClassFormatting.underline, false, 'unrelated external classes must not become persisted formatting');
assert.equal(unrelatedExternalClassFormatting.strike, false, 'unrelated external classes must not become persisted formatting');

const attachmentUrl = 'https://example.test/attachment.png';
assert.equal(
  pastedMedia.getSS4PastedMediaReference('newly copied text', `<a href="${attachmentUrl}">old attachment</a>`),
  null,
);
const currentAttachmentReference = pastedMedia.getSS4PastedMediaReference(
  attachmentUrl,
  '<a href="https://example.test/previous.pdf">old attachment</a>',
);
assert.equal(currentAttachmentReference?.url, attachmentUrl);
assert.equal(currentAttachmentReference?.local, false);

const meetUrl = 'https://meet.google.com/esg-zidk-mhv';
const malformedExternalLink = '**➡️ Video call link: [https://**](https://**)meet.google.com/nbk-phfw-uxs**';
const repairedExternalLink = '**➡️ Video call link: [https://meet.google.com/nbk-phfw-uxs](https://meet.google.com/nbk-phfw-uxs)**';
const splitWrappedExternalLink = '**➡️ Video call link: [https://](https://)**meet.google.com/nbk-phfw-uxs**';
const escapedQuoteBlank = `> ${'\\'}`;
const externalQuoteArtifacts = [
  escapedQuoteBlank,
  '>',
  escapedQuoteBlank,
  '> \\> 🚨🚨🚨',
  '> **❗OVERBREAK ALERT ❗**',
  '> *@Krizza Pepito*',
  escapedQuoteBlank,
  '>',
].join('\n');
const nestedExternalQuoteArtifacts = [
  '>',
  '>',
  '>',
  '> > overbreak alert marker',
  '> **Overbreak alert**',
  '> *@Krizza Pepito*',
  '>',
  '>',
  '>',
].join('\n');
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
assert.equal(links.isSuprahMeetCode('MEET-5872'), true);
assert.equal(links.isSuprahMeetCode('meet-5872'), true);
assert.equal(links.isSuprahMeetCode('MEET-58720'), false);
assert.equal(links.getSuprahMeetRoomHref('meet-5872'), '/crm/suprah-meet/room/MEET-5872');

assert.equal(
  links.normalizeSupraSpaceSplitUrlFormatting(malformedExternalLink),
  repairedExternalLink,
);
assert.equal(
  links.normalizeSupraSpaceSplitUrlFormatting(splitWrappedExternalLink),
  repairedExternalLink,
);
assert.equal(
  links.normalizeSupraSpaceSplitUrlFormatting('[https://](https://)meet.google.com/nbk-phfw-uxs'),
  '[https://meet.google.com/nbk-phfw-uxs](https://meet.google.com/nbk-phfw-uxs)',
);
assert.equal(
  links.normalizeSupraSpaceSplitUrlFormatting('**Video call: https://**meet.google.com/nbk-phfw-uxs**'),
  '**Video call: https://meet.google.com/nbk-phfw-uxs**',
);
assert.equal(
  links.normalizeSupraSpaceSplitUrlFormatting('Keep literal ** markers with https://** but no host'),
  'Keep literal ** markers with https://** but no host',
);
const repairedExternalHtml = links.supraSpaceMarkdownToEditorInlineHtml(malformedExternalLink);
assert.match(repairedExternalHtml, /href="https:\/\/meet\.google\.com\/nbk-phfw-uxs"/);
assert.doesNotMatch(repairedExternalHtml, /href="https:\/\/\*\*"/);

assert.equal(
  formatting.normalizeSupraSpaceExternalQuoteArtifacts(externalQuoteArtifacts),
  '🚨🚨🚨\n**❗OVERBREAK ALERT ❗**\n*@Krizza Pepito*',
);
assert.equal(
  formatting.normalizeSupraSpaceExternalQuoteArtifacts('> First\n>\n> Second'),
  '> First\n>\n> Second',
);
assert.equal(
  formatting.normalizeSupraSpaceExternalQuoteArtifacts(nestedExternalQuoteArtifacts),
  'overbreak alert marker\n**Overbreak alert**\n*@Krizza Pepito*',
);

assert.equal(formatting.normalizeSupraSpaceBoldMarkerRuns('****Applicant****'), '**Applicant**');
assert.equal(formatting.normalizeSupraSpaceBoldMarkerRuns('****'), '****');

const allMentionNodes = richInline.renderSupraSpaceRichTextInline('@all Hello, good morning!', true, 'all', false, ['all']);
assert.equal(allMentionNodes[0]?.props?.children, '@all');
assert.equal(allMentionNodes[1], ' Hello, good morning!');

const namedMentionNodes = richInline.renderSupraSpaceRichTextInline('@Ana Reyes Hello, good morning!', true, 'named', false, ['Ana Reyes', 'Ana']);
assert.equal(namedMentionNodes[0]?.props?.children, '@Ana Reyes');
assert.equal(namedMentionNodes[1], ' Hello, good morning!');

const firstNameMentionNodes = richInline.renderSupraSpaceRichTextInline('@Ana Hello, good morning!', true, 'first-name', false, ['Ana Reyes', 'Ana']);
assert.equal(firstNameMentionNodes[0]?.props?.children, '@Ana');
assert.equal(firstNameMentionNodes[1], ' Hello, good morning!');

const nonMemberMentionNodes = richInline.renderSupraSpaceRichTextInline('@alliance Hello', true, 'non-member', false, ['all']);
assert.equal(nonMemberMentionNodes.join(''), '@alliance Hello');

const emailNodes = richInline.renderSupraSpaceRichTextInline('Send to hr@gmail.com please.', true, 'email');
assert.equal(emailNodes.join(''), 'Send to hr@gmail.com please.');

assert.equal(
  richPaste.supraSpaceClipboardTextLosesPlainText(
    'Long text 😀 caf\u00e9 \u2014 symbols \u2713\u2122\nSecond line',
    'Long text 😀 cafe\u0301 \u2014 symbols \u2713\u2122 Second line',
  ),
  false,
);
assert.equal(
  richPaste.supraSpaceClipboardTextLosesPlainText(
    'Long text 😀 caf\u00e9 \u2014 symbols \u2713\u2122\nSecond line',
    'Long text 😀 caf\u00e9',
  ),
  true,
);

const shippingPaymentText = [
  'Hello Boss requesting payment for this shipping please.',
  'Vehicle: 2025 HONDA ODYSSEY',
  'VIN: 5FNRL6H78PB012345',
  'Customer Paid: $1,265.00',
].join('\n');
assert.equal(
  richPaste.supraSpaceClipboardTextLosesPlainText(
    shippingPaymentText,
    shippingPaymentText.replace('5FNRL6H78PB012345', ''),
  ),
  true,
);

assert.equal(
  richPaste.isSupraSpacePlainTextPasteShortcut({ key: 'v', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true }),
  true,
);
assert.equal(
  richPaste.isSupraSpacePlainTextPasteShortcut({ key: 'v', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }),
  false,
);
assert.equal(
  richPaste.isSupraSpacePlainTextPasteShortcut({ key: 'v', ctrlKey: true, metaKey: false, altKey: true, shiftKey: true }),
  false,
);

assert.equal(richPaste.stripSupraSpaceSemanticListMarker('1. Open the widget.', true), 'Open the widget.');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('2.Select a message.', true), 'Select a message.');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('7)Confirm the action.', true), 'Confirm the action.');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('3.', true), '');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('Release 2.0 is ready.', true), 'Release 2.0 is ready.');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('\u2022 Keep this bullet text.', false), 'Keep this bullet text.');

console.log('SupraSpace rich-text regression checks passed.');

// Exercise both real serializers with browser-shaped editor nodes.
function editorNode(tag, children = [], attributes = {}) {
  const node = typeof tag === 'string' && tag === '#text'
    ? { nodeType: 3, textContent: children }
    : {
      nodeType: 1, tagName: tag.toUpperCase(), childNodes: children,
      style: new Proxy({}, { get: () => '' }),
      getAttribute: name => attributes[name] ?? null,
      hasAttribute: name => Object.hasOwn(attributes, name),
      querySelectorAll(selector) {
        const found = [];
        const visit = current => (current.childNodes || []).forEach(child => {
          if (child.tagName?.toLowerCase() === selector) found.push(child);
          visit(child);
        });
        visit(this);
        found.item = index => found[index] || null;
        return found;
      },
    };
  if (node.nodeType === 1) {
    Object.defineProperty(node, 'innerText', {
      get() {
        const collect = current => {
          if (current.nodeType === 3) return current.textContent || '';
          if (current.tagName?.toLowerCase() === 'br') return '\n';
          return (current.childNodes || []).map(collect).join('');
        };
        return collect(node);
      },
    });
  }
  if (Array.isArray(children)) children.forEach((child, index) => {
    child.parentElement = node;
    child.nextSibling = children[index + 1] || null;
  });
  return node;
}
const textNode = value => editorNode('#text', value);
for (const path of ['../src/app/(chat)/supraspace/page.tsx', '../src/components/supraspace/ChatPopupManager.tsx']) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(source, /richTextSerializationDropsVisibleText\(visibleText, serialized\)/, `${path}: serializer must retain its visible-text guard`);
  assert.doesNotMatch(source, /preserveVisibleVinLines|preserveVisiblePayloadLines|restoreMissingSerialsFromSources/, `${path}: do not revive VIN-specific restoration`);
  assert.match(source, /softBreak\.setAttribute\('data-ss4-soft-break', 'true'\)/, `${path}: pasted line breaks must remain authored editor breaks`);
  assert.equal((source.match(/isSupraSpacePlainTextPasteShortcut/g) || []).length, 3, `${path}: plain-text shortcut must cover compose and edit`);
  assert.equal((source.match(/useState<PasteMode>\('formatted'\)/g) || []).length, 2, `${path}: compose and edit must keep formatting by default`);
  assert.equal((source.match(/insertRichHtmlAtRichEditorSelection\(/g) || []).length, 3, `${path}: rich paste must use range insertion in compose and edit`);
  assert.match(source, /getSupraSpaceClipboardSemanticClassFormatting/, `${path}: semantic external CSS classes must preserve supported text formatting`);
  assert.match(source, /richPasteComparablePlainText/, `${path}: Markdown clipboard syntax must not trigger a false content-loss fallback`);
  assert.match(source, /const codeFence = line\.match\(\/\^```/, `${path}: text-only Markdown code fences must become rich editor blocks`);
  assert.match(source, /const headingMatch = line\.match\(\/\^\\s\{0,3\}#\{1,6\}/, `${path}: text-only Markdown headings must retain their semantic emphasis`);
  assert.doesNotMatch(source, /execCommand\('insertHTML', false, richEditorHtml\)/, `${path}: rich paste must not depend on deprecated insertHTML commands`);
  assert.match(source, /PasteUndoRef/, `${path}: pasted content must have focused Ctrl\/Cmd\+Z support`);
  const richPasteStart = source.indexOf('function richPasteDropsVisibleText(');
  const richPasteEnd = source.indexOf('function markdownTextToEditorHtml(', richPasteStart);
  assert.notEqual(richPasteStart, -1, `${path}: rich-paste visible-text guard must exist`);
  assert.notEqual(richPasteEnd, -1, `${path}: Markdown rich-paste helpers must exist`);
  let clipboardHtmlPlainText = '';
  const richPasteContext = {
    clipboardHtmlToPlainText: () => clipboardHtmlPlainText,
    supraSpaceClipboardTextLosesPlainText: richPaste.supraSpaceClipboardTextLosesPlainText,
    stripSupraSpaceMarkdownLinksToLabels: links.stripSupraSpaceMarkdownLinksToLabels,
    stripSupraSpaceControlMarkup: formatting.stripSupraSpaceControlMarkup,
    normalizeSupraSpaceLegacyMarkup: formatting.normalizeSupraSpaceLegacyMarkup,
    findSupraSpaceMarkdownLink: links.findSupraSpaceMarkdownLink,
  };
  vm.createContext(richPasteContext);
  vm.runInContext(typescript.transpileModule(source.slice(richPasteStart, richPasteEnd), {
    compilerOptions: { target: typescript.ScriptTarget.ES2022 },
  }).outputText, richPasteContext);
  const markdownClipboard = [
    '## SUPRA SPACE — FORMATTING TEST',
    '**Bold text**',
    '*Italic text*',
    '***Bold and italic text***',
    '~~Strikethrough text~~',
    '[Google](https://www.google.com/)',
    '- First bullet',
    '> **Important:** formatted quote',
    '| Name | Role |',
    '| ---- | ---- |',
    '| John | Developer |',
    'VIN: 1HGCM82633A004352',
    'Text before\\',
    'Text after a single line break.',
  ].join('\n');
  clipboardHtmlPlainText = [
    'SUPRA SPACE — FORMATTING TEST',
    'Bold text',
    'Italic text',
    'Bold and italic text',
    'Strikethrough text',
    'Google',
    'First bullet',
    'Important: formatted quote',
    'Name Role',
    'John Developer',
    'VIN: 1HGCM82633A004352',
    'Text before',
    'Text after a single line break.',
  ].join('\n');
  assert.equal(richPasteContext.richPasteDropsVisibleText(markdownClipboard, '<div>rendered clipboard</div>'), false, `${path}: rendered Markdown must stay formatted`);
  clipboardHtmlPlainText = 'VIN: 1HGCM82633A004352';
  assert.equal(richPasteContext.richPasteDropsVisibleText('VIN: 1HGCM82633A004352\nInvisible source detail', '<div>incomplete clipboard</div>'), true, `${path}: a real visible-text loss must still fall back safely`);
  assert.equal(richPasteContext.richPasteDropsVisibleText('Literal **** marker', '<div>missing marker</div>'), true, `${path}: literal marker text must not be treated as formatting syntax`);
  const start = source.indexOf('function htmlToMarkdown(');
  const end = source.indexOf('\nfunction ', start + 1);
  const compiled = typescript.transpileModule(source.slice(start, end), {
    compilerOptions: { target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    stripCopiedTextArtifacts: value => value,
    clipboardElementIsHidden: () => false,
    clipboardElementIsDecorativeMarker: element => element.getAttribute?.('data-test-dropped-text') === 'true',
    clipboardElementIsMetadata: () => false,
    ss4FontFamilyIdFromCss: () => null,
    ss4FontSizeFromCss: () => null,
    ss4FontSizeFromLegacyAttribute: () => null,
    getSupraSpaceClipboardTextColor: () => null,
    cssColorToHex: () => null,
    isSupraSpaceEditorPlaceholderBreak: richPaste.isSupraSpaceEditorPlaceholderBreak,
    normalizeListExitLineSpacing: value => value,
    normalizeSupraSpaceLegacyMarkup: formatting.normalizeSupraSpaceLegacyMarkup,
    canonicalizeColorMarkup: value => value,
    richTextSerializationDropsVisibleText: (visible, serialized) => richPaste.supraSpaceClipboardTextLosesPlainText(
      visible,
      serialized
        .replace(/\*\*([^*\n]+)\*\*/g, '$1')
        .replace(/__([^_\n]+)__/g, '$1')
        .replace(/~~([^~\n]+)~~/g, '$1')
        .replace(/`([^`\n]+)`/g, '$1')
        .replace(/(^|[^\w*])_([^_\n]+)_(?!\w)/g, '$1$2')
        .replace(/^\s*>\s?/gm, '')
        .replace(/^\s*(?:[-*+\u2022\u00b7\u2023\u2043\u25e6\u25aa\u25ab\u25cf\u25cb\u2013\u2014]|\d+[.)])\s+/gm, ''),
    ),
  };
  vm.createContext(context);
  vm.runInContext(compiled, context);
  const serialize = children => context.htmlToMarkdown(editorNode('div', children));
  assert.equal(serialize([
    editorNode('div', [textNode('first')]),
    editorNode('div', [editorNode('br'), editorNode('br')]),
    editorNode('div', [textNode('second')]),
  ]), 'first\n\n\nsecond', path);
  for (const [tag, marker] of [['strong', '**'], ['em', '_'], ['u', '__'], ['s', '~~']]) {
    assert.equal(serialize([
      editorNode('div', [editorNode(tag, [textNode('first'), editorNode('br')])]),
      editorNode('div', [textNode('second')]),
    ]), marker + 'first' + marker + '\nsecond', path + ': styled placeholder ' + tag);
    assert.equal(serialize([
      editorNode('div', [editorNode(tag, [textNode('first'), editorNode('br', [], { 'data-ss4-soft-break': 'true' })])]),
      editorNode('div', [textNode('second')]),
    ]), marker + 'first' + marker + '\n\nsecond', path + ': authored styled soft break ' + tag);
  }
  assert.equal(serialize([
    editorNode('blockquote', [textNode('first')]),
    editorNode('blockquote', [editorNode('br')]),
    editorNode('blockquote', [textNode('second')]),
  ]), '> first\n>\n> second', path + ': empty quote stays one line');
  assert.equal(serialize([
    editorNode('div', [editorNode('strong', [textNode('first'), editorNode('br')]), textNode('second')]),
  ]), '**first**\nsecond', path + ': break before following text stays authored');
  assert.equal(serialize([
    editorNode('div', [textNode('first'), editorNode('br'), editorNode('span', [textNode('\u200B')])]),
    editorNode('div', [textNode('second')]),
  ]), 'first\nsecond', path + ': caret marker does not turn a placeholder into content');
  assert.equal(serialize([textNode('first'), editorNode('br'), textNode('second')]), 'first\nsecond', path);
  assert.equal(serialize([textNode('first'), editorNode('br'), editorNode('br'), textNode('second')]), 'first\n\nsecond', path);
  assert.equal(serialize([
    editorNode('div', [
      editorNode('div', [textNode('first')]),
      editorNode('div', [editorNode('br')]),
    ]),
    editorNode('div', [textNode('second')]),
  ]), 'first\n\nsecond', path);
  assert.equal(serialize([
    editorNode('div', [textNode('first')]),
    editorNode('div', [editorNode('br')]),
    editorNode('div', [textNode('second')]),
  ]), 'first\n\nsecond', path);
  assert.equal(serialize([
    editorNode('div', [
      textNode('Vehicle: 2023 Lexus ES\nVIN: '),
      editorNode('span', [textNode('58ADA1C11PU035677')], { 'data-test-dropped-text': 'true' }),
    ]),
  ]), 'Vehicle: 2023 Lexus ES\nVIN: 58ADA1C11PU035677', `${path}: visible content is never silently dropped`);
  assert.equal(serialize([
    editorNode('div', [
      textNode('@Mia Rodriguez please retrieve these vehicles.\nVehicle: 2023 Lexus ES\nVIN: '),
      editorNode('span', [textNode('58ADA1C11PU035677')], { 'data-test-dropped-text': 'true' }),
      textNode('\nVehicle: 2024 Honda Odyssey\nVIN: '),
      editorNode('span', [textNode('5FNRL6H78PB012345')], { 'data-test-dropped-text': 'true' }),
      textNode('\nNotes: caf\u00e9 \u2713 \ud83d\ude97'),
    ]),
  ]), '@Mia Rodriguez please retrieve these vehicles.\nVehicle: 2023 Lexus ES\nVIN: 58ADA1C11PU035677\nVehicle: 2024 Honda Odyssey\nVIN: 5FNRL6H78PB012345\nNotes: caf\u00e9 \u2713 \ud83d\ude97', `${path}: multiple visible VINs and surrounding content survive`);
  assert.equal(serialize([
    editorNode('div', [textNode('first')], { 'data-ss4-paste-paragraph': 'true' }),
    editorNode('div', [textNode('second')], { 'data-ss4-paste-paragraph': 'true' }),
  ]), 'first\nsecond', path);
  assert.equal(serialize([
    editorNode('div', [editorNode('strong', [textNode('first')]), editorNode('br')]),
    editorNode('div', [textNode('second')]),
  ]), '**first**\nsecond', path);
  assert.equal(serialize([
    editorNode('div', [textNode('first'), editorNode('br', [], { 'data-ss4-soft-break': 'true' })]),
    editorNode('div', [textNode('second')]),
  ]), 'first\n\nsecond', path);
}
console.log('SupraSpace editor newline regression tests passed.');
