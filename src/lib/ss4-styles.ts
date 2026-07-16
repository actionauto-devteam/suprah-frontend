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

    --accent:        #10b981;
    --accent-muted:  rgba(16,185,129,0.15);
    --accent-hover:  #34d399;
    --accent-text:   #6ee7b7;

    --positive:      #34c97d;
    --positive-muted:rgba(52,201,125,0.12);
    --warning:       #f0a855;
    --danger:        #f05c5c;
    --danger-muted:  rgba(240,92,92,0.12);

    --text-primary:  rgba(255,255,255,0.92);
    --text-secondary:rgba(255,255,255,0.52);
    --text-tertiary: rgba(255,255,255,0.28);
    --text-disabled: rgba(255,255,255,0.16);

    --bubble-own-bg: linear-gradient(145deg, #059669, #10b981);
    --bubble-own-shadow: 0 4px 20px rgba(16,185,129,0.25);
    --bubble-other-bg: var(--surface-2);
    --bubble-other-border: var(--border-2);

    --sidebar-bg:    #111316;
    --sidebar-border:rgba(255,255,255,0.055);

    --input-bg:      var(--surface-1);
    --input-border:  var(--border-2);
    --input-focus:   rgba(16,185,129,0.35);

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
    --bg-active:     rgba(5,150,105,0.08);
    --bg-subtle:     rgba(0,0,0,0.02);

    --surface-1:     #ffffff;
    --surface-2:     #f4f5f7;
    --surface-3:     #eaecf0;

    --border-1:      rgba(0,0,0,0.06);
    --border-2:      rgba(0,0,0,0.09);
    --border-3:      rgba(0,0,0,0.14);

    --accent:        #059669;
    --accent-muted:  rgba(5,150,105,0.1);
    --accent-hover:  #047857;
    --accent-text:   #059669;

    --positive:      #22b060;
    --positive-muted:rgba(34,176,96,0.1);
    --warning:       #e0922a;
    --danger:        #dc3545;
    --danger-muted:  rgba(220,53,69,0.08);

    --text-primary:  rgba(0,0,0,0.87);
    --text-secondary:rgba(0,0,0,0.50);
    --text-tertiary: rgba(0,0,0,0.32);
    --text-disabled: rgba(0,0,0,0.20);

    --bubble-own-bg: linear-gradient(145deg, #059669, #10b981);
    --bubble-own-shadow: 0 3px 14px rgba(5,150,105,0.22);
    --bubble-other-bg: #ffffff;
    --bubble-other-border: rgba(0,0,0,0.09);

    --sidebar-bg:    #ffffff;
    --sidebar-border:rgba(0,0,0,0.08);

    --input-bg:      #ffffff;
    --input-border:  rgba(0,0,0,0.1);
    --input-focus:   rgba(5,150,105,0.3);

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
  .ss4-conv-active { background: rgba(16,185,129,0.18) !important; }
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
  
  /* ── Supra Podium Lead Conversation Layout ──────────── */
  
  .suprah-podium-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  height: 100%;
  background: #080d0f;
  border-left: 1px solid rgba(0, 255, 170, 0.12);
  color: #e8fff8;
}

.suprah-chat-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #0b1013;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.suprah-chat-header {
  height: 72px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #10161a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.suprah-contact-pill {
  display: flex;
  align-items: center;
  gap: 12px;
}

.suprah-avatar,
.suprah-small-avatar,
.suprah-large-avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #00c98b, #07885f);
  color: white;
  font-weight: 700;
}

.suprah-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.suprah-small-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  font-size: 12px;
}

.suprah-large-avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  font-size: 20px;
}

.suprah-chat-header h2,
.suprah-profile-header h2 {
  font-size: 16px;
  margin: 0;
  color: #ffffff;
}

.suprah-chat-header p,
.suprah-profile-header p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #9fb3ad;
}

.suprah-header-actions {
  display: flex;
  gap: 8px;
}

.suprah-header-actions button,
.suprah-quick-actions button,
.suprah-reply-actions button {
  background: #151c20;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #dffff4;
  border-radius: 8px;
  height: 34px;
  padding: 0 12px;
  cursor: pointer;
}

.suprah-meta-bar {
  height: 34px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  gap: 22px;
  font-size: 12px;
  color: #8ba19b;
  background: #0f1518;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.suprah-message-area {
  flex: 1;
  overflow-y: auto;
  padding: 32px 42px;
}

.suprah-conversation-start {
  text-align: center;
  color: #9fb3ad;
  margin-bottom: 34px;
}

.suprah-conversation-start h3 {
  color: #eafff8;
  margin: 10px 0 4px;
}

.suprah-phone-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto;
  border-radius: 50%;
  background: #00b986;
  display: grid;
  place-items: center;
  color: white;
}

