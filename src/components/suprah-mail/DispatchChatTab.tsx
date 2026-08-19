"use client";

import * as React from "react";
import {
  Loader2,
  MessageSquare,
  Navigation2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DispatchChatInlinePane } from "@/components/suprah-mail/DispatchChatInlinePane";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { subscribeToDispatchChatRealtime } from "@/hooks/useDispatchChatUnread";
import { cn, resolveImageUrl } from "@/lib/utils";
import { fmtListDate } from "@/components/suprah-mail/utils";
import { useAuth } from "@/providers/AuthProvider";

type DriverFilter = "all" | "active-load" | "sharing" | "offline";
type DriverOperationalStatus = "active" | "on_leave" | "maintenance";

type DirectoryLoad = {
  id: string;
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  vehicleCount: number;
};

type DirectoryDriver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  isActive: boolean;
  status: string;
  operationalStatus: DriverOperationalStatus;
  assignable: boolean;
  isSharing: boolean;
  lastSeenAt: string | null;
  activeLoadCount: number;
  shipments: DirectoryLoad[];
};

type DispatchThreadMeta = {
  threadId: string;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  unreadCount: number;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function statusLabel(status: string) {
  switch (status) {
    case "on-route": return "On Route";
    case "on-break": return "On Break";
    case "waiting": return "Waiting";
    case "idle": return "Idle";
    default: return "Offline";
  }
}

function statusDot(status: string) {
  switch (status) {
    case "on-route": return "bg-emerald-500";
    case "idle": return "bg-amber-500";
    case "waiting": return "bg-blue-500";
    case "on-break": return "bg-slate-500";
    default: return "bg-slate-400";
  }
}

function normalizeOperationalStatus(value: unknown): DriverOperationalStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "on_leave") return "on_leave";
  if (normalized === "maintenance") return "maintenance";
  return "active";
}

function workAvailabilityLabel(status: DriverOperationalStatus) {
  if (status === "on_leave") return "On Leave";
  if (status === "maintenance") return "In Shop";
  return "Active";
}

function normalizeDriver(item: any): DirectoryDriver {
  const shipments = Array.isArray(item?.shipments)
    ? item.shipments.map((shipment: any): DirectoryLoad => ({
        id: String(shipment?.id ?? ""),
        trackingNumber: String(shipment?.trackingNumber ?? ""),
        status: String(shipment?.status ?? "Assigned"),
        origin: String(shipment?.origin ?? ""),
        destination: String(shipment?.destination ?? ""),
        vehicleCount: Number(shipment?.vehicleCount ?? 0),
      }))
    : [];

  return {
    id: String(item?.id ?? ""),
    name: String(item?.name ?? "Driver"),
    email: String(item?.email ?? ""),
    phone: String(item?.phone ?? ""),
    avatar: item?.avatar ? String(item.avatar) : null,
    isActive: item?.isActive !== false,
    status: String(item?.presence?.status ?? "offline"),
    operationalStatus: normalizeOperationalStatus(
      item?.equipment?.operationalStatus,
    ),
    assignable: Boolean(item?.assignable),
    isSharing: Boolean(item?.presence?.isSharing),
    lastSeenAt: item?.presence?.lastSeenAt ? String(item.presence.lastSeenAt) : null,
    activeLoadCount: Number(item?.activeLoadCount ?? shipments.length),
    shipments,
  };
}

