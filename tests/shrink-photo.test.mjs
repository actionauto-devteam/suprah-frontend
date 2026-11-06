import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do.
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  const requireLib = (specifier) => loadLib(specifier.replace(/^@\/lib\//, ''));
  new Function('exports', 'require', 'module', outputText)(cjs.exports, requireLib, cjs);
  return cjs.exports;
}

const { DOCUMENT_PHOTO, MAX_DOCUMENT_BYTES, documentTooLargeMessage, isPhotoFile, prepareDocumentFile } = loadLib('shrink-photo');

const MB = 1024 * 1024;
const fakeFile = (name, type, size) => ({ name, type, size });

test('photos are told apart from PDFs, by type or by name', () => {
  assert.equal(isPhotoFile(fakeFile('license.jpg', 'image/jpeg', 1)), true);
  assert.equal(isPhotoFile(fakeFile('IMG_0001.HEIC', '', 1)), true);
  assert.equal(isPhotoFile(fakeFile('camera', 'image/png', 1)), true);
  assert.equal(isPhotoFile(fakeFile('insurance.pdf', 'application/pdf', 1)), false);
});

test('a big phone photo is shrunk to fit, sharp enough for a document', async () => {
  let usedOptions = null;
  const shrink = async (file, options) => {
    usedOptions = options;
    return fakeFile('license.jpg', 'image/jpeg', 1.2 * MB);
  };
  const result = await prepareDocumentFile(fakeFile('license.jpg', 'image/jpeg', 9 * MB), shrink);
  assert.equal(result.error, undefined);
  assert.equal(result.file.size, 1.2 * MB);
  assert.deepEqual(usedOptions, DOCUMENT_PHOTO);
  assert.ok(DOCUMENT_PHOTO.maxSide >= 2400);
});

test("a PDF isn't shrunk; one over 5 MB says what to do and where to get help", async () => {
  let shrunk = false;
  const shrink = async (file) => { shrunk = true; return file; };
  const small = await prepareDocumentFile(fakeFile('insurance.pdf', 'application/pdf', 2 * MB), shrink);
  assert.equal(small.file.name, 'insurance.pdf');
  const big = await prepareDocumentFile(fakeFile('insurance.pdf', 'application/pdf', MAX_DOCUMENT_BYTES + 1), shrink);
  assert.equal(shrunk, false);
  assert.match(big.error, /^This PDF is larger than 5 MB\. Take a photo of the document instead/);
  assert.match(big.error, /contact Suprah AI support at support@suprahai\.com\.$/);
});

test("a photo still too big after shrinking explains what to try", async () => {
  const shrink = async () => fakeFile('scan.jpg', 'image/jpeg', 6 * MB);
  const result = await prepareDocumentFile(fakeFile('scan.png', 'image/png', 20 * MB), shrink);
  assert.match(result.error, /^This photo is still larger than 5 MB after making it smaller\./);
  assert.match(documentTooLargeMessage(fakeFile('a.jpg', 'image/jpeg', 1)), /Suprah AI support/);
});
