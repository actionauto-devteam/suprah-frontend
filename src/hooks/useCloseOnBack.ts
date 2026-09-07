import { useEffect, useLayoutEffect, useRef } from "react";

const HISTORY_MARKER = "__dialogBack";

/**
 * Makes the Android/Chrome hardware or gesture back button close an open
 * Dialog/Sheet instead of navigating away or exiting the app — Radix's
 * Dialog only reacts to Escape/overlay-click/onOpenChange, not popstate.
 *
 * Pushes one history entry while `open` is true and pops it again once the
 * dialog closes by any other means, so the driver's real back-stack is left
 * untouched. If something else (a route change) pushes on top of that entry
 * before we get to it, we skip popping — that entry isn't ours to touch.
 */
export function useCloseOnBack(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    window.history.pushState({ [HISTORY_MARKER]: true }, "");
    pushedRef.current = true;

    const handlePopState = () => {
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        if ((window.history.state as Record<string, unknown> | null)?.[HISTORY_MARKER]) {
          window.history.back();
        }
      }
    };
  }, [open]);
}