function driverMatchesSearch(driver: DirectoryDriver, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return [
    driver.name,
    driver.email,
    driver.phone,
    workAvailabilityLabel(driver.operationalStatus),
    statusLabel(driver.status),
    driver.isSharing ? "location sharing" : "not sharing location",
    ...driver.shipments.flatMap((load) => [
      load.trackingNumber,
      load.status,
      load.origin,
      load.destination,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function filterDriver(driver: DirectoryDriver, filter: DriverFilter) {
  if (filter === "active-load") return driver.activeLoadCount > 0;
  if (filter === "sharing") return driver.isSharing;
  if (filter === "offline") return driver.status === "offline";
  return true;
}

function DriverRow({
  driver,
  selected,
  chatMeta,
  collapsed,
  onSelect,
}: {
  driver: DirectoryDriver;
  selected: boolean;
  chatMeta?: DispatchThreadMeta;
  collapsed: boolean;
  onSelect: () => void;
}) {
  const avatar = driver.avatar ? resolveImageUrl(driver.avatar) : undefined;
  const primaryLoad = driver.shipments[0] ?? null;
  const unread = Math.max(0, Number(chatMeta?.unreadCount ?? 0));
  const preview =
    chatMeta?.lastMessagePreview ||
    (primaryLoad
      ? `${primaryLoad.trackingNumber || "Active load"}${
          primaryLoad.origin || primaryLoad.destination
            ? ` · ${primaryLoad.origin || "Origin"} → ${primaryLoad.destination || "Destination"}`
            : ""
        }`
      : "No Dispatch Chat messages yet");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "sm5-conv-row group flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-left",
        selected && "sm5-conv-active",
        unread > 0 && "bg-emerald-500/5",
        collapsed && "lg:justify-center lg:px-2",
      )}
      aria-pressed={selected}
      title={collapsed ? driver.name : undefined}
    >
      <div className="relative shrink-0">
        <Avatar className="size-9 border border-border/60 transition-transform duration-150 group-hover:scale-[1.04]">
          {avatar && <AvatarImage src={avatar} alt={driver.name} className="object-cover" />}
          <AvatarFallback className="bg-emerald-500/10 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
            {initials(driver.name)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background",
            statusDot(driver.status),
          )}
          title={statusLabel(driver.status)}
        />
        {collapsed && unread > 0 && (
          <span
            className="absolute -right-1 -top-1 hidden min-w-4 rounded-full bg-emerald-600 px-1 text-center text-[8px] font-black leading-4 text-white lg:block"
            aria-label={`${unread} unread`}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>

      <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn("sm5-title-sm truncate", unread > 0 ? "font-bold" : "font-semibold")}
            style={{ fontSize: 13.5, color: "var(--text-primary)" }}
          >
            {driver.name}
          </p>
          {driver.activeLoadCount > 0 && (
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
              {driver.activeLoadCount} active
            </span>
          )}
        </div>

        <div
          className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span className="shrink-0">
            Work:{" "}
            <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
              {workAvailabilityLabel(driver.operationalStatus)}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            Activity:{" "}
            <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
              {statusLabel(driver.status)}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex min-w-0 items-center gap-1">
            {driver.isSharing && (
              <Navigation2 className="size-3 shrink-0 text-emerald-500" />
            )}
            <span
              className="truncate font-semibold"
              style={{
                color: driver.isSharing
                  ? "var(--accent-text)"
                  : "var(--text-secondary)",
              }}
            >
              GPS: {driver.isSharing ? "Sharing" : "Not sharing"}
            </span>
          </span>
        </div>

        <p
          className="sm5-supporting mt-0.5 truncate"
          style={{
            fontSize: 11.5,
            fontWeight: unread > 0 ? 600 : 400,
            color: unread > 0 ? "var(--text-primary)" : "var(--text-tertiary)",
          }}
        >
          {preview}
        </p>
      </div>

      <div
        className={cn(
          "ml-1 flex shrink-0 flex-col items-end gap-1.5 self-stretch py-0.5",
          collapsed && "lg:hidden",
        )}
      >
        <span
          className="sm5-mono min-h-4 whitespace-nowrap font-semibold"
          style={{
            fontSize: 11.5,
            color: chatMeta?.lastMessageAt ? "var(--text-secondary)" : "var(--text-disabled)",
          }}
        >
          {chatMeta?.lastMessageAt
            ? fmtListDate(new Date(chatMeta.lastMessageAt).getTime())
            : ""}
        </span>

        {unread > 0 && (
          <span
            className="shrink-0 rounded-full text-center font-bold text-white"
            style={{
              fontSize: 9,
              minWidth: 18,
              height: 18,
              lineHeight: "18px",
              padding: "0 5px",
              background: "var(--accent)",
            }}
            aria-label={`${unread} unread Dispatch Chat message${unread === 1 ? "" : "s"}`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
    </button>
  );
}

function NewDispatchChatModal({
  drivers,
  threadMetaByDriver,
  onClose,
  onSelect,
}: {
  drivers: DirectoryDriver[];
  threadMetaByDriver: Record<string, DispatchThreadMeta>;
  onClose: () => void;
  onSelect: (driverId: string) => void;
}) {
  const [query, setQuery] = React.useState("");

  const visibleDrivers = React.useMemo(
    () => drivers.filter((driver: DirectoryDriver) => driverMatchesSearch(driver, query)),
    [drivers, query],
  );

  return (
    <div
      className="sm5-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sm5-modal sm5-sheet flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:rounded-2xl"
        style={{ maxHeight: "calc(100dvh - 32px)" }}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
      >
        <div
          className="sm5-modal-header flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-1)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
            <div className="min-w-0">
              <h2 className="sm5-title-lg truncate" style={{ fontSize: 16, color: "var(--text-primary)" }}>
                New Dispatch Chat
              </h2>
              <p className="sm5-supporting mt-1 truncate" style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                Choose a driver to open your private conversation
              </p>
            </div>
          </div>
          <button onClick={onClose} className="sm5-icon-btn h-7 w-7 shrink-0" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 p-3" style={{ borderBottom: "1px solid var(--border-1)" }}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              autoFocus
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Search drivers, loads or routes…"
              className="sm5-input h-10 w-full pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm5-scroll">
          {visibleDrivers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <Users className="size-7" style={{ color: "var(--text-disabled)" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                No matching drivers
              </p>
              <p className="max-w-64 text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                Try another driver name, load number, city, or route.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {visibleDrivers.map((driver: DirectoryDriver) => {
                const meta = threadMetaByDriver[driver.id];
                const unread = Math.max(0, Number(meta?.unreadCount ?? 0));

                return (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => onSelect(driver.id)}
                    className={cn(
                      "sm5-conv-row group flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-left",
                      unread > 0 && "bg-emerald-500/5",
                    )}
                  >
                    <Avatar className="size-9 shrink-0 border border-border/60 transition-transform duration-150 group-hover:scale-[1.04]">
                      {driver.avatar && (
                        <AvatarImage
                          src={resolveImageUrl(driver.avatar)}
                          alt={driver.name}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-emerald-500/10 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                        {initials(driver.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p
                          className={cn("sm5-title-sm truncate", unread > 0 ? "font-bold" : "font-semibold")}
                          style={{ fontSize: 13, color: "var(--text-primary)" }}
                        >
                          {driver.name}
                        </p>
                        {driver.activeLoadCount > 0 && (
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                            {driver.activeLoadCount} active
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {meta?.lastMessagePreview ||
                          `${workAvailabilityLabel(driver.operationalStatus)} · ${statusLabel(driver.status)}${driver.email ? ` · ${driver.email}` : ""}`}
                      </p>
                    </div>

                    <div className="ml-1 flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className="sm5-mono min-h-4 whitespace-nowrap font-semibold"
                        style={{
                          fontSize: 11.5,
                          color: meta?.lastMessageAt ? "var(--text-secondary)" : "var(--text-disabled)",
                        }}
                      >
                        {meta?.lastMessageAt
                          ? fmtListDate(new Date(meta.lastMessageAt).getTime())
                          : ""}
                      </span>
                      {unread > 0 && (
                        <span
                          className="rounded-full text-center font-bold text-white"
                          style={{
                            fontSize: 9,
                            minWidth: 18,
                            height: 18,
                            lineHeight: "18px",
                            padding: "0 5px",
                            background: "var(--accent)",
                          }}
                        >
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DispatchChatTab({
  unreadTotal,
  onUnreadRefresh,
  refreshSignal = 0,
}: {
  unreadTotal: number;
  onUnreadRefresh: () => void | Promise<void>;
  refreshSignal?: number;
}) {
  const { getToken, isSignedIn } = useAuth();
  const [drivers, setDrivers] = React.useState<DirectoryDriver[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<DriverFilter>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [railCollapsed, setRailCollapsed] = React.useState(false);

  React.useEffect(() => {
    setRailCollapsed(
      localStorage.getItem("sm5_dispatch_chat_rail_collapsed") === "1",
    );
  }, []);

  const toggleRail = () => {
    setRailCollapsed((current) => {
      const next = !current;
      localStorage.setItem(
        "sm5_dispatch_chat_rail_collapsed",
        next ? "1" : "0",
      );
      return next;
    });
  };

  const [threadMetaByDriver, setThreadMetaByDriver] = React.useState<
    Record<string, DispatchThreadMeta>
  >({});

  const driversRef = React.useRef<DirectoryDriver[]>([]);
  const selectedIdRef = React.useRef<string | null>(selectedId);
  const requestInFlightRef = React.useRef(false);

  // Per-driver unread metadata must never drop a socket reconciliation just
  // because /dispatch-chat/threads is already in flight.
  const threadMetaInFlightRef = React.useRef<Promise<void> | null>(null);
  const threadMetaPendingRef = React.useRef(false);

  // Protect socket-newer row counts from being overwritten by a temporarily
  // older /threads response. Entries are cleared once the server count catches
  // up, or when the user opens/reads that exact conversation.
  const optimisticUnreadMessageIdsRef = React.useRef<
    Map<string, Set<string>>
  >(new Map());

  const threadMetaRefreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const directoryRefreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualRefreshSignalRef = React.useRef(refreshSignal);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const fetchThreadMeta = React.useCallback(async () => {
    if (!isSignedIn) return;

    if (threadMetaInFlightRef.current) {
      // Preserve one exact reconciliation after the current request. Without
      // this, a second incoming message can be lost when its socket event lands
      // while the first /threads request is still running.
      threadMetaPendingRef.current = true;
      return threadMetaInFlightRef.current;
    }

    let request!: Promise<void>;

    request = (async () => {
      try {
        do {
          threadMetaPendingRef.current = false;

          try {
            const token = await getToken();
            if (!token) return;

            const response = await apiClient.get(
              "/api/driver-tracking/dispatch-chat/threads",
              {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30_000,
              },
            );

            const rawThreads: unknown[] = Array.isArray(
              response.data?.data?.threads,
            )
              ? response.data.data.threads
              : [];

            const next: Record<string, DispatchThreadMeta> = {};

            for (const rawThread of rawThreads) {
              const thread = rawThread as {
                id?: unknown;
                driver?: { id?: unknown };
                unreadCount?: unknown;
                lastMessageAt?: unknown;
                lastMessagePreview?: unknown;
              };

              const driverId = String(
                thread.driver?.id ?? "",
              ).trim();
              if (!driverId) continue;

              next[driverId] = {
                threadId: String(thread.id ?? ""),
                lastMessageAt: thread.lastMessageAt
                  ? String(thread.lastMessageAt)
                  : null,
                lastMessagePreview: String(
                  thread.lastMessagePreview ?? "",
                ),
                unreadCount: Math.max(
                  0,
                  Number(thread.unreadCount ?? 0),
                ),
              };
            }

            setThreadMetaByDriver((currentMap) => {
              const merged: Record<string, DispatchThreadMeta> = {
                ...next,
              };

              for (const [driverId, pendingIds] of
                optimisticUnreadMessageIdsRef.current.entries()) {
                const current = currentMap[driverId];
                const server = next[driverId];

                if (!current || pendingIds.size === 0) {
                  optimisticUnreadMessageIdsRef.current.delete(driverId);
                  continue;
                }

                // Once the server reaches (or exceeds) the socket-optimistic
                // count, it has caught up and becomes fully authoritative.
                if (
                  server &&
                  server.unreadCount >= current.unreadCount
                ) {
                  optimisticUnreadMessageIdsRef.current.delete(driverId);
                  continue;
                }

                // Until then, retain the socket-newer count/preview/timestamp.
                // This prevents a fast immediate +1 from flashing back to the
                // old value for tens of seconds/minutes.
                merged[driverId] = {
                  ...(server || current),
                  unreadCount: current.unreadCount,
                  lastMessageAt:
                    current.lastMessageAt ??
                    server?.lastMessageAt ??
                    null,
                  lastMessagePreview:
                    current.lastMessagePreview ||
                    server?.lastMessagePreview ||
                    "",
                };
              }

              return merged;
            });
          } catch {
            // Keep the last successful snapshot. A queued socket event or the
            // next reconnect/manual refresh will reconcile again.
          }
        } while (threadMetaPendingRef.current);
      } finally {
        if (threadMetaInFlightRef.current === request) {
          threadMetaInFlightRef.current = null;
        }
      }
    })();

    threadMetaInFlightRef.current = request;
    return request;
  }, [getToken, isSignedIn]);

  const fetchDrivers = React.useCallback(
    async (silent = false) => {
      if (!isSignedIn || requestInFlightRef.current) return;

      requestInFlightRef.current = true;
      const hasCachedDrivers = driversRef.current.length > 0;

      if (!hasCachedDrivers) setLoading(true);

      if (!hasCachedDrivers) setError(null);
      setRefreshWarning(null);

      try {
        const token = await getToken();
        if (!token) throw new Error("Your session is not available.");

        const response = await apiClient.get("/api/driver-tracking/org-drivers", {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30_000,
        });

        const rawDrivers: unknown[] = Array.isArray(response.data?.data?.drivers)
          ? response.data.data.drivers
          : [];

        const nextDrivers: DirectoryDriver[] = rawDrivers
          .map((item: unknown) => normalizeDriver(item))
          .filter((driver: DirectoryDriver) => Boolean(driver.id));

        driversRef.current = nextDrivers;
        setDrivers(nextDrivers);
        setError(null);
        setRefreshWarning(null);
        setSelectedId((current: string | null) =>
          current &&
          nextDrivers.some(
            (driver: DirectoryDriver) => driver.id === current,
          )
            ? current
            : null,
        );
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Could not load the driver directory.";

        if (driversRef.current.length > 0) {
          setError(null);
          setRefreshWarning(
            "Driver updates are temporarily delayed. Showing the last successful directory.",
          );
        } else {
          setError(message);
          if (!silent) toast.error(message);
        }
      } finally {
        requestInFlightRef.current = false;
        setLoading(false);
      }

      void fetchThreadMeta();
    },
    [fetchThreadMeta, getToken, isSignedIn],
  );

  const patchThreadMeta = React.useCallback(
    (
      driverId: string,
      patch:
        | Partial<DispatchThreadMeta>
        | ((
            current: DispatchThreadMeta | undefined,
          ) => Partial<DispatchThreadMeta>),
    ) => {
      if (!driverId) return;

      setThreadMetaByDriver((currentMap) => {
        const current = currentMap[driverId];
        const resolvedPatch =
          typeof patch === "function"
            ? patch(current)
            : patch;

        const next: DispatchThreadMeta = {
          threadId: String(
            resolvedPatch.threadId ??
              current?.threadId ??
              "",
          ),
          lastMessageAt:
            resolvedPatch.lastMessageAt !== undefined
              ? resolvedPatch.lastMessageAt
              : current?.lastMessageAt ?? null,
          lastMessagePreview:
            resolvedPatch.lastMessagePreview !== undefined
              ? resolvedPatch.lastMessagePreview
              : current?.lastMessagePreview ?? "",
          unreadCount: Math.max(
            0,
            Number(
              resolvedPatch.unreadCount ??
                current?.unreadCount ??
                0,
            ),
          ),
        };

        if (
          current &&
          current.threadId === next.threadId &&
          current.lastMessageAt === next.lastMessageAt &&
          current.lastMessagePreview ===
            next.lastMessagePreview &&
          current.unreadCount === next.unreadCount
        ) {
          return currentMap;
        }

        return {
          ...currentMap,
          [driverId]: next,
        };
      });
    },
    [],
  );

  const patchDriver = React.useCallback(
    (driverId: string, patch: Partial<DirectoryDriver>) => {
      if (!driverId || Object.keys(patch).length === 0) return;

      let changed = false;
      const nextDrivers = driversRef.current.map((driver) => {
        if (driver.id !== driverId) return driver;

        const nextDriver = { ...driver, ...patch };
        const isSame =
          nextDriver.status === driver.status &&
          nextDriver.operationalStatus === driver.operationalStatus &&
          nextDriver.assignable === driver.assignable &&
          nextDriver.isSharing === driver.isSharing &&
          nextDriver.lastSeenAt === driver.lastSeenAt;

        if (isSame) return driver;
        changed = true;
        return nextDriver;
      });

      if (!changed) return;
      driversRef.current = nextDrivers;
      setDrivers(nextDrivers);
    },
    [],
  );

  const scheduleDirectoryRefresh = React.useCallback(
    (delay = 180) => {
      if (directoryRefreshTimerRef.current) {
        clearTimeout(directoryRefreshTimerRef.current);
      }
      directoryRefreshTimerRef.current = setTimeout(() => {
        directoryRefreshTimerRef.current = null;
        void fetchDrivers(true);
      }, delay);
    },
    [fetchDrivers],
  );

  // Shared component-level metadata scheduler.
  //
  // This must live outside the operational socket effect because the shared
  // Dispatch Chat realtime callbacks also use it. Keeping it here gives every
  // caller the same debounced authoritative /threads reconciliation.
  const scheduleMetaRefresh = React.useCallback(
    (delay = 100) => {
      if (threadMetaRefreshTimerRef.current) {
        clearTimeout(threadMetaRefreshTimerRef.current);
      }

      threadMetaRefreshTimerRef.current = setTimeout(() => {
        threadMetaRefreshTimerRef.current = null;
        void fetchThreadMeta();
      }, delay);
    },
    [fetchThreadMeta],
  );

  // One global header Refresh button controls this panel. Initializing the ref
  // from the prop avoids an extra request when the channel is remounted.
  React.useEffect(() => {
    if (refreshSignal === manualRefreshSignalRef.current) return;
    manualRefreshSignalRef.current = refreshSignal;

    void fetchDrivers(true);
    void fetchThreadMeta();
    void onUnreadRefresh();
  }, [fetchDrivers, fetchThreadMeta, onUnreadRefresh, refreshSignal]);

  React.useEffect(() => {
    if (!isSignedIn) {
      requestInFlightRef.current = false;
      threadMetaInFlightRef.current = null;
      threadMetaPendingRef.current = false;
      optimisticUnreadMessageIdsRef.current.clear();
      selectedIdRef.current = null;
      driversRef.current = [];
      setDrivers([]);
      setThreadMetaByDriver({});
      setLoading(false);
      return;
    }

    void fetchDrivers(false);
    const interval = window.setInterval(() => void fetchDrivers(true), 60_000);
    return () => window.clearInterval(interval);
  }, [fetchDrivers, isSignedIn]);

  const onDispatchMessage = React.useCallback((message: {
      id?: unknown;
      threadId?: unknown;
      driverId?: unknown;
      senderRole?: unknown;
      content?: unknown;
      attachments?: Array<{
        originalName?: unknown;
      }>;
      createdAt?: unknown;
    }) => {
      const driverId = String(
        message?.driverId ?? "",
      ).trim();
      if (!driverId) {
        scheduleMetaRefresh();
        return;
      }

      const messageId = String(
        message?.id ?? "",
      ).trim();

      const senderRole = String(
        message?.senderRole ?? "",
      ).toLowerCase();

      const content = String(
        message?.content ?? "",
      ).trim();

      const attachments = Array.isArray(
        message?.attachments,
      )
        ? message.attachments
        : [];

      const preview =
        content ||
        (attachments.length === 1
          ? `Attachment: ${String(
              attachments[0]?.originalName ||
                "file",
            )}`
          : attachments.length > 1
            ? `${attachments.length} attachments`
            : "Dispatch Chat message");

      const createdAt = message?.createdAt
        ? String(message.createdAt)
        : new Date().toISOString();

      const selected =
        selectedIdRef.current === driverId;

      if (
        senderRole === "driver" &&
        !selected &&
        messageId
      ) {
        const pending =
          optimisticUnreadMessageIdsRef.current.get(driverId) ??
          new Set<string>();

        // The shared page-level event bus should publish once, but dedupe by
        // persisted message id defensively so reconnect/re-render behavior can
        // never double-increment a row.
        if (pending.has(messageId)) {
          scheduleMetaRefresh();
          return;
        }

        pending.add(messageId);
        optimisticUnreadMessageIdsRef.current.set(
          driverId,
          pending,
        );
      }

      // The row badge now reacts on the SAME socket event as the global
      // Dispatch Chat total.
      //
      // Incoming driver message in another chat:
      //   increment immediately.
      //
      // Incoming message in the currently-open chat:
      //   keep row unread at 0 because DispatchChatInlinePane immediately
      //   posts the thread read receipt.
      //
      // Outbound dispatcher message:
      //   update preview/time but never increment unread.
      patchThreadMeta(
        driverId,
        (current) => ({
          threadId: String(
            message?.threadId ??
              current?.threadId ??
              "",
          ),
          lastMessageAt: createdAt,
          lastMessagePreview: preview,
          unreadCount:
            senderRole === "driver"
              ? selected
                ? 0
                : Math.max(
                    0,
                    Number(current?.unreadCount ?? 0),
                  ) + 1
              : Math.max(
                  0,
                  Number(current?.unreadCount ?? 0),
                ),
        }),
      );

      // Server remains final authority. Debounced/coalesced reconciliation
      // corrects duplicates, read receipts and any missed socket.
      scheduleMetaRefresh();
  }, [patchThreadMeta, scheduleMetaRefresh]);


  const onDispatchRead = React.useCallback((payload: {
      driverId?: unknown;
    }) => {
      const driverId = String(
        payload?.driverId ?? "",
      ).trim();

      // If this is the currently opened row, the local pane has just marked
      // the conversation read, so clear it immediately. Other read events are
      // reconciled from /threads because this component intentionally does not
      // guess which account performed the read.
      if (
        driverId &&
        selectedIdRef.current === driverId
      ) {
        optimisticUnreadMessageIdsRef.current.delete(driverId);
        patchThreadMeta(driverId, {
          unreadCount: 0,
        });
      }

      scheduleMetaRefresh();
  }, [patchThreadMeta, scheduleMetaRefresh]);


  // Use the SAME always-mounted Dispatch Chat realtime source as the top
  // channel badge. This removes the second chat-socket timing path that could
  // miss an event and leave a driver row stale until a later reconciliation.
  React.useEffect(() => {
    if (!isSignedIn) return;

    return subscribeToDispatchChatRealtime((event) => {
      if (event.type === "message") {
        onDispatchMessage(event.payload);
        return;
      }

      if (event.type === "read") {
        onDispatchRead(event.payload);
        return;
      }

      scheduleMetaRefresh();
    });
  }, [
    isSignedIn,
    onDispatchMessage,
    onDispatchRead,
    scheduleMetaRefresh,
  ]);

  React.useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;

    const onOperationalStatusUpdated = (payload: {
      driverId?: unknown;
      operationalStatus?: unknown;
      forcedLiveStatus?: unknown;
    }) => {
      const driverId = String(payload?.driverId ?? "").trim();
      if (!driverId) return;

      const patch: Partial<DirectoryDriver> = {};

      if (payload?.operationalStatus !== undefined) {
        patch.operationalStatus = normalizeOperationalStatus(
          payload.operationalStatus,
        );
      }

      if (
        typeof payload?.forcedLiveStatus === "string" &&
        payload.forcedLiveStatus.trim()
      ) {
        patch.status = payload.forcedLiveStatus;
      }

      // Immediate visual response for the fields supplied by the backend.
      patchDriver(driverId, patch);

      // Then reconcile assignable, status requests, warnings and any other
      // server-derived directory fields. Debouncing prevents request bursts
      // when a single status transition produces several socket events.
      scheduleDirectoryRefresh();
    };

    const onDriverLocation = (payload: {
      driverId?: unknown;
      status?: unknown;
      isSharing?: unknown;
      lastSeenAt?: unknown;
    }) => {
      const driverId = String(payload?.driverId ?? "").trim();
      if (!driverId) return;

      const patch: Partial<DirectoryDriver> = {};
      if (typeof payload?.status === "string" && payload.status.trim()) {
        patch.status = payload.status;
      }
      if (typeof payload?.isSharing === "boolean") {
        patch.isSharing = payload.isSharing;
      }
      if (payload?.lastSeenAt !== undefined) {
        patch.lastSeenAt = payload.lastSeenAt
          ? String(payload.lastSeenAt)
          : null;
      }

      // Location heartbeats can be frequent, so update local directory state
      // only. Do NOT refetch the full organization directory on each heartbeat.
      patchDriver(driverId, patch);
    };

    const onLoadsUpdated = () => {
      // Load lifecycle changes affect activity/load context and are less
      // frequent than GPS heartbeats. Reconcile them from the server.
      scheduleDirectoryRefresh();
    };

    const onConnect = () => {
      scheduleMetaRefresh();
      scheduleDirectoryRefresh(0);
    };

    const connect = async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = initializeSocket(token);
      socket.on("driver:operational_status_updated", onOperationalStatusUpdated);
      socket.on("driver:location", onDriverLocation);
      socket.on("driver:loads_updated", onLoadsUpdated);
      socket.on("connect", onConnect);
    };

    void connect();

    return () => {
      cancelled = true;

      if (threadMetaRefreshTimerRef.current) {
        clearTimeout(threadMetaRefreshTimerRef.current);
        threadMetaRefreshTimerRef.current = null;
      }
      if (directoryRefreshTimerRef.current) {
        clearTimeout(directoryRefreshTimerRef.current);
        directoryRefreshTimerRef.current = null;
      }

      socket?.off("driver:operational_status_updated", onOperationalStatusUpdated);
      socket?.off("driver:location", onDriverLocation);
      socket?.off("driver:loads_updated", onLoadsUpdated);
      socket?.off("connect", onConnect);

      // The app uses a shared singleton socket. Do not disconnect it here.
    };
  }, [
    getToken,
    isSignedIn,
    patchDriver,
    patchThreadMeta,
    scheduleDirectoryRefresh,
    scheduleMetaRefresh,
  ]);

  const refreshUnreadState = React.useCallback(() => {
    void onUnreadRefresh();
    void fetchThreadMeta();
  }, [fetchThreadMeta, onUnreadRefresh]);

  const filteredDrivers = React.useMemo(
    () =>
      drivers.filter(
        (driver: DirectoryDriver) =>
          filterDriver(driver, filter) &&
          driverMatchesSearch(driver, query),
      ),
    [drivers, filter, query],
  );

  const selectedDriver = React.useMemo(
    () =>
      drivers.find((driver: DirectoryDriver) => driver.id === selectedId) ?? null,
    [drivers, selectedId],
  );

  const filters: Array<{ key: DriverFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "active-load", label: "With Active Load" },
    { key: "sharing", label: "Sharing Location" },
    { key: "offline", label: "Offline" },
  ];

  const selectDriverConversation = React.useCallback(
    (driverId: string) => {
      selectedIdRef.current = driverId;
      setSelectedId(driverId);
      optimisticUnreadMessageIdsRef.current.delete(driverId);

      // Opening the exact conversation is an immediate read-intent. The
      // InlinePane performs the actual server read write; /threads then
      // reconciles if that write fails.
      patchThreadMeta(driverId, {
        unreadCount: 0,
      });
    },
    [patchThreadMeta],
  );

  const startNew = () => {
    setNewOpen(true);
  };

  const selectNewConversation = (driverId: string) => {
    selectDriverConversation(driverId);
    setFilter("all");
    setQuery("");
    setNewOpen(false);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <aside
        className={cn(
          "min-h-0 w-full flex-col border-r-0 border-border/60 bg-[var(--bg-elevated)] transition-[width] duration-200 lg:flex lg:shrink-0 lg:border-r",
          railCollapsed ? "lg:w-16" : "lg:w-[21rem]",
          selectedDriver ? "hidden" : "flex",
        )}
      >
        <div className={cn(
          "sm5-toolbar gap-2",
          railCollapsed ? "lg:justify-center lg:px-2" : "px-3",
        )}>
          <div className={cn(
            "relative min-w-0 flex-1",
            railCollapsed && "lg:hidden",
          )}>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Search drivers, loads or routes…"
              className="sm5-input h-9 w-full pl-9 pr-3 text-xs"
            />
          </div>

          <button
            type="button"
            className={cn(
              "sm5-btn flex h-9 shrink-0 items-center justify-center gap-1.5",
              railCollapsed ? "lg:w-9 lg:px-0" : "px-3",
            )}
            style={{ fontSize: 12 }}
            onClick={startNew}
            title="New Dispatch Chat"
          >
            <Plus className="size-3.5" />
            <span className={cn(railCollapsed && "lg:hidden")}>New</span>
          </button>

        </div>

        <div
          className={cn(
            "shrink-0 border-b border-border/50 px-3 py-2",
            railCollapsed && "lg:hidden",
          )}
        >
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm5-scroll">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  "sm5-pill shrink-0 px-2.5 py-1.5 text-[10px] font-bold",
                  filter === item.key &&
                    "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300",
                )}
              >
                {item.label}
              </button>
            ))}

            {unreadTotal > 0 && (
              <span className="ml-auto shrink-0 rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-black text-white">
                {unreadTotal > 99 ? "99+" : unreadTotal} unread
              </span>
            )}
          </div>
        </div>

        {refreshWarning && drivers.length > 0 && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/[0.06] px-3 py-1.5 text-[9px] text-amber-700 dark:text-amber-300",
              railCollapsed && "lg:hidden",
            )}
          >
            <span className="min-w-0 truncate">{refreshWarning}</span>
            <button
              type="button"
              onClick={() => void fetchDrivers(true)}
              className="shrink-0 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto sm5-scroll">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-xs" style={{ color: "var(--text-tertiary)" }}>
              <Loader2 className="size-4 animate-spin text-emerald-500" />
              Loading drivers…
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4 text-center">
                <p className="text-xs font-bold text-red-600 dark:text-red-400">
                  Could not load drivers
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 h-8 text-[10px]"
                  onClick={() => void fetchDrivers(false)}
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <Users className="size-7" style={{ color: "var(--text-disabled)" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                No matching drivers
              </p>
              <p className="max-w-64 text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                Change the search or filter to view another driver.
              </p>
            </div>
          ) : (
            filteredDrivers.map((driver: DirectoryDriver) => (
              <DriverRow
                key={driver.id}
                driver={driver}
                selected={driver.id === selectedId}
                chatMeta={threadMetaByDriver[driver.id]}
                collapsed={railCollapsed}
                onSelect={() =>
                  selectDriverConversation(driver.id)
                }
              />
            ))
          )}
        </div>

        <div
          className="hidden shrink-0 py-2.5 lg:block"
          style={{ borderTop: "1px solid var(--border-1)" }}
        >
          <button
            type="button"
            onClick={toggleRail}
            className={cn(
              "sm5-icon-btn h-9",
              railCollapsed
                ? "mx-auto w-9"
                : "mx-2.5 flex w-[calc(100%-1.25rem)] items-center justify-start gap-3 px-3.5",
            )}
            title={railCollapsed ? "Expand sidebar" : "Minimize sidebar"}
          >
            {railCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span style={{ fontSize: 12.5, letterSpacing: "0.045em" }}>
                  Minimize
                </span>
              </>
            )}
          </button>
        </div>
      </aside>

      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-hidden",
          selectedDriver ? "flex" : "hidden lg:flex",
        )}
      >
        {selectedDriver ? (
          <DispatchChatInlinePane
            key={selectedDriver.id}
            driver={selectedDriver}
            onBack={() => {
              selectedIdRef.current = null;
              setSelectedId(null);
            }}
            onUnreadRefresh={refreshUnreadState}
            refreshSignal={refreshSignal}
          />
        ) : (
          <div className="flex min-h-full flex-1 items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <MessageSquare
                className="mx-auto size-8"
                style={{ color: "var(--text-disabled)" }}
              />
              <p className="mt-3 text-sm font-black" style={{ color: "var(--text-primary)" }}>
                Select a driver
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                Choose a driver to open the existing private dispatcher-driver conversation directly in this workspace.
              </p>
            </div>
          </div>
        )}
      </section>

      {newOpen && (
        <NewDispatchChatModal
          drivers={drivers}
          threadMetaByDriver={threadMetaByDriver}
          onClose={() => setNewOpen(false)}
          onSelect={selectNewConversation}
        />
      )}
    </div>
  );
}