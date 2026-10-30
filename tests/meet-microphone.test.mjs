import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../src/hooks/useSuprahMeet.ts', import.meta.url));
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function createMeeting() {
  const cells = [];
  let cursor = 0;
  let muted = false;
  const calls = [];
  const requests = [];
  const observers = [];
  let presence;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
      return [cells[index], (value) => { cells[index] = typeof value === 'function' ? value(cells[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = { current: initial };
      return cells[index];
    },
    useCallback: (callback) => callback,
    useEffect() {},
  };
  const audio = new Proxy({
    allowUnmute: true,
    transcriptionController: { subscribeToTranscriptEvent() {}, unsubscribeFromTranscriptEvent() {} },
    realtimeMuteLocalAudio() { calls.push('mute'); muted = true; },
    realtimeUnmuteLocalAudio() { calls.push('unmute'); if (audio.allowUnmute) muted = false; return audio.allowUnmute; },
    realtimeIsLocalAudioMuted: () => muted,
    realtimeSubscribeToAttendeeIdPresence(callback) { presence = callback; },
    addObserver(observer) { observers.push(observer); },
    async listAudioInputDevices() { calls.push('list-mics'); return [{ deviceId: 'mic-1' }]; },
    async startAudioInput() { calls.push('acquire-mic'); },
    async startVideoInput(device) { calls.push(`start-camera:${device}`); },
    async listVideoInputDevices() { calls.push('list-cameras'); return []; },
    async stopAudioInput() { calls.push('stop-mic'); },
    async stopVideoInput() {},
    start() { calls.push('start-call'); },
    stop() { calls.push('stop-call'); },
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  class Stub {}
  const sdk = new Proxy({
    DefaultMeetingSession: class { constructor() { this.audioVideo = audio; } },
    LogLevel: { ERROR: 0 },
  }, { get: (target, key) => target[key] ?? Stub });
  const api = {
    async post(url, body, config) {
      calls.push(url);
      requests.push({ url, body, config });
      return { data: { data: {
        meeting: { participants: [], recording: { status: 'idle' } },
        self: { crmUserId: 'person', fullName: 'Taylor' },
        chime: { Meeting: {}, Attendee: { AttendeeId: 'self' } },
      } } };
    },
  };
  const loaded = new Module(filename);
  loaded.require = (name) => {
    if (name === 'react') return react;
    if (name === 'amazon-chime-sdk-js') return sdk;
    if (name === '@/lib/api-client') return { apiClient: api };
    if (name === '@/lib/meet-sounds') return { meetSounds: new Proxy({}, { get: () => () => {} }) };
    if (name === '@/lib/meet-captions') return { updateCaptionLines: (lines) => lines };
    if (name === '@/lib/meet-recent') return { rememberRecentMeet: () => {}, forgetRecentMeet: () => {} };
    throw new Error(`Unexpected import ${name}`);
  };
  loaded._compile(compiled, filename);
  const render = () => { cursor = 0; return loaded.exports.useSuprahMeet(); };
  return { render, calls, requests, api, audio, observers, presence: (...args) => presence(...args) };
}

test('the initial microphone control is muted', () => {
  assert.equal(createMeeting().render().micOn, false);
});

for (const guest of [undefined, { token: 'guest-pass' }]) {
  test(`${guest ? 'guest' : 'signed-in user'} joins muted before connecting without acquiring a mic`, async () => {
    const meeting = createMeeting();
    await meeting.render().join('MEET-1234', guest);
    assert.equal(meeting.render().phase, 'in');
    assert.equal(meeting.render().micOn, false);
    assert.ok(meeting.calls.indexOf('mute') < meeting.calls.indexOf('start-call'));
    assert.equal(meeting.calls.includes('list-mics'), false);
    assert.equal(meeting.calls.includes('list-cameras'), false);
    assert.equal(meeting.calls.includes('acquire-mic'), false);
    assert.equal(meeting.calls.includes('unmute'), false);
    meeting.presence('self', true, 'person#session');
    assert.equal(meeting.render().roster.self.muted, true);
  });
}

test('clicking unmute acquires the mic and clicking mute stops transmission', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  await meeting.render().toggleMic();
  assert.equal(meeting.render().micOn, true);
  assert.equal(meeting.calls.filter((call) => call === 'acquire-mic').length, 1);
  await meeting.render().toggleMic();
  assert.equal(meeting.render().micOn, false);
  await meeting.render().toggleMic();
  assert.equal(meeting.render().micOn, true);
  assert.equal(meeting.calls.filter((call) => call === 'acquire-mic').length, 1);
});

test('blocked microphone permission stays muted and can be retried', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  meeting.audio.startAudioInput = async () => { throw new Error('NotAllowedError'); };
  await meeting.render().toggleMic();
  assert.equal(meeting.render().micOn, false);
  assert.equal(meeting.calls.includes('unmute'), false);
  assert.match(meeting.render().notice, /permissions/);
  meeting.audio.startAudioInput = async () => {};
  await meeting.render().toggleMic();
  assert.equal(meeting.render().micOn, true);
});

test('missing microphone devices do not affect joining or unmute automatically', async () => {
  const meeting = createMeeting();
  meeting.audio.listAudioInputDevices = async () => [];
  await meeting.render().join('MEET-1234');
  await meeting.render().toggleMic();
  assert.equal(meeting.render().phase, 'in');
  assert.equal(meeting.render().micOn, false);
  assert.equal(meeting.calls.includes('unmute'), false);
});

test('a rejected SDK unmute does not show an active microphone', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  meeting.audio.allowUnmute = false;
  await meeting.render().toggleMic();
  assert.equal(meeting.render().micOn, false);
});

test('rapid repeated clicks acquire the mic only once', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  let allowMic;
  meeting.audio.startAudioInput = () => { meeting.calls.push('acquire-mic'); return new Promise((resolve) => { allowMic = resolve; }); };
  const first = meeting.render().toggleMic();
  await Promise.resolve();
  await meeting.render().toggleMic();
  allowMic();
  await first;
  assert.equal(meeting.calls.filter((call) => call === 'acquire-mic').length, 1);
  assert.equal(meeting.calls.filter((call) => call === 'unmute').length, 1);
});

