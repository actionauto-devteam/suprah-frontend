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
const pastedMedia = loadSupraSpacePastedMediaHelpers();

assert.equal(richPaste.hasSupraSpaceTextSelection(), false);
assert.equal(richPaste.getSupraSpaceSelectionClipboardData({}), null);

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

assert.equal(richPaste.stripSupraSpaceSemanticListMarker('1. Open the widget.', true), 'Open the widget.');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('2.Select a message.', true), 'Select a message.');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('7)Confirm the action.', true), 'Confirm the action.');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('Release 2.0 is ready.', true), 'Release 2.0 is ready.');
assert.equal(richPaste.stripSupraSpaceSemanticListMarker('\u2022 Keep this bullet text.', false), 'Keep this bullet text.');

console.log('SupraSpace rich-text regression checks passed.');
