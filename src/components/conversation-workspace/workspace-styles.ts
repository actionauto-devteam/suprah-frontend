export const CONVERSATION_WORKSPACE_CSS = `
  .cw-workspace {
    background: var(--bg-base);
    color: var(--text-primary);
  }

  .cw-workspace input,
  .cw-workspace textarea,
  .cw-workspace select {
    color: var(--text-primary);
    caret-color: var(--accent);
  }

  .cw-workspace input::placeholder,
  .cw-workspace textarea::placeholder {
    color: var(--text-tertiary);
    opacity: 1;
  }

  .cw-workspace select option {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .cw-workspace button:focus-visible,
  .cw-workspace input:focus-visible,
  .cw-workspace textarea:focus-visible,
  .cw-workspace select:focus-visible,
  .cw-workspace [role="button"]:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .cw-list-slot {
    width: 340px;
    min-width: 300px;
    max-width: 360px;
    flex-basis: 340px;
    overflow: hidden;
    background: var(--bg-elevated);
  }

  .cw-center-slot { background: var(--bg-base); }

  .cw-details-slot {
    width: 370px;
    min-width: 330px;
    max-width: 390px;
    flex-basis: 370px;
    overflow: hidden;
    background: var(--bg-elevated);
    border-left: 1px solid var(--border-1);
  }

  .cw-list-shell,
  .cw-details-panel {
    min-height: 0;
    min-width: 0;
    color: var(--text-primary);
  }

  .cw-details-scroll,
  .cw-activity-list,
  .cw-activity-card {
    min-width: 0;
  }

  .cw-activity-card {
    border-color: var(--border-1);
  }

  .cw-details-overlay {
    position: absolute;
    inset: 0 0 0 auto;
    z-index: 70;
    width: min(92vw, 370px);
    min-width: min(92vw, 300px);
    max-width: 370px;
    box-shadow: -18px 0 50px rgba(0,0,0,.38);
    animation: cw-details-in 180ms ease-out;
  }

  @keyframes cw-details-in {
    from { opacity: 0; transform: translateX(18px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @media (max-width: 1439px) {
    .cw-list-slot {
      width: 320px;
      min-width: 280px;
      max-width: 340px;
      flex-basis: 320px;
    }
    .cw-details-slot {
      width: 340px;
      min-width: 300px;
      max-width: 360px;
      flex-basis: 340px;
    }
  }

  @media (max-width: 1023px) {
    .cw-workspace[data-has-selection="false"] .cw-list-slot {
      width: 100%;
      min-width: 0;
      max-width: none;
      flex: 1 1 auto;
    }
    .cw-center-slot { width: 100%; }
  }

  @media (max-width: 639px) {
    .cw-details-overlay {
      width: 100%;
      min-width: 0;
      max-width: none;
    }
    .cw-quick-actions {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }
`;

export function injectConversationWorkspaceStyles() {
  if (typeof document === "undefined") return;

  let style = document.getElementById(
    "conversation-workspace-styles",
  ) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement("style");
    style.id = "conversation-workspace-styles";
    document.head.appendChild(style);
  }

  style.textContent = CONVERSATION_WORKSPACE_CSS;
}