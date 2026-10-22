import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href
  : 'playwright');

function parse(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function find(ast, predicate) {
  let result;
  function visit(node) {
    if (!result && predicate(node)) result = node;
    if (!result) ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(result, 'Expected attachment handler in source');
  return result;
}
function declaration(ast, name) {
  const source = ast.getSourceFile();
  return find(ast, node => ts.isVariableDeclaration(node) && node.name.getText(source) === name).initializer.getText(source);
}
function compile(source) {
  return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

const browser = await chromium.launch({ headless: true });
try {
  let page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  // Run the production handlers on DOM elements so native pointer capture,
  // dragging outside the image, and click ordering are exercised in Chromium.
  const popup = parse('../src/components/supraspace/ChatPopupManager.tsx');
  const image = find(popup, node => ts.isJsxSelfClosingElement(node)
    && node.tagName.getText(popup) === 'img'
    && node.attributes.properties.some(p => p.name?.getText(popup) === 'onPointerDown'));
  const handlers = image.attributes.properties.filter(p => p.name?.getText(popup).startsWith('onPointer')
    || p.name?.getText(popup) === 'onLostPointerCapture');
  await page.setContent('<img id="image" style="position:absolute;left:200px;top:200px;width:100px;height:100px;touch-action:none" />');
  await page.addScriptTag({ content: compile(`
    let mediaPreviewZoom = 2;
    let mediaPreviewOffset = { x: 0, y: 0 };
    const previewDragRef = { current: null };
    const setMediaPreviewOffset = next => { mediaPreviewOffset = next; };
    const setMediaPreviewZoom = next => { mediaPreviewZoom = next; };
    const clampPreviewZoom = ${declaration(popup, 'clampPreviewZoom')};
    const React = { useCallback: callback => callback };
    const applyZoom = ${declaration(popup, 'applyMediaPreviewZoom')};
  `) });
  for (const handler of handlers) {
    const event = handler.name.getText(popup).slice(2).toLowerCase();
    const expression = handler.initializer.expression.getText(popup);
    await page.addScriptTag({ content: compile(`document.querySelector('#image').addEventListener('${event}', ${expression});`) });
  }
  await page.mouse.move(250, 250);
  await page.mouse.down();
  await page.mouse.move(650, 500, { steps: 8 });
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => mediaPreviewOffset), { x: 400, y: 250 });
  assert.equal(await page.evaluate(() => previewDragRef.current), null);
  await page.mouse.move(700, 550);
  assert.deepEqual(await page.evaluate(() => mediaPreviewOffset), { x: 400, y: 250 });
  await page.evaluate(() => applyZoom(9));
  assert.equal(await page.evaluate(() => mediaPreviewZoom), 4, 'zoom is capped at 400%');
  await page.evaluate(() => applyZoom(0));
  assert.deepEqual(await page.evaluate(() => ({ zoom: mediaPreviewZoom, offset: mediaPreviewOffset })), { zoom: 1, offset: { x: 0, y: 0 } });
  await page.evaluate(() => { mediaPreviewZoom = 2; });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 250, y: 250 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 400, y: 350 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.deepEqual(await page.evaluate(() => mediaPreviewOffset), { x: 150, y: 100 }, 'touch can pan beyond the image');
  assert.equal(await page.evaluate(() => previewDragRef.current), null);

  await page.close();
  page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const shared = parse('../src/components/chat/AttachmentLightbox.tsx');
  const declarations = ['onImageClick', 'beginPan', 'onPanMove', 'endPan']
    .map(name => `const ${name} = ${declaration(shared, name)};`).join('\n');
  await page.setContent('<div id="surface" style="position:absolute;left:200px;top:200px;width:100px;height:100px;touch-action:none"></div>');
  await page.addScriptTag({ content: compile(`(() => {
    let zoom = 2;
    let pan = { x: 0, y: 0 };
    const dragRef = { current: null };
    const suppressClickRef = { current: false };
    const setPan = next => { pan = next; };
    const zoomTo = next => { zoom = next; };
    ${declarations}
    const element = document.querySelector('#surface');
    for (const [event, handler] of Object.entries({ pointerdown: beginPan, pointermove: onPanMove, pointerup: endPan, pointercancel: endPan, click: onImageClick })) {
      element.addEventListener(event, handler);
    }
    window.sharedState = () => ({ zoom, pan, dragging: !!dragRef.current });
  })();`) });
  await page.mouse.move(250, 250);
  await page.mouse.down();
  await page.mouse.move(600, 450, { steps: 8 });
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.sharedState()), { zoom: 2, pan: { x: 350, y: 200 }, dragging: false });
  await page.mouse.click(250, 250);
  assert.equal(await page.evaluate(() => window.sharedState().zoom), 1, 'a subsequent click still toggles zoom');

  await page.close();
  page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const main = parse('../src/app/(chat)/supraspace/page.tsx');
  const modal = find(main, node => ts.isFunctionDeclaration(node) && node.name?.text === 'LightboxModal');
  const mainHandlers = ['handleMouseDown', 'handleMouseMove', 'handleMouseUp']
    .map(name => `const ${name} = ${declaration(modal, name)};`).join('\n');
  await page.setContent('<div id="viewer" style="position:absolute;left:200px;top:200px;width:100px;height:100px;touch-action:none"></div>');
  await page.addScriptTag({ content: compile(`(() => {
    const type = 'image';
    const zoom = 2;
    let offset = { x: 0, y: 0 };
    let isDragging = false;
    const dragRef = { current: null };
    const hasDraggedRef = { current: false };
    const setOffset = next => { offset = next; };
    const setIsDragging = next => { isDragging = next; };
    ${mainHandlers}
    const element = document.querySelector('#viewer');
    element.addEventListener('pointerdown', handleMouseDown);
    element.addEventListener('pointermove', handleMouseMove);
    element.addEventListener('pointerup', handleMouseUp);
    element.addEventListener('pointercancel', handleMouseUp);
    element.addEventListener('lostpointercapture', handleMouseUp);
    window.mainState = () => ({ offset, isDragging });
  })();`) });
  await page.mouse.move(250, 250);
  await page.mouse.down();
  await page.mouse.move(650, 500, { steps: 8 });
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.mainState()), { offset: { x: 400, y: 250 }, isDragging: false });
  console.log('Attachment pointer capture, panning, release, and post-drag click regression checks passed.');
} finally {
  await browser.close();
}
