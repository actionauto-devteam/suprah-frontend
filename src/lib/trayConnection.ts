export const TRAY_AUTH_URL = "http://127.0.0.1:18642/auth"
export const TRAY_PROTOCOL_URL = "actionauto://auth"
export const TRAY_WAKE_URL = "actionauto://wake"
export const TRAY_CONNECT_URL = "actionauto://connect"

export type TrayPushResult = "connected" | "rejected" | "unreachable" | "no-token"

export function getActiveTrayToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const crmToken = localStorage.getItem("crm_token")
    if (crmToken) return crmToken
  } catch {
    return null
  }
  return (window as unknown as { __AUTH_TOKEN__?: string }).__AUTH_TOKEN__ || null
}

export async function pushTokenToTray(
  token: string | null = getActiveTrayToken(),
  timeoutMs = 2000
): Promise<TrayPushResult> {
  if (!token) return "no-token"
  try {
    const res = await fetch(TRAY_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (res.ok) return "connected"
    return res.status === 401 ? "rejected" : "unreachable"
  } catch {
    return "unreachable"
  }
}

export function openTrayViaProtocol(token: string | null = getActiveTrayToken()): boolean {
  if (!token || typeof window === "undefined") return false
  try {
    window.location.href = `${TRAY_PROTOCOL_URL}?token=${encodeURIComponent(token)}`
    return true
  } catch {
    return false
  }
}

function launchTrayLink(url: string): boolean {
  if (typeof window === "undefined") return false
  try {
    window.location.href = url
    return true
  } catch {
    return false
  }
}

export function openTrayWake(): boolean {
  return launchTrayLink(TRAY_WAKE_URL)
}

export function openTrayConnect(code: string): boolean {
  return code ? launchTrayLink(`${TRAY_CONNECT_URL}?code=${encodeURIComponent(code)}`) : false
}
