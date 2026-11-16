import type { Socket } from "socket.io-client"

/*
 * Keeps the Quotes tab current (2026-11-16): the server sends "quote:change"
 * for every quote that's created, edited, answered or deleted. A burst of
 * changes (several staff, or a customer request plus its answer) refreshes
 * once instead of once per change, like load changes.
 */
export const QUOTE_BURST_WAIT_MS = 400

export function subscribeToQuoteChanges(socket: Socket, refresh: () => void): () => void {
  let burstTimer: ReturnType<typeof setTimeout> | null = null
  const onQuoteChange = () => {
    if (burstTimer) clearTimeout(burstTimer)
    burstTimer = setTimeout(() => {
      burstTimer = null
      refresh()
    }, QUOTE_BURST_WAIT_MS)
  }
  socket.on("quote:change", onQuoteChange)
  return () => {
    if (burstTimer) clearTimeout(burstTimer)
    socket.off("quote:change", onQuoteChange)
  }
}
