"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CircleDot, User2, Search, Wifi,
  WifiOff, Clock, Flame, BellOff, Minus,
  Activity, Users, TrendingUp, Map as MapIcon,
  MapPin, MapPinOff, AlertTriangle, ShieldCheck, Car, CarFront, TriangleAlert,
  Navigation, Pause, BatteryFull, BatteryLow, Building2, Coffee, Radio, Play, X, Anchor,
} from "lucide-react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { TeamMember, OnlineStatus } from "@/hooks/useTeamPulse";
import { useActivityFeed, type ActivityEvent, type ActivityEventType } from "@/hooks/useActivityFeed";
import { useOpenDm } from "@/hooks/useOpenDm";
import { S } from "./team-pulse-constants";
import { PresenceAvatarDot } from "./StatusDot";
import { EmploymentTypeToggle } from "./locator/EmploymentTypeToggle";
import { LocatorLiveMapSection, type MapFocus } from "./locator/LocatorLiveMapSection";
import { PlacesAdminPanel } from "./locator/PlacesAdminPanel";
import { DrivingSessionsPanel } from "./locator/DrivingSessionsPanel";
import { MyStatusQuickSet } from "./locator/MyStatusQuickSet";
import { LocationInfoPanel } from "./locator/LocationInfoPanel";
import {
  sharingMeta, DepartmentBadge, signalMeta, DeviceBadge,
  isNotablyStationary, stationaryMinutes, formatStationaryDuration,
} from "./locator/LocatorMapLegend";
import {
  useActiveEmployeeLocations, usePlaces, useLocationHistory, useTimeAtPlaceReport, useMyLocatorStatus,
  type ActiveEmployeeLocation, type Place,
} from "@/hooks/useLocator";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useLocatorSocket } from "@/hooks/useLocatorSocket";

interface Props {
  members: TeamMember[];
  myUserId?: string;
  isAdmin?: boolean;
}

type RosterFilter = "all" | "active" | "sharing" | "offline";
type StreamFilter = "all" | "status" | "location" | "driving";

