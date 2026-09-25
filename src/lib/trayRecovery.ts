export type TrayRecoveryPhase = "checking" | "waking" | "finishing"

export type TrayRecoveryOutcome = "online" | "needs_finish" | "failed" | "cancelled" | "legacy"

export type TrayRegistration = boolean | "disabled" | null

export const WAKE_WINDOW_MS = 30_000
export const FINISH_WINDOW_MS = 30_000
export const RECOVERY_POLL_MS = 2_000

export interface TrayRecoveryDeps {
  isOnline(): Promise<boolean>
  getRegistration(): Promise<TrayRegistration>
  mintCode(): Promise<string | null>
  openWake(): boolean
  openConnect(code: string): boolean
  isCancelled(): boolean
  onPhase?(phase: TrayRecoveryPhase): void
  sleep?(ms: number): Promise<void>
  now?(): number
}

type PollResult = "online" | "timeout" | "cancelled"

const pollUntilOnline = async (deps: TrayRecoveryDeps, windowMs: number): Promise<PollResult> => {
  const now = deps.now ?? Date.now
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const endsAt = now() + windowMs
  while (now() < endsAt) {
    await sleep(RECOVERY_POLL_MS)
    if (deps.isCancelled()) return "cancelled"
    if (await deps.isOnline()) return "online"
  }
  return "timeout"
}

export const finishTrayConnection = async (deps: TrayRecoveryDeps): Promise<TrayRecoveryOutcome> => {
  if (deps.isCancelled()) return "cancelled"
  deps.onPhase?.("finishing")
  const code = await deps.mintCode()
  if (!code) return "failed"
  deps.openConnect(code)
  const result = await pollUntilOnline(deps, FINISH_WINDOW_MS)
  return result === "online" ? "online" : result === "cancelled" ? "cancelled" : "failed"
}

export const recoverTray = async (deps: TrayRecoveryDeps): Promise<TrayRecoveryOutcome> => {
  if (deps.isCancelled()) return "cancelled"
  deps.onPhase?.("checking")
  if (await deps.isOnline()) return "online"
  const registration = await deps.getRegistration()
  if (registration === "disabled") return "legacy"
  if (registration === false) return finishTrayConnection(deps)
  deps.onPhase?.("waking")
  deps.openWake()
  const result = await pollUntilOnline(deps, WAKE_WINDOW_MS)
  if (result === "online") return "online"
  if (result === "cancelled") return "cancelled"
  return "needs_finish"
}
