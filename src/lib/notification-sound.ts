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

export function playMessageSound(): void {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  try {
    const audio = new Audio('/sounds/notification.wav');
    audio.volume = 0.6;
    audio.play().catch(() => { /* autoplay blocked in background tab */ });
  } catch { /* no-op */ }
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

// ─── Browser (OS-level) notifications ─────────────────────────────────────────
// These appear even when the user is on another tab or another window.

export async function requestNotifPermission(): Promise<void> {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission().catch(() => {});
  }
}

export function showBrowserNotification(
  title: string,
  options: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    silent?: boolean;
  } = {}
): Notification | null {
  if (typeof Notification === 'undefined') return null;
  if (Notification.permission !== 'granted') return null;
  try {
    const notif = new Notification(title, {
      icon: options.icon ?? '/favicon.ico',
      body: options.body,
      tag: options.tag,
      requireInteraction: options.requireInteraction ?? false,
      silent: options.silent ?? false,
    });
    notif.onclick = () => { window.focus(); notif.close(); };
    return notif;
  } catch {
    return null;
  }
}