test('leaving during a permission request never unmutes the departed session', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  let allowMic;
  meeting.audio.startAudioInput = () => new Promise((resolve) => { allowMic = resolve; });
  const pending = meeting.render().toggleMic();
  await Promise.resolve();
  await meeting.render().leave();
  allowMic();
  await pending;
  assert.equal(meeting.render().phase, 'ended');
  assert.equal(meeting.render().micOn, false);
  assert.equal(meeting.calls.includes('unmute'), false);
  assert.equal(meeting.calls.filter((call) => call === 'stop-mic').length, 2);
});

test('entering another meeting starts muted even after manually unmuting the previous one', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  await meeting.render().toggleMic();
  assert.equal(meeting.render().micOn, true);
  await meeting.render().leave();
  await meeting.render().join('MEET-5678');
  assert.equal(meeting.render().micOn, false);
  assert.equal(meeting.audio.realtimeIsLocalAudioMuted(), true);
});

test('camera activation still chooses the front camera without unmuting audio', async () => {
  const meeting = createMeeting();
  meeting.audio.listVideoInputDevices = async () => [
    { deviceId: 'back', label: 'Rear camera' }, { deviceId: 'front', label: 'Front camera' },
  ];
  await meeting.render().join('MEET-1234');
  await meeting.render().toggleCam();
  assert.equal(meeting.render().camOn, true);
  assert.equal(meeting.render().videoDeviceCount, 2);
  assert.ok(meeting.calls.includes('start-camera:front'));
  assert.equal(meeting.render().micOn, false);
  assert.equal(meeting.calls.includes('unmute'), false);
});

for (const guest of [undefined, { token: 'guest-pass' }]) {
  test(`${guest ? 'guest' : 'participant'} CC click immediately requests captions without host permission`, async () => {
    const meeting = createMeeting();
    await meeting.render().join('MEET-1234', guest);
    assert.equal(meeting.render().canEndForAll, false);
    meeting.render().toggleCaptions();
    assert.equal(meeting.render().captionsVisible, true);
    const request = meeting.requests.at(-1);
    assert.equal(request.url, guest ? '/api/crm/meet/guest/MEET-1234/captions' : '/api/crm/meet/meetings/MEET-1234/captions');
    assert.equal(request.body.enabled, true);
    if (guest) assert.equal(request.config.headers.Authorization, 'Bearer guest-pass');
    meeting.render().toggleCaptions();
    await Promise.resolve();
    assert.equal(meeting.render().captionsVisible, false);
    assert.equal(meeting.requests.filter((request) => request.body?.enabled === false).length, 0);
  });
}

test('caption failures offer retry to the participant without reopening a hidden panel', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  meeting.api.post = async () => { throw new Error('provider unavailable'); };
  meeting.render().toggleCaptions();
  await Promise.resolve();
  assert.equal(meeting.render().captionStatus, 'failed');
  meeting.api.post = async (url, body) => { meeting.requests.push({ url, body }); return { data: {} }; };
  await meeting.render().retryCaptions();
  assert.equal(meeting.requests.at(-1).body.retry, true);
  assert.equal(meeting.render().captionStatus, 'starting');
});

test('joining existing captions does not wait for a new start event during silence', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  meeting.api.post = async () => ({ data: { data: { reused: true } } });
  meeting.render().toggleCaptions();
  await Promise.resolve();
  assert.equal(meeting.render().captionStatus, 'on');
});

for (const options of [undefined, { token: 'guest-pass' }]) {
  test(`${options ? 'guest room' : 'full room and Mini Meet'} receives the server closure reason on heartbeat expiry`, async () => {
    const meeting = createMeeting();
    await meeting.render().join('MEET-1234', options);
    const originalPost = meeting.api.post;
    meeting.api.post = async (url, ...args) => {
      if (url.endsWith('/heartbeat')) throw { response: { status: 410, data: { message: 'This meeting closed because everyone left.' } } };
      return originalPost(url, ...args);
    };
    meeting.presence('other', true, 'other#device');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(meeting.render().phase, 'ended');
    assert.equal(meeting.render().endedReason, 'This meeting closed because everyone left.');
  });
}
test('a delayed expiry response from the previous room cannot end a new session', async () => {
  const meeting = createMeeting();
  await meeting.render().join('MEET-1234');
  const originalPost = meeting.api.post;
  let rejectHeartbeat;
  meeting.api.post = async (url, ...args) => {
    if (url.endsWith('/heartbeat')) return new Promise((_resolve, reject) => { rejectHeartbeat = reject; });
    return originalPost(url, ...args);
  };
  meeting.presence('other', true, 'other#device');
  await meeting.render().join('MEET-5678');
  rejectHeartbeat({ response: { status: 410 } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(meeting.render().phase, 'in');
  assert.equal(meeting.render().endedReason, null);
});