.suprah-message-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 22px;
}

.suprah-message-row.outbound {
  justify-content: flex-end;
}

.suprah-message-row.inbound {
  justify-content: flex-start;
}

.suprah-message-bubble {
  max-width: 560px;
  padding: 14px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.45;
  background: #1d252a;
  color: #eafff8;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.suprah-message-row.outbound .suprah-message-bubble {
  background: #243038;
}

.suprah-message-time {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  color: #7f918c;
}

.suprah-reply-box {
  margin: 18px 28px;
  border-radius: 14px;
  background: #151b20;
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.suprah-reply-box textarea {
  width: 100%;
  min-height: 72px;
  resize: none;
  padding: 16px;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 14px;
}

.suprah-reply-box textarea::placeholder {
  color: #879892;
}

.suprah-reply-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 12px;
}

.suprah-send-btn {
  background: #00a875 !important;
  color: white !important;
  display: flex;
  align-items: center;
  gap: 6px;
}

.suprah-details-panel {
  background: #0f1518;
  padding: 18px;
  overflow-y: auto;
}

.suprah-profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.suprah-contact-type,
.suprah-ai-summary {
  font-size: 13px;
  color: #c6d8d2;
  line-height: 1.5;
}

.suprah-ai-summary {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.suprah-quick-actions {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin: 18px 0;
}

.suprah-status-select {
  width: 100%;
  height: 38px;
  background: #151c20;
  color: #eafff8;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0 10px;
}

.suprah-tabs {
  display: flex;
  margin-top: 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.suprah-tabs button {
  flex: 1;
  background: transparent;
  border: none;
  color: #8fa29c;
  padding: 12px;
  text-transform: uppercase;
  font-size: 12px;
  cursor: pointer;
}

.suprah-tabs button.active {
  color: #ffffff;
  border-bottom: 2px solid #00c98b;
}

.suprah-activity h3 {
  font-size: 16px;
  margin: 20px 0 14px;
}

.suprah-activity-card {
  background: #151c20;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px;
  font-size: 13px;
}

.suprah-activity-card p {
  color: #b8cac4;
}

.suprah-activity-card span {
  color: #758982;
  font-size: 12px;
}

.suprah-conversation-empty {
  display: grid;
  place-items: center;
  height: 100%;
  color: #8fa29c;
  background: #0b1013;
}

@media (max-width: 1200px) {
  .suprah-podium-layout {
    grid-template-columns: 1fr;
  }

  .suprah-details-panel {
    display: none;
  }
}

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
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .ss4-bubble-other {
    background: var(--bubble-other-bg);
    border: 1px solid var(--bubble-other-border);
    color: var(--text-primary);
    border-radius: 18px 18px 18px 4px;
    box-shadow: var(--shadow-sm);
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .ss4-msg-column {
    width: fit-content;
    max-width: min(68%, 42rem);
  }
  .ss4-msg-bubble { width: 100%; max-width: 100%; word-break: break-word; overflow-wrap: anywhere; }
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
    box-shadow: 0 2px 8px rgba(16,185,129,0.3);
  }
  .ss4-send-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(16,185,129,0.4);
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
    border: 1px solid rgba(16,185,129,0.2);
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
  .ss4-ava-accent { background: linear-gradient(140deg, #059669, #10b981); }
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
    background: rgba(16,185,129,0.12);
    border: 1px solid rgba(16,185,129,0.2);
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
    font-size: 11px;
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
  .ss4-tab-active { background: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(16,185,129,0.35); }

  /* ── Logo Mark ──────────────────────────────────────── */
  .ss4-logo-mark {
    background: linear-gradient(140deg, #059669, #10b981);
    box-shadow: 0 0 0 1px rgba(16,185,129,0.3), 0 4px 16px rgba(16,185,129,0.2);
    border-radius: 10px;
  }

  /* ── New Message FAB ────────────────────────────────── */
  .ss4-new-btn {
    background: rgba(16,185,129,0.15);
    border: 1px solid rgba(16,185,129,0.25);
    border-radius: 8px;
    color: var(--accent-text);
    transition: all 0.15s ease;
  }
  .ss4-new-btn:hover { background: rgba(16,185,129,0.25); }

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
  .ss4-file-own { background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.16); border-radius: 10px; }
  .ss4-file-other { background: var(--surface-3); border: 1px solid var(--border-3); border-radius: 10px; box-shadow: var(--shadow-sm); }

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
    border: 1px dashed rgba(16,185,129,0.25);
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
  if (typeof document === "undefined") return;

  let link = document.getElementById("ss4-fonts") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = "ss4-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Cabinet+Grotesk:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }

  let s = document.getElementById("ss4-styles") as HTMLStyleElement | null;
  if (!s) {
    s = document.createElement("style");
    s.id = "ss4-styles";
    document.head.appendChild(s);
  }
  s.textContent = SS4_CSS;
}

/* ── Video-inspired lead workspace refinements ───────────────────────────── */
export const LEAD_DETAILS_PANEL_CSS = `
  .suprah-conversation-shell {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    background: var(--bg-base);
  }

  .suprah-conversation-header {
    min-height: 70px;
    padding: 0 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-1);
  }
  .suprah-conversation-header h2,
  .suprah-profile-header h2 { margin: 0; color: var(--text-primary); font-size: 16px; font-weight: 700; }
  .suprah-conversation-header p,
  .suprah-profile-header p { margin: 2px 0 0; color: var(--text-secondary); font-size: 12px; }
  .suprah-conversation-channel {
    display: flex; align-items: center; gap: 7px; flex-shrink: 0;
    padding: 7px 10px; border: 1px solid var(--border-2); border-radius: 9px;
    color: var(--text-secondary); background: var(--bg-hover); font-size: 11px;
  }
  .suprah-meta-bar { min-height: 34px; height: auto; background: var(--bg-overlay); color: var(--text-tertiary); border-color: var(--border-1); overflow: hidden; }
  .suprah-meta-bar span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .suprah-sibling-banner {
    display: flex; align-items: center; gap: 9px; padding: 9px 16px;
    background: var(--accent-muted); border: 0; border-bottom: 1px solid rgba(16,185,129,.22);
    color: var(--accent-text); font-size: 12px; text-align: left;
  }
  .suprah-sibling-banner strong { margin-left: auto; white-space: nowrap; }
  .suprah-message-area { padding: 26px clamp(18px, 4vw, 44px); background: var(--bg-base); }
  .suprah-message-column { width: fit-content; max-width: min(72%, 42rem); }
  .suprah-message-bubble { max-width: none; background: var(--bubble-other-bg); border-color: var(--bubble-other-border); color: var(--text-primary); }
  .suprah-message-row.outbound .suprah-message-bubble { background: var(--bubble-own-bg); color: #fff; border-color: transparent; box-shadow: var(--bubble-own-shadow); }
  .suprah-message-row.outbound .suprah-message-time { text-align: right; }
  .suprah-empty-thread {
    max-width: 430px; margin: 0 auto; display: flex; gap: 12px; align-items: flex-start;
    padding: 16px; border: 1px dashed var(--border-2); border-radius: 12px;
    color: var(--text-secondary); background: var(--bg-subtle);
  }
  .suprah-empty-thread strong { color: var(--text-primary); font-size: 13px; }
  .suprah-empty-thread p { margin: 3px 0 0; font-size: 12px; }

  .suprah-details-panel {
    display: none; width: 370px; flex: 0 0 370px; min-height: 0;
    padding: 0; border-left: 1px solid var(--border-1); background: var(--bg-elevated);
    color: var(--text-primary); overflow: hidden;
  }
  .suprah-profile-header { display: flex; align-items: center; gap: 12px; margin: 0; padding: 18px 16px 10px; }
  .suprah-contact-type { margin: 0; padding: 0 16px; color: var(--text-tertiary); font-size: 11px; }
  .suprah-ai-summary { margin: 12px 16px 0; padding: 12px; border: 1px solid var(--border-1); border-radius: 11px; background: var(--bg-subtle); }
  .suprah-ai-summary strong { display: block; color: var(--text-primary); font-size: 12px; }
  .suprah-ai-summary p { margin: 5px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
  .suprah-quick-actions {
    margin: 14px 16px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
    align-items: stretch;
  }

  .suprah-quick-actions > button,
  .suprah-quick-actions > a {
    min-width: 0;
    width: 100%;
    height: 52px;
    padding: 6px 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid var(--border-2);
    border-radius: 9px;
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 9px;
    text-decoration: none;
    transition: .15s ease;
  }

  .suprah-quick-actions > button:hover,
  .suprah-quick-actions > a:hover {
    background: var(--bg-active);
    color: var(--text-primary);
    border-color: var(--border-3);
  }

  .suprah-quick-actions > a[aria-disabled="true"] {
    pointer-events: none;
    opacity: .4;
  }

  /* ── More action dropdown ───────────────────────────── */
  .suprah-more-action-wrap {
    position: relative;
    width: 100%;
    height: 52px;
    min-width: 0;
  }

  .suprah-quick-actions .suprah-more-trigger {
    width: 100%;
    height: 52px;
    min-height: 52px;
    padding: 6px 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid var(--border-2);
    border-radius: 9px;
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 9px;
    white-space: nowrap;
    cursor: pointer;
    transition: .15s ease;
  }

  .suprah-quick-actions .suprah-more-trigger:hover,
  .suprah-quick-actions .suprah-more-trigger[aria-expanded="true"] {
    background: var(--bg-active);
    color: var(--text-primary);
    border-color: var(--border-3);
  }

  .suprah-more-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 100;
    width: 230px;
    padding: 5px;
    overflow: hidden;
    border: 1px solid var(--border-2);
    border-radius: 10px;
    background: var(--bg-elevated);
    box-shadow: var(--shadow-lg);
  }

  .suprah-quick-actions .suprah-more-menu-item {
    width: 100%;
    height: auto;
    min-height: 48px;
    padding: 10px 12px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 11px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;
  }

  .suprah-quick-actions .suprah-more-menu-item:hover {
    background: var(--bg-hover);
  }

  .suprah-more-menu-icon {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    background: var(--accent-muted);
    color: var(--accent);
  }

  .suprah-more-menu-label {
    display: block;
    min-width: 0;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.25;
    white-space: nowrap;
  }
  .suprah-status-label { display: block; margin: 0 16px 6px; color: var(--text-tertiary); font-size: 11px; font-weight: 600; }
  .suprah-status-select { width: calc(100% - 32px); margin: 0 16px; background: var(--input-bg); color: var(--text-primary); border-color: var(--input-border); }
  .suprah-stage-track { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin: 9px 16px 14px; }
  .suprah-stage-track span { height: 3px; border-radius: 999px; background: var(--surface-2); }
  .suprah-stage-track span.active { background: var(--accent); }
  .suprah-tabs { margin-top: 0; border-color: var(--border-1); }
  .suprah-tabs button { color: var(--text-tertiary); }
  .suprah-tabs button.active { color: var(--text-primary); border-color: var(--accent); }
  .suprah-details-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px 18px; }
  .suprah-detail-section { margin-bottom: 10px; border: 1px solid var(--border-1); border-radius: 11px; background: var(--bg-subtle); overflow: hidden; }
  .suprah-detail-section-title { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 0; background: transparent; color: var(--text-primary); font-size: 12px; font-weight: 700; }
  .suprah-detail-section-body { border-top: 1px solid var(--border-1); }
  .suprah-detail-row { display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-1); }
  .suprah-detail-row:last-child { border-bottom: 0; }
  .suprah-detail-row-icon { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 8px; background: var(--accent-muted); color: var(--accent-text); }
  .suprah-detail-row span { display: block; color: var(--text-tertiary); font-size: 10px; }
  .suprah-detail-row p { margin: 2px 0 0; color: var(--text-primary); font-size: 12px; }
  .suprah-activity-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 3px 0 12px; }
  .suprah-activity-heading h3 { margin: 0; color: var(--text-primary); font-size: 14px; }
  .suprah-activity-heading select { height: 30px; border: 1px solid var(--border-2); border-radius: 8px; background: var(--input-bg); color: var(--text-secondary); font-size: 10px; }
  .suprah-timeline { position: relative; padding-left: 12px; border-left: 1px solid var(--border-2); }
  .suprah-activity-card { position: relative; margin: 0 0 10px; background: var(--bg-subtle); border-color: var(--border-1); color: var(--text-primary); }
  .suprah-activity-card p { margin: 5px 0; color: var(--text-secondary); }
  .suprah-activity-card time { color: var(--text-tertiary); font-size: 10px; }
  .suprah-timeline-dot { position: absolute; width: 8px; height: 8px; left: -17px; top: 16px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--bg-elevated); }

  @media (min-width: 1280px) { .suprah-details-panel { display: flex; flex-direction: column; } }
  @media (max-width: 639px) {
    .suprah-conversation-header { min-height: 62px; padding: 0 10px; }
    .suprah-meta-bar { padding: 0 12px; gap: 12px; }
    .suprah-meta-bar span:last-child { display: none; }
    .suprah-message-area { padding: 20px 12px; }
    .suprah-message-column { max-width: 82%; }
  }
  /* ── Conversation Scrollbar Fix ───────────────────────── */
  .suprah-conversation-shell {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .suprah-message-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
    scrollbar-width: thin;
  }

  .suprah-message-area::-webkit-scrollbar {
    width: 8px;
  }

  .suprah-message-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .suprah-message-area::-webkit-scrollbar-thumb {
    background: var(--scrollbar);
    border-radius: 999px;
  }

  .suprah-message-area::-webkit-scrollbar-thumb:hover {
    background: rgba(120, 120, 120, 0.75);
  }
`;

export function injectLeadDetailsPanelStyles() {
  if (
    typeof document === "undefined" ||
    document.getElementById("lead-details-panel-styles")
  )
    return;
  const style = document.createElement("style");
  style.id = "lead-details-panel-styles";
  style.textContent = LEAD_DETAILS_PANEL_CSS;
  document.head.appendChild(style);
}