const EVENT_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  online:           { icon: Wifi,       color: "text-green-600 dark:text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  offline:          { icon: WifiOff,    color: "text-gray-500 dark:text-gray-400",     bg: "bg-muted/60 border-border/20" },
  away:             { icon: Minus,      color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  busy:             { icon: Flame,      color: "text-red-600 dark:text-red-400",       bg: "bg-red-500/10 border-red-500/20" },
  do_not_disturb:   { icon: BellOff,    color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  break_start:      { icon: Coffee,     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  break_end:        { icon: ArrowLeft,  color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/10 border-blue-500/20" },
  custom_status:    { icon: CircleDot,  color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  idle:             { icon: Clock,      color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  geofence_enter:       { icon: MapPin,        color: "text-green-600 dark:text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  geofence_exit:        { icon: MapPinOff,     color: "text-muted-foreground",                bg: "bg-muted/60 border-border/20" },
  sos_triggered:        { icon: AlertTriangle, color: "text-red-600 dark:text-red-400",       bg: "bg-red-500/10 border-red-500/20" },
  sos_resolved:         { icon: ShieldCheck,   color: "text-green-600 dark:text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  driving_session_start:{ icon: Car,           color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/10 border-blue-500/20" },
  driving_session_end:  { icon: CarFront,      color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/10 border-blue-500/20" },
  possible_incident:    { icon: TriangleAlert, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  location_sharing_started: { icon: Navigation, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  location_sharing_paused:  { icon: Pause,      color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  location_sharing_resumed: { icon: Play,       color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/10 border-blue-500/20" },
  location_sharing_stopped: { icon: MapPinOff,  color: "text-muted-foreground",                bg: "bg-muted/60 border-border/20" },
};

const EVENT_CATEGORY: Partial<Record<ActivityEventType, Exclude<StreamFilter, "all">>> = {
  online: "status", offline: "status", away: "status", busy: "status", idle: "status",
  do_not_disturb: "status", custom_status: "status", break_start: "status", break_end: "status",
  geofence_enter: "location", geofence_exit: "location",
  location_sharing_started: "location", location_sharing_paused: "location",
  location_sharing_resumed: "location", location_sharing_stopped: "location",
  driving_session_start: "driving", driving_session_end: "driving", possible_incident: "driving",
};

const STREAM_FILTER_LABELS: Record<StreamFilter, string> = {
  all: "All",
  status: "Status",
  location: "Location",
  driving: "Driving",
};

function timeAgo(iso?: string) {
  if (!iso) return "";
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function MemberAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return avatar ? (
    <img src={avatar} alt={name} className="size-9 rounded-full object-cover shrink-0" />
  ) : (
    <div className="size-9 text-[11px] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary shrink-0">
      {initials}
    </div>
  );
}

/** Describes where a sharing employee is, Life360-style. */
function whereText(loc: ActiveEmployeeLocation, place?: Place) {
  if (loc.sharingState !== "sharing") return sharingMeta(loc.sharingState).label;
  if (loc.drivingSessionId) return typeof loc.speedMph === "number" ? `Driving · ${loc.speedMph} mph` : "Driving";
  if (place) return `at ${place.name}`;
  if (typeof loc.speedMph === "number" && loc.speedMph > 3) return `On the move · ${loc.speedMph} mph`;
  return "Sharing location";
}

function LocationLine({ loc, place }: { loc: ActiveEmployeeLocation; place?: Place }) {
  const meta = sharingMeta(loc.sharingState);
  const sharing = loc.sharingState === "sharing";
  const isDriving = sharing && !!loc.drivingSessionId;
  const WhereIcon = isDriving ? Car : sharing ? (place ? Building2 : Navigation) : loc.sharingState === "declined_permission" ? MapPinOff : Pause;

  return (
    <div className="mt-1.5 rounded-lg bg-muted/40 border border-border/30 px-2 py-1.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="relative flex size-2 shrink-0">
          {meta.pulse && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-50", meta.color)} />}
          <span className={cn("relative inline-flex size-2 rounded-full", meta.color)} />
        </span>
        <WhereIcon className={cn("size-3 shrink-0", isDriving ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/60")} />
        <span className={cn("text-[10px] font-bold truncate", isDriving ? "text-blue-600 dark:text-blue-400" : "text-foreground/80")} style={place && !isDriving ? { color: place.color || undefined } : undefined}>
          {whereText(loc, place)}
        </span>
        <DeviceBadge deviceType={loc.deviceType} />
      </div>
      <div className="flex items-center gap-2.5 mt-1 pl-3.5">
        <span className="text-[9px] text-muted-foreground/50">Updated {timeAgo(loc.lastSeenAt)}</span>
        {typeof loc.batteryLevel === "number" && (
          <span className={cn(
            "text-[9px] flex items-center gap-0.5 font-semibold",
            loc.batteryLevel <= 20 ? "text-red-500" : loc.batteryLevel <= 50 ? "text-amber-500" : "text-muted-foreground/50",
          )}>
            {loc.batteryLevel <= 20 ? <BatteryLow className="size-2.5" /> : <BatteryFull className="size-2.5" />}
            {loc.batteryLevel}%{loc.isCharging ? "⚡" : ""}
          </span>
        )}
        {sharing && (() => {
          const signal = signalMeta(loc);
          const SignalIcon = signal.icon;
          return (
            <span className={cn("text-[9px] flex items-center gap-0.5 font-semibold", signal.className)}>
              <SignalIcon className="size-2.5" /> {signal.label}
            </span>
          );
        })()}
      </div>
      {isNotablyStationary(loc) && (
        <div
          title="Position hasn't moved more than ~40m — any small pin wobble on the map is just GPS noise, not real movement."
          className="flex items-center gap-1 mt-1 pl-3.5 text-[9px] font-semibold text-sky-600 dark:text-sky-400"
        >
          <Anchor className="size-2.5" /> Stayed put · {formatStationaryDuration(stationaryMinutes(loc)!)}
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member, isMe, isAdmin, locationInfo, place, isSelected, onSelect,
}: {
  member: TeamMember;
  isMe: boolean;
  isAdmin?: boolean;
  locationInfo?: ActiveEmployeeLocation;
  place?: Place;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isOffline = member.onlineStatus === "offline";
  const statusLabel = S.label[member.onlineStatus as OnlineStatus] ?? member.onlineStatus;
  // "On-Site"/"Off-Site" reflects real-time presence inside a company Place geofence right
  // now — not the static employmentLocationType HR label, which only says how someone
  // *normally* works and stays "onsite" even when they're at home sharing from across town.
  const isSharingNow = locationInfo?.sharingState === "sharing";
  const isOnsite = isSharingNow && !!locationInfo?.currentPlaceId;
  const isOffsite = isSharingNow && !locationInfo?.currentPlaceId;
  const canSelect = !!locationInfo?.coords && locationInfo.sharingState !== "off_duty";

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={cn(
        "relative flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
        "bg-card hover:bg-accent/10 hover:border-border",
        isSelected ? "border-primary/50 ring-2 ring-primary/20 bg-primary/3" : isMe ? "border-primary/30 ring-1 ring-primary/10" : "border-border/40",
      )}
    >
      <div className="relative shrink-0">
        <MemberAvatar name={member.name} avatar={member.avatar} />
        <PresenceAvatarDot status={member.onlineStatus as OnlineStatus} deviceType={member.lastDeviceType} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("text-[12px] font-bold truncate", isOffline && "text-muted-foreground/70")}>
            {member.name}
          </span>
          {isMe && <span className="text-[9px] font-black text-primary bg-primary/10 px-1 rounded shrink-0">You</span>}
          <DepartmentBadge department={member.personalInfo?.department} />
          {isOnsite && (
            <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 rounded shrink-0 uppercase tracking-wide">
              On-Site
            </span>
          )}
          {isOffsite && (
            <span className="text-[8px] font-black text-muted-foreground/60 bg-muted/50 border border-border/30 px-1 rounded shrink-0 uppercase tracking-wide">
              Off-Site
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-px rounded border leading-none",
            S.badge[member.onlineStatus as OnlineStatus] ?? "bg-muted/60 text-muted-foreground border-border/30",
          )}>
            {statusLabel}
          </span>
          {member.lastActive && (
            <span className="text-[9px] text-muted-foreground/40 shrink-0">{timeAgo(member.lastActive)}</span>
          )}
        </div>

        {member.customStatus && <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{member.customStatus}</p>}
        {member.personalInfo?.jobTitle && (
          <span className="text-[9px] text-muted-foreground/50 truncate block mt-0.5">{member.personalInfo.jobTitle}</span>
        )}

        {locationInfo && <LocationLine loc={locationInfo} place={place} />}
        {canSelect && (
          <p className="text-[9px] font-bold text-primary/70 mt-1 flex items-center gap-1">
            <Navigation className="size-2.5" /> Tap to view details
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isMe && <MyStatusQuickSet currentStatus={member.onlineStatus as OnlineStatus} currentCustom={member.customStatus} />}
        {isAdmin && <EmploymentTypeToggle userId={member._id} employmentLocationType={member.employmentLocationType} />}
      </div>
    </motion.div>
  );
}

function EventItem({ event, myUserId, index }: { event: ActivityEvent; myUserId?: string; index: number }) {
  const { openDm } = useOpenDm();
  const meta = EVENT_META[event.type] ?? EVENT_META.offline;
  const Icon = meta.icon;
  const initials = event.userName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const canChat = event.userId !== myUserId;
  const m = event.meta ?? {};

  const chips: string[] = [];
  if (typeof m.placeName === "string" && !event.description.includes(m.placeName)) chips.push(m.placeName);
  if (typeof m.durationMin === "number" && m.durationMin > 0) chips.push(`${m.durationMin}m`);
  if (typeof m.topSpeedMph === "number") chips.push(`top ${Math.round(m.topSpeedMph)} mph`);
  if (typeof m.distanceMi === "number" && m.distanceMi > 0) chips.push(`${m.distanceMi.toFixed(1)} mi`);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.02 }}
      className="flex items-start gap-2.5 py-2.5 border-b border-border/30 last:border-0 group"
    >
      <div className="relative shrink-0">
        <button
          onClick={() => canChat && openDm(event.userId)}
          className={cn("relative", canChat && "cursor-pointer")}
          disabled={!canChat}
        >
          {event.userAvatar ? (
            <img src={event.userAvatar} alt={event.userName} className="size-7 rounded-full object-cover" />
          ) : (
            <div className="size-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-black text-primary">
              {initials}
            </div>
          )}
        </button>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border border-background flex items-center justify-center pointer-events-none",
          meta.bg,
        )}>
          <Icon className={cn("size-2", meta.color)} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground/90 leading-snug">
          <span className="font-semibold">{event.userName}</span>
          {" · "}
          <span className="text-muted-foreground/80">{event.description.replace(event.userName, "").trim()}</span>
        </p>
        {chips.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {chips.map((c) => (
              <span key={c} className="text-[9px] font-bold px-1.5 py-px rounded-full bg-muted/60 text-muted-foreground/70">{c}</span>
            ))}
          </div>
        )}
      </div>

      <span className="text-[9px] text-muted-foreground/40 shrink-0 tabular-nums mt-0.5">
        {timeAgo(event.createdAt)}
      </span>
    </motion.div>
  );
}

const FILTER_LABELS: Record<RosterFilter, string> = {
  all: "All",
  active: "Active",
  sharing: "Sharing",
  offline: "Offline",
};

function SectionHeading({
  icon: Icon, label, accent, right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5", accent ? "text-primary" : "text-muted-foreground/60")} />
        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">{label}</span>
      </div>
      {right}
    </div>
  );
}

/** Shared row height for Live Roster / Activity Stream so their card bottoms line up. */
const LIST_HEIGHT = "sm:h-160";

export function ActivityMonitorTab({ members, myUserId, isAdmin }: Props) {
  const [rosterFilter, setRosterFilter] = React.useState<RosterFilter>("all");
  const [streamFilter, setStreamFilter] = React.useState<StreamFilter>("all");
  const [search, setSearch] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [from, setFrom] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const focusRef = React.useRef<MapFocus | null>(null);

  const {
    data: eventPages, isLoading: eventsLoading,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useActivityFeed();
  const events = React.useMemo(() => eventPages?.pages.flat() ?? [], [eventPages]);
  const { data: myStatus } = useMyLocatorStatus();

  useLocatorSocket();
  useLocationSharing({
    eligible: !!myStatus?.locationConsent?.granted,
    onBreak: false,
  });

  const { data: activeLocations = [] } = useActiveEmployeeLocations(true);
  const { data: places = [] } = usePlaces();
  const locationByUserId = React.useMemo(() => new Map(activeLocations.map((l) => [l.userId, l])), [activeLocations]);
  const placeById = React.useMemo(() => new Map(places.map((p) => [p._id, p])), [places]);

  // The info panel + history always show *someone* — the explicit selection, or you by default.
  const viewingUserId = selectedUserId ?? myUserId ?? null;

  const fromIso = from ? new Date(`${from}T00:00:00`).toISOString() : undefined;
  const toIso = to ? new Date(`${to}T23:59:59`).toISOString() : undefined;
  const { data: history = [], isLoading: historyLoading } = useLocationHistory(viewingUserId, fromIso, toIso);
  const { data: report = [] } = useTimeAtPlaceReport(
    isAdmin && viewingUserId ? { from: fromIso, to: toIso, userId: viewingUserId } : { from: undefined, to: undefined },
  );

  const sharingCount = activeLocations.filter((l) => l.sharingState === "sharing").length;
  // Live presence inside a company Place right now — not the static employmentLocationType
  // HR label, so this matches the roster's On-Site/Off-Site badges.
  const onsiteCount = activeLocations.filter((l) => l.sharingState === "sharing" && !!l.currentPlaceId).length;
  const onlineCount = members.filter((m) => m.onlineStatus === "online").length;
  const offlineCount = members.filter((m) => m.onlineStatus === "offline").length;
  const activeCount = members.length - offlineCount;
  const pct = (n: number) => (members.length ? Math.round((n / members.length) * 100) : 0);

  const statMetrics = [
    { label: "Online Now", value: onlineCount,  sub: `${pct(onlineCount)}% of team`,   accent: "text-green-600 dark:text-green-400" },
    { label: "Active",     value: activeCount,  sub: `${members.length} total`,        accent: "text-blue-600 dark:text-blue-400" },
    { label: "Sharing",    value: sharingCount, sub: "live on map",                    accent: "text-emerald-600 dark:text-emerald-400" },
    { label: "On-Site",    value: onsiteCount,  sub: "at a company place",             accent: "text-violet-600 dark:text-violet-400" },
    { label: "Offline",    value: offlineCount, sub: `${pct(offlineCount)}% of team`,  accent: "text-muted-foreground/60" },
  ];

  const handleSelect = React.useCallback((userId: string) => {
    setSelectedUserId(userId);
    const loc = locationByUserId.get(userId);
    if (loc?.coords) focusRef.current?.(loc.coords.lat, loc.coords.lng);
  }, [locationByUserId]);

  const handleClosePanel = React.useCallback(() => setSelectedUserId(null), []);

  const handleLocateViewing = React.useCallback(() => {
    if (!viewingUserId) return;
    const loc = locationByUserId.get(viewingUserId);
    if (loc?.coords) focusRef.current?.(loc.coords.lat, loc.coords.lng);
  }, [viewingUserId, locationByUserId]);

  const filteredMembers = React.useMemo(() => {
    const q = search.toLowerCase();
    let list = members.filter((m) => !q || m.name.toLowerCase().includes(q));
    if (rosterFilter === "active") list = list.filter((m) => m.onlineStatus !== "offline");
    else if (rosterFilter === "sharing") list = list.filter((m) => locationByUserId.get(m._id)?.sharingState === "sharing");
    else if (rosterFilter === "offline") list = list.filter((m) => m.onlineStatus === "offline");
    return [...list].sort((a, b) => {
      if (a._id === myUserId) return -1;
      if (b._id === myUserId) return 1;
      const aShare = locationByUserId.get(a._id)?.sharingState === "sharing" ? 1 : 0;
      const bShare = locationByUserId.get(b._id)?.sharingState === "sharing" ? 1 : 0;
      return bShare - aShare;
    });
  }, [members, search, rosterFilter, myUserId, locationByUserId]);

  const filteredEvents = React.useMemo(() => {
    let list = events;
    if (selectedUserId) list = list.filter((e) => e.userId === selectedUserId);
    if (streamFilter !== "all") list = list.filter((e) => EVENT_CATEGORY[e.type] === streamFilter);
    return list;
  }, [events, selectedUserId, streamFilter]);

  const viewingLoc = viewingUserId ? locationByUserId.get(viewingUserId) : undefined;
  const viewingMember = viewingUserId ? members.find((m) => m._id === viewingUserId) : undefined;
  const viewingPlace = viewingLoc?.currentPlaceId ? placeById.get(viewingLoc.currentPlaceId) : undefined;
  const isSelf = !selectedUserId || selectedUserId === myUserId;

  return (
    <div className="space-y-4">
      {/* ── Stats — same divided-strip design as Overview / Calendar ── */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-border/30">
          {statMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="flex flex-col gap-1 px-4 sm:px-5 py-4"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">{m.label}</p>
              <p className={cn("text-3xl sm:text-4xl font-black tabular-nums leading-none mt-1", m.accent)}>{m.value}</p>
              <p className="text-[10px] text-muted-foreground/50 leading-tight mt-0.5">{m.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Map (big, left) + permanent right-rail info panel — bottoms line up ── */}
      <SectionHeading icon={MapIcon} label="Team Locator Map" accent
        right={<span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-green-600 dark:text-green-400"><Radio className="size-3" /> Live</span>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-stretch">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="h-full min-h-90">
          <LocatorLiveMapSection
            selectedUserId={selectedUserId}
            onSelectUser={handleSelect}
            historyPoints={history}
            focusRef={focusRef}
          />
        </motion.div>

        <div className="xl:sticky xl:top-20 h-full min-h-90">
          <AnimatePresence mode="wait">
            <LocationInfoPanel
              key={viewingUserId ?? "self"}
              isSelf={isSelf}
              hasExplicitSelection={!!selectedUserId}
              loc={viewingLoc}
              member={viewingMember}
              place={viewingPlace}
              from={from}
              to={to}
              setFrom={setFrom}
              setTo={setTo}
              history={history}
              historyLoading={historyLoading}
              report={report}
              isAdmin={isAdmin}
              onClose={handleClosePanel}
              onLocate={handleLocateViewing}
            />
          </AnimatePresence>
        </div>
      </div>

      {isAdmin && (
        <>
          <SectionHeading icon={MapPin} label="Company Places" />
          <PlacesAdminPanel />
        </>
      )}

      {/* ── Roster + Activity stream — matched heights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
        <div className="space-y-3">
          <SectionHeading icon={Users} label="Live Roster"
            right={<span className="text-[10px] text-muted-foreground/40 tabular-nums">{filteredMembers.length} shown</span>}
          />

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="pl-7 h-8 text-xs bg-background border-border/50"
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            {(Object.keys(FILTER_LABELS) as RosterFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setRosterFilter(f)}
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                  rosterFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/40 text-muted-foreground/60 hover:border-border hover:text-foreground",
                )}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className={cn("space-y-2 pr-0.5", LIST_HEIGHT, "sm:overflow-y-auto")}>
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground/40">
                <User2 className="size-8" />
                <p className="text-xs">No members match this filter</p>
              </div>
            ) : (
              filteredMembers.map((m) => {
                const loc = locationByUserId.get(m._id);
                return (
                  <MemberCard
                    key={m._id}
                    member={m}
                    isMe={m._id === myUserId}
                    isAdmin={isAdmin}
                    locationInfo={loc}
                    place={loc?.currentPlaceId ? placeById.get(loc.currentPlaceId) : undefined}
                    isSelected={selectedUserId === m._id}
                    onSelect={() => handleSelect(m._id)}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-3">
          <SectionHeading icon={TrendingUp} label="Activity Stream"
            right={<span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Live</span></span>}
          />

          <div className="flex items-center gap-1 flex-wrap">
            {(Object.keys(STREAM_FILTER_LABELS) as StreamFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStreamFilter(f)}
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                  streamFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/40 text-muted-foreground/60 hover:border-border hover:text-foreground",
                )}
              >
                {STREAM_FILTER_LABELS[f]}
              </button>
            ))}
            {selectedUserId && (
              <button
                onClick={handleClosePanel}
                className="ml-auto flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/15 px-2 py-1 rounded-full transition-colors"
              >
                {viewingMember?.name ?? "Selected"} only
                <X className="size-2.5" />
              </button>
            )}
          </div>

          <div className={cn("rounded-2xl border border-border/40 bg-card overflow-hidden flex flex-col", LIST_HEIGHT)}>
            {eventsLoading ? (
              <div className="space-y-0 divide-y divide-border/30 px-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5">
                    <div className="size-7 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground/40">
                <Activity className="size-10" />
                <div className="text-center">
                  <p className="text-sm font-semibold">{events.length === 0 ? "No activity yet" : "No matching activity"}</p>
                  <p className="text-[11px] mt-1 px-6">
                    {events.length === 0
                      ? "Arrivals, departures, drives, sharing & status changes appear here live"
                      : "Try a different filter"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-3 divide-y divide-border/30 sm:overflow-y-auto sm:flex-1">
                {filteredEvents.map((event, i) => (
                  <EventItem key={event._id} event={event} myUserId={myUserId} index={i} />
                ))}
                {hasNextPage && (
                  <div className="py-2.5 flex justify-center">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="text-[10px] font-bold text-muted-foreground/60 hover:text-foreground px-3 py-1 rounded-full border border-border/40 transition-colors disabled:opacity-50"
                    >
                      {isFetchingNextPage ? "Loading…" : "Load older"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Test-Drive Summaries — moved to the very bottom ── */}
      <SectionHeading icon={Car} label="Test-Drive Summaries" />
      <DrivingSessionsPanel myUserId={myUserId} />
    </div>
  );
}
