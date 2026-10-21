import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const filename = fileURLToPath(new URL('../src/lib/meet-captions.ts', import.meta.url));
const loaded = new Module(filename);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { updateCaptionLines } = loaded.exports;
const componentFile = fileURLToPath(new URL('../src/components/suprah-meet/MeetCaptions.tsx', import.meta.url));
const component = new Module(componentFile);
component.paths = Module._nodeModulePaths(path.dirname(componentFile));
const originalRequire = component.require.bind(component);
component.require = (name) => name === '@/lib/meet-captions' ? loaded.exports
  : name === '@/lib/utils' ? { cn: (...classes) => classes.filter(Boolean).join(' ') } : originalRequire(name);
component._compile(ts.transpileModule(fs.readFileSync(componentFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, componentFile);
const event = (id, text, partial = true, items = []) => ({ results: [{
  resultId: id, isPartial: partial, startTimeMs: 1, endTimeMs: 2,
  alternatives: [{ transcript: text, items }],
}] });

test('partial revisions replace the displayed phrase and final results resist stale partials', () => {
  let lines = updateCaptionLines([], event('r1', 'Good'), 100);
  lines = updateCaptionLines(lines, event('r1', 'Good morning'), 200);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, 'Good morning');
  lines = updateCaptionLines(lines, event('r1', 'Good morning.', false), 300);
  lines = updateCaptionLines(lines, event('r1', 'Good morning', true), 400);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, 'Good morning.');
  assert.equal(lines[0].partial, false);
});

test('words from different speakers are separated instead of misattributed', () => {
  const lines = updateCaptionLines([], event('r1', 'Hello there. Hi!', false, [
    { content: 'Hello', attendee: { attendeeId: 'a1', externalUserId: 'person1#session' } },
    { content: 'there', attendee: { attendeeId: 'a1', externalUserId: 'person1#session' } },
    { content: '.' },
    { content: 'Hi', attendee: { attendeeId: 'a2', externalUserId: 'person2#session' } },
    { content: '!' },
  ]), 100);
  assert.deepEqual(lines.map((line) => [line.speakerId, line.text]), [['person1', 'Hello there.'], ['person2', 'Hi!']]);
});

test('unknown speakers never inherit the identity of the previous speaker', () => {
  const lines = updateCaptionLines([], event('r1', 'Hello Hi', true, [
    { content: 'Hello', attendee: { attendeeId: 'a1', externalUserId: 'person1#session' } },
    { content: 'Hi', attendee: { attendeeId: 'unknown' } },
  ]), 100);
  assert.equal(lines[1].speakerId, '');
});

test('a corrected partial removes obsolete speaker segments', () => {
  const old = updateCaptionLines([], event('r1', 'Hello Hi', true, [
    { content: 'Hello', attendee: { attendeeId: 'a1' } },
    { content: 'Hi', attendee: { attendeeId: 'a2' } },
  ]), 100);
  const lines = updateCaptionLines(old, event('r1', 'Hello there', false, [
    { content: 'Hello there', attendee: { attendeeId: 'a1' } },
  ]), 200);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, 'Hello there');
});

test('status events and empty alternatives do not erase the current caption', () => {
  const current = updateCaptionLines([], event('r1', 'Hello'), 100);
  assert.deepEqual(updateCaptionLines(current, { type: 'started' }, 200), current);
  assert.deepEqual(updateCaptionLines(current, event('r2', ' '), 200), current);
  assert.deepEqual(updateCaptionLines(current, { results: [{ resultId: 'empty', alternatives: [] }] }, 200), current);
});

test('caption memory stays bounded during long meetings', () => {
  let lines = [];
  for (let i = 0; i < 100; i++) lines = updateCaptionLines(lines, event(`r${i}`, `Sentence ${i}`, false), i);
  assert.equal(lines.length, 20);
  assert.equal(lines.at(-1).text, 'Sentence 99');
});

test('an out-of-order partial in the same batch cannot overwrite finalized text', () => {
  const batch = { results: [...event('r1', 'Finished.', false).results, ...event('r1', 'Finished', true).results] };
  assert.equal(updateCaptionLines([], batch, 100)[0].text, 'Finished.');
});

const meet = {
  captionsVisible: true, captionStatus: 'off', captionLanguage: 'en-US', captionLines: [],
  canEndForAll: false, captionBusy: false, roster: {}, meeting: { participants: [] }, toggleCaptions() {},
};

test('participants can show captions without being offered shared start/stop controls', () => {
  const html = renderToStaticMarkup(React.createElement(component.exports.MeetCaptionsPanel, { meet }));
  assert.match(html, /Waiting for the host/);
  assert.doesNotMatch(html, /Start live captions<|Stop live captions|<select/);
});

test('only the host sees shared transcription controls, with English clearly labeled', () => {
  const html = renderToStaticMarkup(React.createElement(component.exports.MeetCaptionsPanel, { meet: { ...meet, canEndForAll: true } }));
  assert.match(html, /Start live captions<\/button>/);
  assert.match(html, /English \(US\)/);
  assert.doesNotMatch(html, /<select/);
});

test('visible captions render the correct speaker and escape transcript markup', () => {
  const html = renderToStaticMarkup(React.createElement(component.exports.MeetCaptionsPanel, { meet: {
    ...meet, captionStatus: 'on', captionLines: [{ id: 'r1', attendeeId: 'a1', speakerId: 'p1', text: '<script>hello</script>' }],
    roster: { a1: { attendeeId: 'a1', crmUserId: 'p1', name: 'Taylor' } },
  } }));
  assert.match(html, /Taylor:/);
  assert.match(html, /&lt;script&gt;hello&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('turning off local captions hides the panel and retains an accessible toggle', () => {
  const hidden = { ...meet, captionsVisible: false };
  assert.equal(renderToStaticMarkup(React.createElement(component.exports.MeetCaptionsPanel, { meet: hidden })), '');
  const button = renderToStaticMarkup(React.createElement(component.exports.MeetCaptionsButton, { meet: hidden }));
  assert.match(button, /aria-pressed="false"/);
  assert.match(button, /aria-label="Show captions"/);
});
