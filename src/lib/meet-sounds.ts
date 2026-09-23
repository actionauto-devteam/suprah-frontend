"use client";

/** Tiny WebAudio synth for Suprah Meet UI sounds — no audio files needed. */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, startIn: number, duration: number, volume = 0.12, type: OscillatorType = "sine") {
  const audio = ac();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const t0 = audio.currentTime + startIn;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const meetSounds = {
  reaction() { tone(880, 0, 0.12, 0.1, "triangle"); tone(1320, 0.06, 0.14, 0.08, "triangle"); },
  hand()     { tone(660, 0, 0.15, 0.12); tone(990, 0.14, 0.2, 0.12); },
  chat()     { tone(1180, 0, 0.08, 0.07, "square"); },
  join()     { tone(523, 0, 0.12, 0.09); tone(784, 0.1, 0.16, 0.09); },
  leave()    { tone(784, 0, 0.12, 0.08); tone(523, 0.1, 0.16, 0.08); },
  recording(){ tone(440, 0, 0.25, 0.1, "sawtooth"); },
  alert()    { tone(740, 0, 0.15, 0.12); tone(740, 0.22, 0.15, 0.12); },
};