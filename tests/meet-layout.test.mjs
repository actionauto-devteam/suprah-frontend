import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../src/lib/meet-layout.ts', import.meta.url));
const loaded = new Module(filename);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { pickMeetStage, splitMeetPeople } = loaded.exports;

const me = { attendeeId: 'a-me', crmUserId: 'u-me', name: 'Charl' };
const ana = { attendeeId: 'a-ana', crmUserId: 'u-ana', name: 'Ana' };
const ben = { attendeeId: 'a-ben', crmUserId: 'u-ben', name: 'Ben' };
const stage = (over) => pickMeetStage({
  people: [me, ana], selfId: me.attendeeId, pinnedId: null, activeSpeakerId: null,
  lastSpeakerId: null, layout: 'auto', hasContent: false, ...over,
});

test('alone in the meeting fills the screen with yourself', () => {
  const s = stage({ people: [me] });
  assert.equal(s.mode, 'spotlight');
  assert.equal(s.hero, me);
});

test('auto with one other person shows them big and you floating', () => {
  const s = stage({});
  assert.equal(s.mode, 'pip');
  assert.equal(s.hero, ana);
  assert.equal(s.self, me);
});

test('auto with three or more people uses the grid', () => {
  assert.equal(stage({ people: [me, ana, ben] }).mode, 'grid');
});

test('tiled always uses the equal grid', () => {
  assert.equal(stage({ layout: 'tiled' }).mode, 'grid');
  assert.equal(stage({ layout: 'tiled', people: [me, ana, ben] }).mode, 'grid');
});

test('spotlight and sidebar never pick yourself while others are here', () => {
  for (const layout of ['spotlight', 'sidebar']) {
    const s = stage({ layout, people: [me, ana, ben], activeSpeakerId: me.attendeeId });
    assert.equal(s.mode, layout);
    assert.notEqual(s.hero, me);
  }
});

test('spotlight follows the person talking, then keeps the last one', () => {
  assert.equal(stage({ layout: 'spotlight', people: [me, ana, ben], activeSpeakerId: ben.attendeeId }).hero, ben);
  assert.equal(stage({ layout: 'spotlight', people: [me, ana, ben], lastSpeakerId: ben.attendeeId }).hero, ben);
});

test('a pin wins over the speaker and turns auto or tiled into sidebar', () => {
  for (const layout of ['auto', 'tiled']) {
    const s = stage({ layout, people: [me, ana, ben], pinnedId: ana.attendeeId, activeSpeakerId: ben.attendeeId });
    assert.equal(s.mode, 'sidebar');
    assert.equal(s.hero, ana);
  }
});

test('you can pin yourself', () => {
  const s = stage({ pinnedId: me.attendeeId });
  assert.equal(s.mode, 'sidebar');
  assert.equal(s.hero, me);
});

test('a pin on someone hidden from the stage is ignored', () => {
  assert.equal(stage({ people: [me, ana, ben], pinnedId: 'a-gone' }).mode, 'grid');
});

test('screen sharing outranks every layout', () => {
  for (const layout of ['auto', 'tiled', 'spotlight', 'sidebar']) {
    assert.equal(stage({ layout, hasContent: true }).mode, 'content');
  }
});

test('no one on stage falls back to the empty grid', () => {
  const s = stage({ people: [] });
  assert.equal(s.mode, 'grid');
  assert.equal(s.hero, null);
});

const directory = [
  { crmUserId: 'u-me', fullName: 'Charl', department: 'Web Dev', isHost: true, joinedBefore: true },
  { crmUserId: 'u-ana', fullName: 'Ana', department: 'Sales', isHost: false, joinedBefore: true },
  { crmUserId: 'u-zed', fullName: 'Zed', department: 'Recon', isHost: false, joinedBefore: false },
  { crmUserId: 'u-amy', fullName: 'Amy', department: 'Sales', isHost: false, joinedBefore: false },
  { crmUserId: 'u-bo', fullName: 'Bo', department: 'Recon', isHost: false, joinedBefore: true },
];
const split = (over) => splitMeetPeople({
  roster: [ana, me], directory, hostCrmUserId: 'u-me', selfId: me.attendeeId, query: '', ...over,
});

test('people in the call are listed with you first', () => {
  const s = split({});
  assert.deepEqual(s.inMeeting.map((p) => p.name), ['Charl', 'Ana']);
});

test('invited people who are not in the call are listed, people who left first', () => {
  const s = split({});
  assert.equal(s.notInTotal, 3);
  assert.deepEqual(s.notInMeeting.map((p) => p.fullName), ['Bo', 'Amy', 'Zed']);
});

test('the host is listed first when they are not in the call', () => {
  const s = split({ roster: [ana] });
  assert.equal(s.notInMeeting[0].fullName, 'Charl');
});

test('search matches names and departments in both lists, counts stay total', () => {
  const s = split({ query: 'sales' });
  assert.deepEqual(s.inMeeting.map((p) => p.name), ['Ana']);
  assert.deepEqual(s.notInMeeting.map((p) => p.fullName), ['Amy']);
  assert.equal(s.notInTotal, 3);
});

test('guests are matched by their roster key', () => {
  const guest = { attendeeId: 'a-g', crmUserId: 'guest:g-1', name: 'Visitor' };
  const s = split({
    roster: [me, guest],
    directory: [...directory, { crmUserId: 'guest:g-1', fullName: 'Visitor', department: null, isHost: false, joinedBefore: true }],
  });
  assert.equal(s.notInMeeting.some((p) => p.crmUserId === 'guest:g-1'), false);
});

test('while the list is still loading nobody is shown as missing', () => {
  const s = split({ directory: null });
  assert.equal(s.notInTotal, 0);
  assert.deepEqual(s.notInMeeting, []);
});
