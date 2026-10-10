import type { AxiosResponse } from "axios";
import { apiClient, lastWriteAt } from "@/lib/api-client";

/*
 * When a Driver Portal page opens, several parts of it ask for the same data at
 * the same moment (the Driver Page, the work-availability check and location
 * sharing each load the driver profile). Reads of the same address with the
 * same sign-in that start within JOIN_WINDOW_MS of each other share one network
 * request instead of sending it two or three times.
 *
 * Nothing is kept once a request finishes, and a read never joins a request
 * that started before the last change the user made, so data is never older
 * than a normal request would return.
 */
const JOIN_WINDOW_MS = 1_000;

type Entry = { startedAt: number; promise: Promise<AxiosResponse> };
const inFlight = new Map<string, Entry>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same default as apiClient.get, which callers rely on
export function sharedGet<T = any>(url: string, token: string): Promise<AxiosResponse<T>> {
  // The sign-in is part of the key, so different users never share a response.
  const key = `${token}\n${url}`;
  const now = Date.now();
  const existing = inFlight.get(key);
  if (existing && now - existing.startedAt < JOIN_WINDOW_MS && existing.startedAt > lastWriteAt()) {
    return existing.promise as Promise<AxiosResponse<T>>;
  }

  const promise = apiClient.get<T>(url, { headers: { Authorization: `Bearer ${token}` } });
  const entry: Entry = { startedAt: now, promise };
  inFlight.set(key, entry);
  const forget = () => {
    if (inFlight.get(key) === entry) inFlight.delete(key);
  };
  promise.then(forget, forget);
  return promise;
}
