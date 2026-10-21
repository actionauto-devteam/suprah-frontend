import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import typescript from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/supraspace-voice-recording.ts', import.meta.url), 'utf8');
const compiled = typescript.transpileModule(source, {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
}).outputText;
const loadedModule = { exports: {} };
vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports });
const { createSupraSpaceVoiceRecordingIntent, setSupraSpaceVoiceRecordingSendIntent } = loadedModule.exports;

const intent = createSupraSpaceVoiceRecordingIntent();
assert.equal(intent.sendRequested, false);
setSupraSpaceVoiceRecordingSendIntent(intent, true);
assert.equal(intent.sendRequested, true);
setSupraSpaceVoiceRecordingSendIntent(intent, false);
assert.equal(intent.sendRequested, false);
setSupraSpaceVoiceRecordingSendIntent(null, true);
console.log('SupraSpace voice-recording intent regression checks passed.');
