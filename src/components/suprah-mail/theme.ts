const SM5_CSS = `
/* ── Theme tokens ─────────────────────────────────────────────────────── */
.sm5[data-theme="dark"] {
  --bg-base:#0e0f11; --bg-elevated:#141618; --bg-hover:rgba(255,255,255,0.055);
  --bg-active:rgba(255,255,255,0.09); --surface-1:#1b1f24; --surface-2:#242a31;
  --border-1:rgba(255,255,255,0.08); --border-2:rgba(255,255,255,0.13); --border-3:rgba(255,255,255,0.19);
  --accent:#34c97d; --accent-muted:rgba(52,201,125,0.14); --accent-hover:#3fd98b; --accent-text:#8ce9b9;
  --accent-ring:rgba(52,201,125,0.28);
  --blue:#6f8cff; --blue-muted:rgba(111,140,255,0.15);
  --danger:#ff6b6b; --danger-muted:rgba(255,107,107,0.12); --warning:#f6b65f;
  --text-primary:rgba(255,255,255,0.96);
  --text-secondary:rgba(255,255,255,0.76);
  --text-tertiary:rgba(255,255,255,0.60);
  --text-disabled:rgba(255,255,255,0.38);
  --text-inverse:#09110d;
  --bubble-own-bg:linear-gradient(145deg,#169a58,#34c97d); --bubble-own-shadow:0 4px 20px rgba(52,201,125,0.22);
  --bubble-other-bg:var(--surface-2); --bubble-other-border:var(--border-2);
  --input-bg:#191d22; --input-border:rgba(255,255,255,0.14); --input-focus:rgba(52,201,125,0.32);
  --scrollbar:rgba(255,255,255,0.14);
  --shadow-md:0 4px 16px rgba(0,0,0,0.5),0 2px 6px rgba(0,0,0,0.3);
  --shadow-lg:0 20px 60px rgba(0,0,0,0.72),0 8px 24px rgba(0,0,0,0.42);
  --topbar-bg:rgba(20,22,24,0.90);
  --modal-overlay:rgba(0,0,0,0.72);
  --modal-surface:#171a1f;
  --modal-header:#1a1e23;
  --modal-footer:#15181c;
  --helper-bg:rgba(52,201,125,0.075);
  --helper-border:rgba(52,201,125,0.22);
}
.sm5[data-theme="light"] {
  --bg-base:#f4f6f7; --bg-elevated:#ffffff; --bg-hover:rgba(10,20,15,0.045);
  --bg-active:rgba(22,163,74,0.09); --surface-1:#ffffff; --surface-2:#f1f4f3;
  --border-1:rgba(10,20,15,0.08); --border-2:rgba(10,20,15,0.12); --border-3:rgba(10,20,15,0.18);
  --accent:#16a34a; --accent-muted:rgba(22,163,74,0.10); --accent-hover:#128a3f; --accent-text:#11783a;
  --accent-ring:rgba(22,163,74,0.22);
  --blue:#4a6cf0; --blue-muted:rgba(74,108,240,0.10);
  --danger:#c93442; --danger-muted:rgba(201,52,66,0.08); --warning:#b56d12;
  --text-primary:rgba(10,20,15,0.94);
  --text-secondary:rgba(10,20,15,0.72);
  --text-tertiary:rgba(10,20,15,0.56);
  --text-disabled:rgba(10,20,15,0.36);
  --text-inverse:#ffffff;
  --bubble-own-bg:linear-gradient(145deg,#16a34a,#34c97d); --bubble-own-shadow:0 3px 14px rgba(22,163,74,0.22);
  --bubble-other-bg:#ffffff; --bubble-other-border:rgba(10,20,15,0.10);
  --input-bg:#ffffff; --input-border:rgba(10,20,15,0.14); --input-focus:rgba(22,163,74,0.28);
  --scrollbar:rgba(10,20,15,0.14);
  --shadow-md:0 4px 16px rgba(0,0,0,0.10),0 2px 6px rgba(0,0,0,0.06);
  --shadow-lg:0 20px 60px rgba(0,0,0,0.18),0 8px 24px rgba(0,0,0,0.09);
  --topbar-bg:rgba(255,255,255,0.92);
  --modal-overlay:rgba(15,23,18,0.40);
  --modal-surface:#ffffff;
  --modal-header:#fbfcfb;
  --modal-footer:#f8faf9;
  --helper-bg:rgba(22,163,74,0.055);
  --helper-border:rgba(22,163,74,0.18);
}

/* ── Base / readable hierarchy ───────────────────────────────────────── */
.sm5 {
  font-family:'Geist',-apple-system,BlinkMacSystemFont,sans-serif;
  background:var(--bg-base);
  color:var(--text-primary);
  font-size:13px;
  line-height:1.45;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
.sm5-display { font-family:'Cabinet Grotesk','Geist',sans-serif; letter-spacing:-0.012em; }
.sm5-mono { font-family:'Geist Mono',monospace; font-variant-numeric:tabular-nums; }
.sm5 :focus-visible { outline:2px solid var(--accent); outline-offset:2px; border-radius:6px; }

/* Use these semantic classes throughout Suprah One Desk.
   Hierarchy is based on role, not arbitrary one-off font sizes. */
.sm5-title-xl { font-family:'Cabinet Grotesk','Geist',sans-serif; font-size:20px; line-height:1.2; font-weight:750; letter-spacing:-0.018em; color:var(--text-primary); }
.sm5-title-lg { font-family:'Cabinet Grotesk','Geist',sans-serif; font-size:16px; line-height:1.25; font-weight:750; letter-spacing:-0.012em; color:var(--text-primary); }
.sm5-title-md { font-size:14px; line-height:1.3; font-weight:700; color:var(--text-primary); }
.sm5-title-sm { font-size:13px; line-height:1.35; font-weight:650; color:var(--text-primary); }
.sm5-body { font-size:12.5px; line-height:1.55; font-weight:400; color:var(--text-primary); }
.sm5-supporting { font-size:11.5px; line-height:1.45; font-weight:500; color:var(--text-secondary); }
.sm5-meta { font-size:10.5px; line-height:1.35; font-weight:500; color:var(--text-tertiary); }
.sm5-label { font-size:10px; line-height:1.2; font-weight:750; letter-spacing:.11em; text-transform:uppercase; color:var(--text-secondary); }
.sm5-helper { font-size:11px; line-height:1.5; font-weight:500; color:var(--text-secondary); }
.sm5-danger-text { color:var(--danger); }
.sm5-warning-text { color:var(--warning); }

/* Make shadcn semantic text inside the Suprah One Desk scope follow this
   module's own contrast system as well. */
.sm5 .text-foreground { color:var(--text-primary)!important; }
.sm5 .text-muted-foreground { color:var(--text-secondary)!important; }

/* ── Surfaces ─────────────────────────────────────────────────────────── */
.sm5-topbar { background:var(--topbar-bg); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-bottom:1px solid var(--border-1); }
.sm5-rail { background:var(--bg-elevated); border-right:1px solid var(--border-1); }
.sm5-toolbar { height:54px; display:flex; align-items:center; border-bottom:1px solid var(--border-1); flex-shrink:0; }

/* ── Theme-aware modal system ─────────────────────────────────────────── */
.sm5-overlay { background:var(--modal-overlay); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); }
.sm5-modal {
  background:var(--modal-surface);
  color:var(--text-primary);
  border:1px solid var(--border-2);
  border-radius:16px;
  box-shadow:var(--shadow-lg);
}
.sm5-modal-header {
  background:var(--modal-header);
  border-bottom:1px solid var(--border-1);
}
.sm5-modal-body { background:var(--modal-surface); color:var(--text-primary); }
.sm5-modal-footer {
  background:var(--modal-footer);
  border-top:1px solid var(--border-1);
}
.sm5-modal-section {
  border:1px solid var(--border-1);
  background:var(--surface-1);
  border-radius:12px;
}
.sm5-helper-card {
  border:1px solid var(--helper-border);
  background:var(--helper-bg);
  border-radius:12px;
  color:var(--text-secondary);
}
.sm5-field-label {
  display:block;
  margin-bottom:6px;
  font-size:10px;
  line-height:1.2;
  font-weight:750;
  letter-spacing:.11em;
  text-transform:uppercase;
  color:var(--text-secondary);
}

/* ── Controls ─────────────────────────────────────────────────────────── */
.sm5-input {
  background:var(--input-bg);
  border:1px solid var(--input-border);
  color:var(--text-primary);
  border-radius:8px;
  transition:border-color .15s, box-shadow .15s, background .15s;
  font-weight:450;
}
.sm5-input::placeholder { color:var(--text-tertiary); opacity:1; }
.sm5-input:hover:not(:disabled) { border-color:var(--border-3); }
.sm5-input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--input-focus); }
.sm5-input:disabled { opacity:.58; cursor:not-allowed; }

.sm5-btn { background:var(--accent); color:#fff; border-radius:10px; transition:all .15s; box-shadow:0 2px 8px var(--accent-ring); font-weight:650; }
.sm5-btn:hover:not(:disabled) { background:var(--accent-hover); transform:translateY(-1px); }
.sm5-btn:disabled { opacity:.48; cursor:not-allowed; box-shadow:none; }

.sm5-icon-btn { border-radius:8px; color:var(--text-secondary); transition:all .15s; display:flex; align-items:center; justify-content:center; }
.sm5-icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
.sm5-icon-btn:disabled { opacity:.42; cursor:not-allowed; }

.sm5-pill { border-radius:8px; border:1px solid var(--border-2); background:var(--bg-hover); color:var(--text-secondary); transition:all .15s; font-weight:600; }
.sm5-pill:hover:not(:disabled) { background:var(--bg-active); color:var(--text-primary); border-color:var(--border-3); }
.sm5-pill:disabled { opacity:.48; cursor:not-allowed; }

/* ── Inbox rows ───────────────────────────────────────────────────────── */
.sm5-label-row { border-radius:9px; cursor:pointer; transition:background .15s,color .15s; }
.sm5-label-row:hover { background:var(--bg-hover); color:var(--text-primary)!important; }
.sm5-label-active { background:var(--accent-muted)!important; color:var(--accent-text)!important; font-weight:700; }
.sm5-msg-row { border-bottom:1px solid var(--border-1); cursor:pointer; transition:background .12s; }
.sm5-msg-row:hover { background:var(--bg-hover); }
.sm5-msg-row-active { background:var(--accent-muted)!important; }

/* ── Tabs ─────────────────────────────────────────────────────────────── */
.sm5-tab-bar { background:rgba(127,127,127,0.08); border-radius:10px; padding:3px; }
.sm5-tab { border-radius:8px; font-weight:600; letter-spacing:.03em; transition:all .15s; color:var(--text-secondary); }
.sm5-tab:hover { color:var(--text-primary); background:var(--bg-hover); }
.sm5-tab-active { background:var(--accent); color:#fff; box-shadow:0 2px 8px var(--accent-ring); }

/* ── Chat ─────────────────────────────────────────────────────────────── */
.sm5-bubble-own { background:var(--bubble-own-bg); box-shadow:var(--bubble-own-shadow); color:#fff; border-radius:18px 18px 4px 18px; }
.sm5-bubble-other { background:var(--bubble-other-bg); border:1px solid var(--bubble-other-border); color:var(--text-primary); border-radius:18px 18px 18px 4px; }
.sm5-conv-row { border-radius:10px; cursor:pointer; transition:background .15s,color .15s; position:relative; }
.sm5-conv-row:hover { background:var(--bg-hover); }
.sm5-conv-active { background:var(--accent-muted)!important; }
.sm5-conv-active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); height:60%; width:3px; background:var(--accent); border-radius:0 3px 3px 0; }

/* ── Misc ─────────────────────────────────────────────────────────────── */
.sm5-scroll { scrollbar-width:thin; scrollbar-color:var(--scrollbar) transparent; }
.sm5-scroll::-webkit-scrollbar { width:5px; height:5px; }
.sm5-scroll::-webkit-scrollbar-thumb { background:var(--scrollbar); border-radius:5px; }
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

@media (max-width:1023px) {
  .sm5 input, .sm5 textarea { font-size:16px !important; }
}
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