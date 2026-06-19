// Notification sound system using Web Audio API — no audio files required

const STORAGE_KEY = 'ss_sound_enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === 'true'; // default ON
}

export function setSoundEnabled(val: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(val));
  window.dispatchEvent(new CustomEvent('ss_sound_changed', { detail: val }));
}

function makeCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

// Short two-tone ding for new messages (Discord-style)
export function playMessageSound(): void {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  const ctx = makeCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.linearRampToValueAtTime(1100, now + 0.12);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.32, now + 0.02);
  gain.gain.setValueAtTime(0.32, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.start(now);
  osc.stop(now + 0.45);
  osc.onended = () => { try { ctx.close(); } catch {} };
}

// Repeating dual-tone ringtone for incoming calls
let _callCtx: AudioContext | null = null;
let _callTimer: ReturnType<typeof setTimeout> | null = null;

function _ring(ctx: AudioContext, at: number): void {
  const dur = 0.5;
  [480, 620].forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.38, at + 0.04);
    gain.gain.setValueAtTime(0.38, at + dur - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.start(at);
    osc.stop(at + dur);
  });
}

export function playCallSound(): void {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  stopCallSound();
  const ctx = makeCtx();
  if (!ctx) return;
  _callCtx = ctx;

  const cycle = () => {
    if (_callCtx !== ctx) return;
    const now = ctx.currentTime;
    _ring(ctx, now);
    _ring(ctx, now + 0.7);
    _callTimer = setTimeout(cycle, 2400);
  };
  cycle();
}

export function stopCallSound(): void {
  if (_callTimer) { clearTimeout(_callTimer); _callTimer = null; }
  if (_callCtx) { try { _callCtx.close(); } catch {} _callCtx = null; }
}
