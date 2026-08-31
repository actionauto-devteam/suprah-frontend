"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useCrmUser } from "@/hooks/useCrmUser";

// Temporary, single-purpose debugging aid — NOT a permanent feature. Remove
// this whole file (and its mount point in the dashboard layout) once mobile
// push debugging is done.
//
// Double-gated so no one else can ever trigger it, even by guessing the URL:
// (1) a long random secret in the query string, AND (2) the logged-in CRM
// account must match a specific, hardcoded email. Both must hold at once.
const DEBUG_SECRET = "ss-mobile-push-9f2a7c4e1b6d8035";
const ALLOWED_EMAIL = "charl@suprahai.com";

export function DebugConsole() {
  const searchParams = useSearchParams();
  const { user } = useCrmUser();
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    if (loadedRef.current) return;
    if (searchParams.get("ssdebug") !== DEBUG_SECRET) return;
    if (!user || user.email?.toLowerCase() !== ALLOWED_EMAIL) return;

    loadedRef.current = true;
    import("eruda").then((eruda) => {
      eruda.default.init();
    });
  }, [searchParams, user]);

  return null;
}
