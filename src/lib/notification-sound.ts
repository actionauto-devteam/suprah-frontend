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

// ── Shared AudioContext (singleton) ────────────────────────────────────────────
// Created lazily; unlocked on first user gesture via unlockAudio().
// Browsers block audio.play() in socket event handlers (no user gesture) —
// using a pre-unlocked context bypasses that restriction entirely.

let _ctx: AudioContext | null = null;
let _notifBuf: AudioBuffer | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
  }
  return _ctx;
}

async function ensureNotifBuf(): Promise<void> {
  const ctx = getCtx();
  if (!ctx || _notifBuf) return;
  try {
    const res = await fetch("/sounds/universfield-new-notification.wav");
    const arr = await res.arrayBuffer();
    _notifBuf = await ctx.decodeAudioData(arr);
  } catch {}
}

// Must be called inside a user-gesture handler (click/keydown) so the
// AudioContext transitions from 'suspended' → 'running'. After that,
// playMessageSound() works even in socket event handlers (no gesture needed).
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  const ctx = getCtx();
  if (!ctx) return;
  ctx.resume()
    .then(() => ensureNotifBuf())
    .catch(() => {});
}

export function playMessageSound(): void {
  if (!isSoundEnabled() || typeof window === 'undefined') return;

  const ctx = getCtx();
  if (ctx && _notifBuf && ctx.state === 'running') {
    try {
      const src = ctx.createBufferSource();
      src.buffer = _notifBuf;
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      return;
    } catch {}
  }

  // Fallback: HTML Audio element (works if browser policy allows it)
  try {
    const a = new Audio('/sounds/notification.wav');
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch {}
}

// ── Repeating dual-tone ringtone for incoming calls ────────────────────────────
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
  // Prefer the shared context (already unlocked) for call sounds too
  const shared = getCtx();
  const ctx = shared && shared.state === 'running' ? shared : (() => {
    try { return new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  })();
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
  // Only close if it's a separate context, not the shared one
  if (_callCtx && _callCtx !== _ctx) { try { _callCtx.close(); } catch {} }
  _callCtx = null;
}

// ─── Shift Alerts dedicated warning sound ─────────────────────────────────────
// Plain HTML Audio (not the shared AudioContext buffer above) since this file
// is user-supplied and may change — see public/sounds/warning_sound.wav. Capped
// at 5s and never looped: even if the source file runs longer, playback is cut
// off so it can't turn into a continuous alarm.
const SHIFT_ALERT_SOUND_MAX_MS = 5000;
let _shiftAlertAudio: HTMLAudioElement | null = null;
let _shiftAlertStopTimer: ReturnType<typeof setTimeout> | null = null;

export function playShiftAlertSound(soundFile = '/sounds/warning_sound.wav'): void {
  if (!isSoundEnabled() || typeof window === 'undefined') return;

  if (_shiftAlertStopTimer) { clearTimeout(_shiftAlertStopTimer); _shiftAlertStopTimer = null; }
  if (_shiftAlertAudio) { try { _shiftAlertAudio.pause(); } catch {} }

  try {
    const audio = new Audio(soundFile);
    audio.loop = false;
    audio.volume = 0.8;
    _shiftAlertAudio = audio;
    audio.play().catch(() => {});
    _shiftAlertStopTimer = setTimeout(() => {
      try { audio.pause(); audio.currentTime = 0; } catch {}
    }, SHIFT_ALERT_SOUND_MAX_MS);
  } catch {}
}

// ─── Over-break alarm (repeating, until the user resumes) ─────────────────────
// Deliberately DOES loop, unlike playShiftAlertSound above — once a break has
// gone past the admin-escalation limit (1h05m — see BREAK_ADMIN_NOTIFY_SECONDS
// in crmTimeproof.controller.ts), the point is a persistent nudge for the
// affected user specifically, not a one-off ping. Only reachable while the
// TimeProof Clock page itself is open (same fundamental limitation as any
// other in-app sound); the caller is responsible for stopping it the moment
// the user resumes their shift.
let _overBreakAudio: HTMLAudioElement | null = null;

export function playOverBreakAlarm(soundFile = '/sounds/warning_sound.wav'): void {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  if (_overBreakAudio) return; // already playing — don't restart/stack a second loop

  try {
    const audio = new Audio(soundFile);
    audio.loop = true;
    audio.volume = 0.8;
    _overBreakAudio = audio;
    audio.play().catch(() => {});
  } catch {}
}

export function stopOverBreakAlarm(): void {
  if (!_overBreakAudio) return;
  try { _overBreakAudio.pause(); _overBreakAudio.currentTime = 0; } catch {}
  _overBreakAudio = null;
}

// ─── Browser (OS-level) notifications ─────────────────────────────────────────

export async function requestNotifPermission(): Promise<void> {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission().catch(() => {});
  }
}

// Primary notification path — uses ServiceWorkerRegistration.showNotification()
// which works on mobile PWA, plays the OS notification sound, and vibrates on
// Android. Falls back to new Notification() if no active SW is found (e.g. dev
// mode where the SW is disabled).
export async function showNotificationViaSW(
  title: string,
  options: { body?: string; tag?: string; url?: string } = {}
): Promise<void> {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  // Try SW-based notification first (proper PWA path).
  // navigator.serviceWorker.ready is far more reliable than getRegistration('/')
  // because it always resolves to the *active* registration regardless of scope.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('sw-timeout')), 3000)),
      ]) as ServiceWorkerRegistration;
      if (reg) {
        await reg.showNotification(title, {
          body: options.body,
          tag: options.tag,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          silent: false,
          vibrate: [200, 100, 200],
          data: { url: options.url ?? '/crm/supra-space' },
        } as NotificationOptions);
        return;
      }
    } catch {}
  }

  // Fallback: direct Notification API (desktop browser without SW)
  try {
    const targetUrl = options.url ?? '/crm/supra-space';
    const notif = new Notification(title, {
      icon: '/favicon.ico',
      body: options.body,
      tag: options.tag,
      silent: false,
    });
    notif.onclick = () => {
      window.focus();
      window.location.assign(targetUrl);
      notif.close();
    };
  } catch {}
}

// Legacy export kept for any callers still referencing it
export function showBrowserNotification(
  title: string,
  options: { body?: string; icon?: string; tag?: string; requireInteraction?: boolean; silent?: boolean } = {}
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
