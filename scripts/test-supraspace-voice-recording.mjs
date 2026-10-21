import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import typescript from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/supraspace-voice-recording.ts', import.meta.url), 'utf8');
const compiled = typescript.transpileModule(source, {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
}).outputText;
function loadVoiceRecordingModule(MediaRecorder) {
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports, MediaRecorder });
  return loadedModule.exports;
}

const { createSupraSpaceVoiceRecordingIntent, setSupraSpaceVoiceRecordingSendIntent, getSupportedSupraSpaceVoiceMimeType } = loadVoiceRecordingModule();

const intent = createSupraSpaceVoiceRecordingIntent();
assert.equal(intent.sendRequested, false);
setSupraSpaceVoiceRecordingSendIntent(intent, true);
assert.equal(intent.sendRequested, true);
setSupraSpaceVoiceRecordingSendIntent(intent, false);
assert.equal(intent.sendRequested, false);
setSupraSpaceVoiceRecordingSendIntent(null, true);
assert.equal(getSupportedSupraSpaceVoiceMimeType(), undefined);
assert.equal(loadVoiceRecordingModule({ isTypeSupported: type => type === 'audio/mp4' }).getSupportedSupraSpaceVoiceMimeType(), 'audio/mp4');
assert.equal(loadVoiceRecordingModule({ isTypeSupported: type => type === 'audio/webm' }).getSupportedSupraSpaceVoiceMimeType(), 'audio/webm');
console.log('SupraSpace voice-recording intent regression checks passed.');
