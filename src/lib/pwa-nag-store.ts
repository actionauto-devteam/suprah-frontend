type Listener = () => void;

interface NagState {
  activeId: string | null;
  activePriority: number;
}

const EMPTY_STATE: NagState = { activeId: null, activePriority: 0 };

let state: NagState = EMPTY_STATE;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribePwaNag(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaNagSnapshot() {
  return state;
}

// Must return a referentially-stable value across calls (React's
// useSyncExternalStore contract) — returning a fresh object literal here
// every render made React log "The result of getServerSnapshot should be
// cached to avoid an infinite loop" on every one of this hook's consumers
// (InstallPrompt, PushPrompt, IOSInstallHint, CrmPushPrompt,
// DashboardNotifications, AutrixWelcomeSystem, InstallSupraSpaceButton) —
// a real runtime bug that never showed up in tsc/build, only in the browser
// console, and could plausibly present as sluggish/glitchy mobile behavior
// from the extra re-render churn.
export function getPwaNagServerSnapshot(): NagState {
  return EMPTY_STATE;
}

export function claimPwaNag(id: string, priority: number): boolean {
  if (state.activeId === id) return true;
  if (state.activeId === null || priority > state.activePriority) {
    state = { activeId: id, activePriority: priority };
    emit();
    return true;
  }
  return false;
}

export function releasePwaNag(id: string) {
  if (state.activeId !== id) return;
  state = { activeId: null, activePriority: 0 };
  emit();
}
