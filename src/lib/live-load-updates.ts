import type { Socket } from "socket.io-client";

/*
 * Keeps a load list current without the dispatcher refreshing the page.
 * The server sends "load:change" to the organization for every load that is
 * created, edited, moved to a new status by the driver or dispatch, or
 * deleted. This:
 *  - removes a deleted load from the screen straight away (onDeleted);
 *  - refreshes once for a burst of changes (a pickup can send several);
 *  - refreshes after the connection comes back, in case changes were missed;
 *  - refreshes every 2 minutes while the page is on screen, as a safety net.
 */

const BURST_WAIT_MS = 400;
export const LIVE_SAFETY_REFRESH_MS = 2 * 60_000;

type LoadChange = { action?: string; loadId?: string };
/** "change": a load changed. "reconnect" and "check" may find nothing new. */
export type LoadRefreshReason = "change" | "reconnect" | "check";

export function subscribeToLoadChanges(
  socket: Socket,
  handlers: { refresh: (reason: LoadRefreshReason) => void; onDeleted?: (loadId: string) => void },
): () => void {
  let burstTimer: ReturnType<typeof setTimeout> | null = null;
  let burstReason: LoadRefreshReason = "check";
  let wasDisconnected = !socket.connected;

  const refreshSoon = (reason: LoadRefreshReason) => {
    if (reason === "change" || burstReason !== "change") burstReason = reason;
    if (burstTimer) clearTimeout(burstTimer);
    burstTimer = setTimeout(() => {
      burstTimer = null;
      const reasonNow = burstReason;
      burstReason = "check";
      handlers.refresh(reasonNow);
    }, BURST_WAIT_MS);
  };

  const onLoadChange = (change?: LoadChange) => {
    const loadId = String(change?.loadId ?? "");
    if (change?.action === "deleted" && loadId) handlers.onDeleted?.(loadId);
    refreshSoon("change");
  };
  const onDisconnect = () => {
    wasDisconnected = true;
  };
  const onConnect = () => {
    if (!wasDisconnected) return;
    wasDisconnected = false;
    refreshSoon("reconnect");
  };
  const safetyTimer = setInterval(() => {
    if (typeof document === "undefined" || document.visibilityState === "visible") handlers.refresh("check");
  }, LIVE_SAFETY_REFRESH_MS);

  socket.on("load:change", onLoadChange);
  socket.on("disconnect", onDisconnect);
  socket.on("connect", onConnect);

  return () => {
    if (burstTimer) clearTimeout(burstTimer);
    clearInterval(safetyTimer);
    socket.off("load:change", onLoadChange);
    socket.off("disconnect", onDisconnect);
    socket.off("connect", onConnect);
  };
}
