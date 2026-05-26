export const SS4_CSS = `
  /* ── Token System ──────────────────────────────────── */
  .ss4[data-theme="dark"] {
    --bg-base:       #0e0f11;
    --bg-elevated:   #141618;
    --bg-overlay:    #1a1d21;
    --bg-hover:      rgba(255,255,255,0.04);
    --bg-active:     rgba(255,255,255,0.07);
    --bg-subtle:     rgba(255,255,255,0.03);

    --surface-1:     #1e2126;
    --surface-2:     #252a31;
    --surface-3:     #2d3340;

    --border-1:      rgba(255,255,255,0.06);
    --border-2:      rgba(255,255,255,0.10);
    --border-3:      rgba(255,255,255,0.14);

    --accent:        #5b7cf6;
    --accent-muted:  rgba(91,124,246,0.15);
    --accent-hover:  #6b8cf8;
    --accent-text:   #a5b8ff;

    --positive:      #34c97d;
    --positive-muted:rgba(52,201,125,0.12);
    --warning:       #f0a855;
    --danger:        #f05c5c;
    --danger-muted:  rgba(240,92,92,0.12);

    --text-primary:  rgba(255,255,255,0.92);
    --text-secondary:rgba(255,255,255,0.52);
    --text-tertiary: rgba(255,255,255,0.28);
    --text-disabled: rgba(255,255,255,0.16);

    --bubble-own-bg: linear-gradient(145deg, #4a6cf0, #5b7cf6);
    --bubble-own-shadow: 0 4px 20px rgba(91,124,246,0.25);
    --bubble-other-bg: var(--surface-2);
    --bubble-other-border: var(--border-2);

    --sidebar-bg:    #111316;
    --sidebar-border:rgba(255,255,255,0.055);

    --input-bg:      var(--surface-1);
    --input-border:  var(--border-2);
    --input-focus:   rgba(91,124,246,0.35);

    --scrollbar:     rgba(255,255,255,0.07);
    --shadow-sm:     0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
    --shadow-md:     0 4px 16px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3);
    --shadow-lg:     0 20px 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4);
  }

  .ss4[data-theme="light"] {
    --bg-base:       #f4f5f7;
    --bg-elevated:   #ffffff;
    --bg-overlay:    #f9fafb;
    --bg-hover:      rgba(0,0,0,0.03);
    --bg-active:     rgba(91,124,246,0.08);
    --bg-subtle:     rgba(0,0,0,0.02);

    --surface-1:     #ffffff;
    --surface-2:     #f4f5f7;
    --surface-3:     #eaecf0;

    --border-1:      rgba(0,0,0,0.06);
    --border-2:      rgba(0,0,0,0.09);
    --border-3:      rgba(0,0,0,0.14);

    --accent:        #4a6cf0;
    --accent-muted:  rgba(74,108,240,0.1);
    --accent-hover:  #3a5ce0;
    --accent-text:   #4a6cf0;

    --positive:      #22b060;
    --positive-muted:rgba(34,176,96,0.1);
    --warning:       #e0922a;
    --danger:        #dc3545;
    --danger-muted:  rgba(220,53,69,0.08);

    --text-primary:  rgba(0,0,0,0.87);
    --text-secondary:rgba(0,0,0,0.50);
    --text-tertiary: rgba(0,0,0,0.32);
    --text-disabled: rgba(0,0,0,0.20);

    --bubble-own-bg: linear-gradient(145deg, #4a6cf0, #5b7cf6);
    --bubble-own-shadow: 0 3px 14px rgba(74,108,240,0.22);
    --bubble-other-bg: #ffffff;
    --bubble-other-border: rgba(0,0,0,0.09);

    --sidebar-bg:    #ffffff;
    --sidebar-border:rgba(0,0,0,0.08);

    --input-bg:      #ffffff;
    --input-border:  rgba(0,0,0,0.1);
    --input-focus:   rgba(74,108,240,0.3);

    --scrollbar:     rgba(0,0,0,0.1);
    --shadow-sm:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
    --shadow-md:     0 4px 16px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06);
    --shadow-lg:     0 20px 60px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1);
  }

  /* ── Base ──────────────────────────────────────────── */
  .ss4 {
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg-base);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .ss4-display { font-family: 'Cabinet Grotesk', sans-serif; }
  .ss4-mono { font-family: 'Geist Mono', monospace; }

  /* ── Topbar ────────────────────────────────────────── */
  .ss4-topbar {
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-1);
  }

  /* ── Sidebar ───────────────────────────────────────── */
  .ss4-sidebar {
    background: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
  }

  /* ── Conversation Items ─────────────────────────────── */
  .ss4-conv {
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
    position: relative;
  }
  .ss4-conv:hover { background: var(--bg-hover); }
  .ss4-conv-active { background: rgba(91,124,246,0.18) !important; }
  .ss4-conv-name { color: var(--text-primary); }
  .ss4-conv-preview { color: var(--text-secondary); }
  .ss4-conv-active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 60%;
    width: 3px;
    background: var(--accent);
    border-radius: 0 3px 3px 0;
  }

  /* ── Search Input ───────────────────────────────────── */
  .ss4-search-input {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    color: var(--text-primary);
    border-radius: 8px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .ss4-search-input::placeholder { color: var(--text-tertiary); }
  .ss4-search-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--input-focus);
  }
  .ss4-search-icon { color: var(--text-tertiary); }

  /* ── Chat Header ────────────────────────────────────── */
  .ss4-chat-header {
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-1);
  }

  /* ── Message Bubbles ────────────────────────────────── */
  .ss4-bubble-own {
    background: var(--bubble-own-bg);
    box-shadow: var(--bubble-own-shadow);
    color: #fff;
    border-radius: 18px 18px 4px 18px;
  }
  .ss4-bubble-other {
    background: var(--bubble-other-bg);
    border: 1px solid var(--bubble-other-border);
    color: var(--text-primary);
    border-radius: 18px 18px 18px 4px;
    box-shadow: var(--shadow-sm);
  }
  .ss4-msg-column {
    width: fit-content;
    max-width: min(68%, 42rem);
  }
  .ss4-msg-bubble { width: 100%; max-width: 100%; overflow: hidden; }
  .ss4-attachment-item { display: block; width: 100%; max-width: 100%; }
  .ss4-attachment-media { display: block; width: 100%; max-width: 100%; height: auto; object-fit: cover; }
  .ss4-attachment-video { display: block; width: 100%; max-width: 100%; height: auto; }

  /* ── Input area ─────────────────────────────────────── */
  .ss4-input-wrap {
    background: var(--input-bg);
    border: 1.5px solid var(--input-border);
    border-radius: 14px;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .ss4-input-wrap:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--input-focus);
  }

  /* ── Send Button ────────────────────────────────────── */
  .ss4-send-btn {
    background: var(--accent);
    color: #fff;
    border-radius: 10px;
    transition: all 0.15s ease;
    box-shadow: 0 2px 8px rgba(91,124,246,0.3);
  }
  .ss4-send-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(91,124,246,0.4);
  }
  .ss4-send-btn:disabled {
    background: var(--surface-2);
    box-shadow: none;
    cursor: not-allowed;
  }

  /* ── Icon Buttons ───────────────────────────────────── */
  .ss4-icon-btn {
    border-radius: 8px;
    color: var(--text-tertiary);
    transition: all 0.15s ease;
    display: flex; align-items: center; justify-content: center;
  }
  .ss4-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* ── Pill Buttons ───────────────────────────────────── */
  .ss4-pill-btn {
    border-radius: 8px;
    border: 1px solid var(--border-2);
    background: var(--bg-hover);
    color: var(--text-secondary);
    transition: all 0.15s ease;
  }
  .ss4-pill-btn:hover { background: var(--bg-active); border-color: var(--border-3); color: var(--text-primary); }

  /* ── Reply Bar ──────────────────────────────────────── */
  .ss4-reply-bar {
    background: var(--accent-muted);
    border: 1px solid rgba(91,124,246,0.2);
    border-left: 3px solid var(--accent);
    border-radius: 10px;
  }

  /* ── Modals / Overlays ──────────────────────────────── */
  .ss4-overlay {
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .ss4-modal {
    background: var(--bg-elevated);
    border: 1px solid var(--border-2);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
  }

  /* ── Avatar styles ──────────────────────────────────── */
  .ss4-ava-accent { background: linear-gradient(140deg, #3a5ce0, #5b7cf6); }
  .ss4-ava-purple { background: linear-gradient(140deg, #7038c0, #9b6fd6); }
  .ss4-ava-teal   { background: linear-gradient(140deg, #0e7c6a, #22b060); }
  .ss4-ava-amber  { background: linear-gradient(140deg, #b85c00, #f0a855); }
  .ss4-ava-rose   { background: linear-gradient(140deg, #c0385c, #f06090); }

  /* ── Online Dot ─────────────────────────────────────── */
  .ss4-online-dot {
    background: var(--positive);
    box-shadow: 0 0 0 2px var(--sidebar-bg), 0 0 6px rgba(52,201,125,0.6);
  }

  /* ── Typing Indicator ───────────────────────────────── */
  @keyframes ss4-dot-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-4px); opacity: 1; }
  }
  .ss4-typing-dot { animation: ss4-dot-bounce 1.4s ease-in-out infinite; }

  /* ── Status badge ───────────────────────────────────── */
  .ss4-status-live {
    background: rgba(91,124,246,0.12);
    border: 1px solid rgba(91,124,246,0.2);
    color: var(--accent-text);
  }
  .ss4-status-offline {
    background: var(--bg-subtle);
    border: 1px solid var(--border-1);
    color: var(--text-tertiary);
  }

  /* ── Hover actions ──────────────────────────────────── */
  .ss4-msg-actions {
    background: var(--bg-elevated);
    border: 1px solid var(--border-2);
    border-radius: 10px;
    box-shadow: var(--shadow-md);
  }

  /* ── Section label ──────────────────────────────────── */
  .ss4-section-label {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-1);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 700;
  }

  /* ── Scrollbar ──────────────────────────────────────── */
  .ss4-scroll::-webkit-scrollbar { width: 4px; }
  .ss4-scroll::-webkit-scrollbar-track { background: transparent; }
  .ss4-scroll::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

  /* ── Date separator ─────────────────────────────────── */
  .ss4-date-line { height: 1px; background: var(--border-1); }
  .ss4-date-chip {
    background: var(--surface-2);
    border: 1px solid var(--border-1);
    border-radius: 20px;
    color: var(--text-tertiary);
    font-size: 11px;
    padding: 3px 12px;
    white-space: nowrap;
  }

  /* ── Tab Switcher ───────────────────────────────────── */
  .ss4-tab-bar { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 3px; }
  .ss4-tab {
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    transition: all 0.15s ease;
    color: rgba(255,255,255,0.4);
  }
  .ss4-tab-active { background: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(91,124,246,0.35); }

  /* ── Logo Mark ──────────────────────────────────────── */
  .ss4-logo-mark {
    background: linear-gradient(140deg, #3a5ce0, #5b7cf6);
    box-shadow: 0 0 0 1px rgba(91,124,246,0.3), 0 4px 16px rgba(91,124,246,0.2);
    border-radius: 10px;
  }

  /* ── New Message FAB ────────────────────────────────── */
  .ss4-new-btn {
    background: rgba(91,124,246,0.15);
    border: 1px solid rgba(91,124,246,0.25);
    border-radius: 8px;
    color: var(--accent-text);
    transition: all 0.15s ease;
  }
  .ss4-new-btn:hover { background: rgba(91,124,246,0.25); }

  /* ── Theme Toggle ───────────────────────────────────── */
  .ss4-theme-btn {
    background: var(--bg-hover);
    border: 1px solid var(--border-2);
    border-radius: 8px;
    color: var(--text-tertiary);
    transition: all 0.15s ease;
  }
  .ss4-theme-btn:hover { color: var(--text-primary); border-color: var(--border-3); }

  /* ── File attachment ────────────────────────────────── */
  .ss4-file-own { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; }
  .ss4-file-other { background: var(--surface-2); border: 1px solid var(--border-1); border-radius: 10px; }

  /* ── Unread badge ───────────────────────────────────── */
  .ss4-badge {
    background: var(--accent);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    border-radius: 10px;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    padding: 0 4px;
    text-align: center;
  }

  /* ── Message load animation ─────────────────────────── */
  @keyframes ss4-fade-up {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .ss4-msg-enter { animation: ss4-fade-up 0.2s ease forwards; }

  /* ── Empty state icon ───────────────────────────────── */
  .ss4-empty-icon {
    background: var(--accent-muted);
    border: 1px dashed rgba(91,124,246,0.25);
    border-radius: 16px;
  }

  /* ── Divider ────────────────────────────────────────── */
  .ss4-divider { height: 1px; background: var(--border-1); }

  /* ── Status dot colors (for leads) ─────────────────── */
  .ss4-dot-new     { background: #34c97d; }
  .ss4-dot-pending { background: #f0a855; }
  .ss4-dot-contact { background: #5b7cf6; }
  .ss4-dot-appt    { background: #9b6fd6; }
  .ss4-dot-closed  { background: rgba(255,255,255,0.2); }
  .ss4-dot-calls   { background: #22c9c9; }
`;

export function injectSS4Styles() {
  if (typeof document === 'undefined') return;

  let link = document.getElementById('ss4-fonts') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = 'ss4-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Cabinet+Grotesk:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  let s = document.getElementById('ss4-styles') as HTMLStyleElement | null;
  if (!s) {
    s = document.createElement('style');
    s.id = 'ss4-styles';
    document.head.appendChild(s);
  }
  s.textContent = SS4_CSS;
}
