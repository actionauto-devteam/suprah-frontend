"use client";

import * as React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { sendToExtension, suprahExtensionIds } from "@/lib/suprahExtension";

interface ExtensionStatus {
  ok?: boolean;
  signedIn?: boolean;
  username?: string;
  autoSignIn?: boolean;
  challenge?: string;
}

interface SignInCode {
  code?: string;
  username?: string;
}

const RECHECK_MS = 30_000;
const UNAVAILABLE_KEY = "suprah_ext_auto_sign_in_unavailable";
const USERNAME_PREFIX = "suprah_ext_crm_username:";

function readStorage(storage: "local" | "session", key: string) {
  try {
    return (storage === "local" ? localStorage : sessionStorage).getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorage(storage: "local" | "session", key: string, value: string | null) {
  try {
    const target = storage === "local" ? localStorage : sessionStorage;
    if (value) target.setItem(key, value);
    else target.removeItem(key);
  } catch {
    return;
  }
}

function forgetKnownUsernames() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(USERNAME_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    return;
  }
}

function storedCrmToken(): { token: string; id: string } | null {
  try {
    const token = localStorage.getItem("crm_token") || "";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { type?: string; exp?: number; id?: string };
    const current = payload.type === "crm" && typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 60_000;
    return current ? { token, id: String(payload.id || "") } : null;
  } catch {
    return null;
  }
}

export function ExtensionAutoSignIn({ enabled }: { enabled: boolean }) {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const running = React.useRef(false);
  const lastCheck = React.useRef(0);

  const connect = React.useCallback(async (force: boolean) => {
    if (running.current || readStorage("session", UNAVAILABLE_KEY)) return;
    if (!force && Date.now() - lastCheck.current < RECHECK_MS) return;
    running.current = true;
    lastCheck.current = Date.now();
    try {
      const crmToken = storedCrmToken();
      const identity = String(userId || crmToken?.id || "");
      if (!identity) return;
      const cacheKey = `${USERNAME_PREFIX}${identity}`;
      for (const extensionId of suprahExtensionIds()) {
        const status = await sendToExtension<ExtensionStatus>(extensionId, { type: "suprah:extension-status" });
        if (!status?.ok || status.autoSignIn === false || !status.challenge) continue;
        const knownUser = readStorage("local", cacheKey);
        if (status.signedIn && knownUser && status.username === knownUser) continue;
        const token = crmToken?.token || (await getToken());
        if (!token) return;
        const response = await apiClient.post("/api/crm/extension-sign-in/code", { challenge: status.challenge }, { headers: { Authorization: `Bearer ${token}` } });
        const data = (response.data?.data || {}) as SignInCode;
        if (!data.code) continue;
        writeStorage("local", cacheKey, data.username || null);
        if (status.signedIn && data.username && status.username === data.username) continue;
        await sendToExtension(extensionId, { type: "suprah:extension-sign-in", code: data.code }, 10_000);
      }
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status === 403) writeStorage("session", UNAVAILABLE_KEY, "1");
    } finally {
      running.current = false;
    }
  }, [getToken, userId]);

  React.useEffect(() => {
    if (!enabled || !isLoaded || (!isSignedIn && !storedCrmToken())) return;
    void connect(true);
    const onFocus = () => void connect(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") void connect(false);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, isLoaded, isSignedIn, connect]);

  React.useEffect(() => {
    const signOutExtension = () => {
      forgetKnownUsernames();
      writeStorage("session", UNAVAILABLE_KEY, null);
      for (const extensionId of suprahExtensionIds()) void sendToExtension(extensionId, { type: "suprah:extension-sign-out" });
    };
    window.addEventListener("suprah:clear-private-cache", signOutExtension);
    return () => window.removeEventListener("suprah:clear-private-cache", signOutExtension);
  }, []);

  return null;
}
