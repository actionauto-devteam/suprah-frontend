import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function ast(file) {
  return ts.createSourceFile(file, fs.readFileSync(new URL(file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function find(root, predicate) {
  let found;
  function visit(node) {
    if (!found && predicate(node)) found = node;
    if (!found) ts.forEachChild(node, visit);
  }
  visit(root);
  assert.ok(found, 'Expected production handler');
  return found;
}
function run(source, context) {
  return vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, context);
}

// Strict Mode and install-state updates both clean up the first timer.
// Re-running the real effect must retain the URL request until a hint is shown.
const install = ast('../src/components/supraspace/InstallSupraSpaceButton.tsx');
const effect = find(install, n => ts.isCallExpression(n) && n.expression.getText(install) === 'React.useEffect' && n.arguments[0]?.getText(install).includes('const autoInstallRequested'));
let timer;
let hints = 0;
let requests = 0;
const location = { href: 'https://space.suprah-app.com/supraspace?install=1&other=ok', get search() { return new URL(this.href).search; } };
const historyState = { key: 'router-state' };
const context = {
  URL, URLSearchParams, window: { location, history: { state: historyState, replaceState(state, _, url) { assert.equal(state, historyState); location.href = url; } } },
  autoTriggeredRef: { current: false }, installed: false, alreadyInstalledElsewhere: false,
  autoInstallPromptDisabled: false, deferredPrompt: null,
  setShowHint: () => hints++, slot: { request: () => requests++ },
  setTimeout: fn => { timer = fn; return 1; }, clearTimeout: () => { timer = null; },
};
const startEffect = () => run(`(${effect.arguments[0].getText(install)})()`, context);
let cleanup = startEffect();
cleanup();
assert.ok(location.search.includes('install=1'));
cleanup = startEffect();
timer();
assert.equal(hints, 1);
assert.equal(requests, 1);
assert.equal(location.search, '?other=ok');
cleanup();
startEffect();
assert.equal(hints, 1);
// A deferred browser prompt still requires a user gesture: show the hint first.
location.href = 'https://space.suprah-app.com/?install=1';
context.autoTriggeredRef.current = false;
context.deferredPrompt = { prompt() { assert.fail('Install prompt needs a click'); } };
startEffect();
assert.equal(hints, 2);

for (const file of ['../src/app/(chat)/supraspace/page.tsx', '../src/components/supraspace/ChatPopupManager.tsx']) {
  const source = ast(file);
  const declaration = find(source, n => ts.isVariableDeclaration(n) && n.name.getText(source) === 'startRecording');
  const cleanupEffect = find(source, n => ts.isCallExpression(n) && n.expression.getText(source) === 'React.useEffect' && n.arguments[0]?.getText(source).includes('recRequestRef.current += 1'));
  let resolvePermission;
  let stopped = 0;
  let recorderStopped = 0;
  let errors = 0;
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  const refs = {
    recStartingRef: { current: false }, recRequestRef: { current: 0 },
    mediaRecorderRef: { current: null }, recStreamRef: { current: null },
    recTimerRef: { current: null }, recSendIntentRef: { current: { sendRequested: true } },
  };
  const scope = {
    ...refs, React: { useCallback: fn => fn }, isReadOnlyConversation: false,
    conv: { _id: 'chat-a' }, activeId: 'chat-a', crmToken: 'token',
    navigator: { mediaDevices: { getUserMedia: () => new Promise(resolve => { resolvePermission = resolve; }) } },
    setRecording() {}, clearInterval() {},
    setSupraSpaceVoiceRecordingSendIntent: (intent, send) => { intent.sendRequested = send; },
    toast: { error: () => errors++ }, showUploadNotice: () => errors++,
    getSupportedSupraSpaceVoiceMimeType: () => { throw new Error('Recorder initialization failed'); },
  };
  const start = run(`(${declaration.initializer.getText(source)})`, scope);
  const pending = start();
  await start(); // A second click must not request another microphone.
  assert.equal(refs.recRequestRef.current, 1);
  const cancel = run(`(${cleanupEffect.arguments[0].getText(source)})()`, scope);
  cancel();
  resolvePermission(stream);
  await pending;
  assert.equal(stopped, 1, `${file}: late permission stream released`);
  assert.equal(refs.recStreamRef.current, null);
  assert.equal(errors, 0);
  const failedStart = start();
  resolvePermission(stream);
  await failedStart;
  assert.equal(stopped, 2, `${file}: initialization failure releases stream`);
  assert.equal(errors, 1);
  assert.equal(refs.recStartingRef.current, false);
  refs.mediaRecorderRef.current = { state: 'recording', stop: () => recorderStopped++ };
  refs.recSendIntentRef.current.sendRequested = true;
  cancel();
  assert.equal(recorderStopped, 1);
  assert.equal(refs.recSendIntentRef.current.sendRequested, false, 'Leaving never sends a recording');
  refs.mediaRecorderRef.current = { state: 'inactive', stop: () => assert.fail('Already stopped') };
  refs.recSendIntentRef.current.sendRequested = true;
  cancel();
  assert.equal(refs.recSendIntentRef.current.sendRequested, true, 'Leaving preserves an explicitly submitted recording awaiting its stop event');
}

const main = ast('../src/app/(chat)/supraspace/page.tsx');
const player = find(main, n => ts.isFunctionDeclaration(n) && n.name?.text === 'VoicePlayer');
const React = {
  useRef: () => ({ current: null }), useState: initial => [initial, () => {}], useCallback: fn => fn,
  createElement: (type, props, ...children) => ({ type, props, children }),
};
const render = run(`${player.getText(main)}; VoicePlayer`, {
  React, useSupraSpaceMessenger: () => ({ crmToken: 'crm token' }),
  process: { env: {} }, cn: () => '', Play: 'Play', Pause: 'Pause', Loader2: 'Loader2', fmtDuration: () => '0:00',
});
function audio(node) {
  if (node?.type === 'audio') return node;
  for (const child of node?.children || []) { const result = audio(child); if (result) return result; }
}
assert.equal(audio(render({ convId: 'a', msgId: 'b', own: false, sourceUrl: 'https://storage.test/second-audio?signed=yes' })).props.src, 'https://storage.test/second-audio?signed=yes');
assert.ok(audio(render({ convId: 'a', msgId: 'b', own: false })).props.src.endsWith('/messages/b/voice?t=crm%20token'));
console.log('SupraSpace install lifecycle, recording cleanup, and audio attachment regression checks passed.');

const cache = ast('../src/lib/supraspace-cache.ts');
const normalize = find(cache, n => ts.isFunctionDeclaration(n) && n.name?.text === 'normalizeSnapshot');
const normalizeCache = run(`${normalize.getText(cache)}; normalizeSnapshot`, {
  MAX_CONVERSATIONS: 100, MAX_MESSAGE_CONVERSATIONS: 16, MAX_MESSAGES_PER_CONVERSATION: 50,
});
const cached = normalizeCache({
  userId: 'user', conversations: [{ _id: 'long' }, { _id: 'short' }, { _id: 'paged' }],
  messages: { long: Array.from({ length: 75 }, (_, i) => ({ _id: String(i) })), short: [{ _id: 'one' }], paged: [{ _id: 'two' }] },
  hasMore: { long: false, short: false, paged: true },
});
assert.equal(cached.messages.long.length, 50);
assert.equal(cached.messages.long[0]._id, '25');
assert.equal(cached.hasMore.long, true, 'Truncated history must remain pageable after cache restore');
assert.equal(cached.hasMore.short, false);
assert.equal(cached.hasMore.paged, true);
console.log('SupraSpace cached-history pagination regression checks passed.');

const clickDeclaration = find(install, n => ts.isVariableDeclaration(n) && n.name.getText(install) === 'handleClick');
let cleared = 0;
let released = 0;
let hintVisible;
const clickScope = {
  deferredPrompt: { prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) },
  setDeferredPrompt: value => { assert.equal(value, null); cleared++; },
  setShowHint: value => { hintVisible = value; },
  slot: { request: () => requests++, release: () => released++ },
};
await run(`(${clickDeclaration.initializer.getText(install)})()`, clickScope);
assert.equal(cleared, 1);
assert.equal(released, 1);
assert.equal(hintVisible, false);
clickScope.deferredPrompt = { prompt: async () => { throw new Error('Expired install prompt'); } };
await run(`(${clickDeclaration.initializer.getText(install)})()`, clickScope);
assert.equal(cleared, 2);
assert.equal(hintVisible, true, 'Rejected install prompts fall back to instructions');
console.log('SupraSpace native install prompt failure recovery checks passed.');
