const SM5_CSS = `
/* ── Theme tokens ─────────────────────────────────────────────────────── */
.sm5[data-theme="dark"] {
  --bg-base:#0e0f11; --bg-elevated:#141618; --bg-hover:rgba(255,255,255,0.04);
  --bg-active:rgba(255,255,255,0.07); --surface-1:#1e2126; --surface-2:#252a31;
  --border-1:rgba(255,255,255,0.06); --border-2:rgba(255,255,255,0.10); --border-3:rgba(255,255,255,0.14);
  --accent:#34c97d; --accent-muted:rgba(52,201,125,0.14); --accent-hover:#3fd98b; --accent-text:#7be3ad;
  --accent-ring:rgba(52,201,125,0.25);
  --blue:#5b7cf6; --blue-muted:rgba(91,124,246,0.14);
  --danger:#f05c5c; --danger-muted:rgba(240,92,92,0.12); --warning:#f0a855;
  --text-primary:rgba(255,255,255,0.92); --text-secondary:rgba(255,255,255,0.52);
  --text-tertiary:rgba(255,255,255,0.28); --text-disabled:rgba(255,255,255,0.16);
  --bubble-own-bg:linear-gradient(145deg,#169a58,#34c97d); --bubble-own-shadow:0 4px 20px rgba(52,201,125,0.22);
  --bubble-other-bg:var(--surface-2); --bubble-other-border:var(--border-2);
  --input-bg:var(--surface-1); --input-border:rgba(255,255,255,0.10); --input-focus:rgba(52,201,125,0.32);
  --scrollbar:rgba(255,255,255,0.07);
  --shadow-md:0 4px 16px rgba(0,0,0,0.5),0 2px 6px rgba(0,0,0,0.3);
  --shadow-lg:0 20px 60px rgba(0,0,0,0.7),0 8px 24px rgba(0,0,0,0.4);
  --topbar-bg:rgba(20,22,24,0.85);
}
.sm5[data-theme="light"] {
  --bg-base:#f4f5f7; --bg-elevated:#ffffff; --bg-hover:rgba(0,0,0,0.03);
  --bg-active:rgba(52,201,125,0.08); --surface-1:#ffffff; --surface-2:#f4f5f7;
  --border-1:rgba(0,0,0,0.06); --border-2:rgba(0,0,0,0.09); --border-3:rgba(0,0,0,0.14);
  --accent:#16a34a; --accent-muted:rgba(22,163,74,0.10); --accent-hover:#128a3f; --accent-text:#16a34a;
  --accent-ring:rgba(22,163,74,0.22);
  --blue:#4a6cf0; --blue-muted:rgba(74,108,240,0.1);
  --danger:#dc3545; --danger-muted:rgba(220,53,69,0.08); --warning:#e0922a;
  --text-primary:rgba(0,0,0,0.87); --text-secondary:rgba(0,0,0,0.50);
  --text-tertiary:rgba(0,0,0,0.32); --text-disabled:rgba(0,0,0,0.20);
  --bubble-own-bg:linear-gradient(145deg,#16a34a,#34c97d); --bubble-own-shadow:0 3px 14px rgba(22,163,74,0.22);
  --bubble-other-bg:#ffffff; --bubble-other-border:rgba(0,0,0,0.09);
  --input-bg:#ffffff; --input-border:rgba(0,0,0,0.1); --input-focus:rgba(22,163,74,0.3);
  --scrollbar:rgba(0,0,0,0.1);
  --shadow-md:0 4px 16px rgba(0,0,0,0.1),0 2px 6px rgba(0,0,0,0.06);
  --shadow-lg:0 20px 60px rgba(0,0,0,0.2),0 8px 24px rgba(0,0,0,0.1);
  --topbar-bg:rgba(255,255,255,0.85);
}

/* ── Base ─────────────────────────────────────────────────────────────── */
.sm5 { font-family:'Geist',-apple-system,BlinkMacSystemFont,sans-serif; background:var(--bg-base); color:var(--text-primary); -webkit-font-smoothing:antialiased; }
.sm5-display { font-family:'Cabinet Grotesk','Geist',sans-serif; }
.sm5-mono { font-family:'Geist Mono',monospace; }
.sm5 :focus-visible { outline:2px solid var(--accent); outline-offset:2px; border-radius:6px; }

/* ── Surfaces ─────────────────────────────────────────────────────────── */
.sm5-topbar { background:var(--topbar-bg); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-bottom:1px solid var(--border-1); }
.sm5-rail { background:var(--bg-elevated); border-right:1px solid var(--border-1); }
/* One shared toolbar height keeps the Compose button, search bar, and
   reading-pane title on the same baseline with a continuous divider. */
.sm5-toolbar { height:54px; display:flex; align-items:center; border-bottom:1px solid var(--border-1); flex-shrink:0; }
.sm5-overlay { background:rgba(0,0,0,0.6); backdrop-filter:blur(12px); }
.sm5-modal { background:var(--bg-elevated); border:1px solid var(--border-2); border-radius:16px; box-shadow:var(--shadow-lg); }

/* ── Controls ─────────────────────────────────────────────────────────── */
.sm5-input { background:var(--input-bg); border:1px solid var(--input-border); color:var(--text-primary); border-radius:8px; transition:border-color .15s, box-shadow .15s; }
.sm5-input::placeholder { color:var(--text-tertiary); }
.sm5-input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--input-focus); }

.sm5-btn { background:var(--accent); color:#fff; border-radius:10px; transition:all .15s; box-shadow:0 2px 8px var(--accent-ring); font-weight:600; }
.sm5-btn:hover:not(:disabled) { background:var(--accent-hover); transform:translateY(-1px); }
.sm5-btn:disabled { opacity:.45; cursor:not-allowed; box-shadow:none; }

.sm5-icon-btn { border-radius:8px; color:var(--text-tertiary); transition:all .15s; display:flex; align-items:center; justify-content:center; }
.sm5-icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
.sm5-icon-btn:disabled { opacity:.4; cursor:not-allowed; }

.sm5-pill { border-radius:8px; border:1px solid var(--border-2); background:var(--bg-hover); color:var(--text-secondary); transition:all .15s; }
.sm5-pill:hover:not(:disabled) { background:var(--bg-active); color:var(--text-primary); }
.sm5-pill:disabled { opacity:.45; cursor:not-allowed; }

/* ── Inbox rows ───────────────────────────────────────────────────────── */
.sm5-label-row { border-radius:9px; cursor:pointer; transition:background .15s; }
.sm5-label-row:hover { background:var(--bg-hover); }
.sm5-label-active { background:var(--accent-muted)!important; color:var(--accent-text)!important; font-weight:700; }
.sm5-msg-row { border-bottom:1px solid var(--border-1); cursor:pointer; transition:background .12s; }
.sm5-msg-row:hover { background:var(--bg-hover); }
.sm5-msg-row-active { background:var(--accent-muted)!important; }

/* ── Tabs ─────────────────────────────────────────────────────────────── */
.sm5-tab-bar { background:rgba(127,127,127,0.08); border-radius:10px; padding:3px; }
.sm5-tab { border-radius:8px; font-weight:600; letter-spacing:.03em; transition:all .15s; color:var(--text-secondary); }
.sm5-tab-active { background:var(--accent); color:#fff; box-shadow:0 2px 8px var(--accent-ring); }

/* ── Chat ─────────────────────────────────────────────────────────────── */
.sm5-bubble-own { background:var(--bubble-own-bg); box-shadow:var(--bubble-own-shadow); color:#fff; border-radius:18px 18px 4px 18px; }
.sm5-bubble-other { background:var(--bubble-other-bg); border:1px solid var(--bubble-other-border); color:var(--text-primary); border-radius:18px 18px 18px 4px; }
.sm5-conv-row { border-radius:10px; cursor:pointer; transition:background .15s; position:relative; }
.sm5-conv-row:hover { background:var(--bg-hover); }
.sm5-conv-active { background:var(--accent-muted)!important; }
.sm5-conv-active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); height:60%; width:3px; background:var(--accent); border-radius:0 3px 3px 0; }

/* ── Misc ─────────────────────────────────────────────────────────────── */
.sm5-scroll { scrollbar-width:thin; scrollbar-color:var(--scrollbar) transparent; }
.sm5-scroll::-webkit-scrollbar { width:4px; height:4px; }
.sm5-scroll::-webkit-scrollbar-thumb { background:var(--scrollbar); border-radius:4px; }
.sm5-progress-track { height:4px; border-radius:99px; background:var(--border-2); overflow:hidden; }
.sm5-progress-fill { height:100%; background:var(--accent); transition:width .2s ease; }

@keyframes sm5-fade-up { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
.sm5-enter { animation:sm5-fade-up .2s ease forwards; }
@keyframes sm5-slide-in { from{opacity:0;transform:translateX(16px);} to{opacity:1;transform:translateX(0);} }
.sm5-slide-in { animation:sm5-slide-in .18s ease forwards; }
@keyframes sm5-sheet-up { from{transform:translateY(24px);opacity:0;} to{transform:translateY(0);opacity:1;} }
.sm5-sheet { animation:sm5-sheet-up .2s ease forwards; }
@keyframes sm5-dot-bounce { 0%,80%,100%{transform:translateY(0);opacity:.4;} 40%{transform:translateY(-4px);opacity:1;} }
.sm5-dot { animation:sm5-dot-bounce 1.4s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .sm5-enter, .sm5-slide-in, .sm5-sheet, .sm5-dot { animation:none; }
  .sm5 * { transition-duration:0.01ms !important; }
}

/* Prevent iOS zoom-on-focus. */
@media (max-width:1023px) { .sm5 input, .sm5 textarea { font-size:16px !important; } }
`;

/** Injects (or refreshes) the sm5 stylesheet exactly once per document. */
export function ensureMailStyles() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('sm5-styles') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'sm5-styles';
    document.head.appendChild(el);
  }
  el.textContent = SM5_CSS;
}