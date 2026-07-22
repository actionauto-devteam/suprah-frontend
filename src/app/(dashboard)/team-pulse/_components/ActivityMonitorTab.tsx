"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CircleDot, User2, Search, Wifi,
  WifiOff, Clock, Flame, BellOff, Minus,
  Activity, Users, TrendingUp, Map as MapIcon,
  MapPin, MapPinOff, AlertTriangle, ShieldCheck, Car, CarFront, TriangleAlert,
  Navigation, Pause, BatteryLow, Building2, Coffee, Radio, Play, X, Anchor, ChevronDown,
} from "lucide-react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { todayStrMDT, isTodayMDT, isYesterdayMDT, fmtWeekdayDateMDT } from "@/lib/timezone";
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
import { RequestLocationButton } from "./locator/RequestLocationButton";
import { LocationInfoPanel } from "./locator/LocationInfoPanel";
import {
  sharingMeta, DepartmentBadge, isNotablyStationary, stationaryMinutes, formatStationaryDuration,
} from "./locator/LocatorMapLegend";
import {
  useActiveEmployeeLocations, usePlaces, useLocationHistory, useTimeAtPlaceReport, useMyLocatorStatus,
  type ActiveEmployeeLocation, type Place,
} from "@/hooks/useLocator";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useLocatorSocket } from "@/hooks/useLocatorSocket";
import { haversineMi, formatDistanceMi } from "@/lib/geo";
import { DEPARTMENTS, isMobileMonitoringDept } from "@/lib/departments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  members: TeamMember[];
  myUserId?: string;
  isAdmin?: boolean;
}

type RosterFilter = "all" | "active" | "offline";
type StreamFilter = "all" | "status" | "location" | "driving";

const EVENT_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  online: { icon: Wifi, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  offline: { icon: WifiOff, color: "text-gray-500 dark:text-gray-400", bg: "bg-muted/60 border-border/20" },
  away: { icon: Minus, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  busy: { icon: Flame, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  do_not_disturb: { icon: BellOff, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  break_start: { icon: Coffee, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  break_end: { icon: ArrowLeft, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  custom_status: { icon: CircleDot, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  idle: { icon: Clock, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  geofence_enter: { icon: MapPin, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  geofence_exit: { icon: MapPinOff, color: "text-muted-foreground", bg: "bg-muted/60 border-border/20" },
  sos_triggered: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  sos_resolved: { icon: ShieldCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  driving_session_start: { icon: Car, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  driving_session_end: { icon: CarFront, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  possible_incident: { icon: TriangleAlert, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  location_sharing_started: { icon: Navigation, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  location_sharing_paused: { icon: Pause, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  location_sharing_resumed: { icon: Play, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  location_sharing_stopped: { icon: MapPinOff, color: "text-muted-foreground", bg: "bg-muted/60 border-border/20" },
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

function whereText(loc: ActiveEmployeeLocation, place?: Place) {
  if (loc.sharingState !== "sharing") return sharingMeta(loc.sharingState).label;
  if (loc.drivingSessionId) return typeof loc.speedMph === "number" ? `Driving · ${loc.speedMph} mph` : "Driving";
  if (place) return `at ${place.name}`;
  if (typeof loc.speedMph === "number" && loc.speedMph > 3) return `On the move · ${loc.speedMph} mph`;
  return "Sharing location";
}

interface RosterPerson {
  id: string;
  name: string;
  avatar?: string;
  isMe: boolean;
  hasPresence: boolean;
  onlineStatus?: OnlineStatus;
  deviceType?: "mobile" | "desktop";
  customStatus?: string;
  lastActive?: string;
  jobTitle?: string;
  department?: string;
  employmentLocationType?: "onsite" | "remote";
  loc?: ActiveEmployeeLocation;
  place?: Place;
  distanceMi?: number | null;
}

function memberToRosterPerson(
  m: TeamMember, isMe: boolean, loc: ActiveEmployeeLocation | undefined, place: Place | undefined, distanceMi: number | null,
): RosterPerson {
  return {
    id: m._id, name: m.name, avatar: m.avatar, isMe, hasPresence: true,
    onlineStatus: m.onlineStatus as OnlineStatus, deviceType: m.lastDeviceType,
    customStatus: m.customStatus, lastActive: m.lastActive,
    jobTitle: m.personalInfo?.jobTitle, department: m.personalInfo?.department,
    employmentLocationType: m.employmentLocationType, loc, place, distanceMi,
  };
}

function RosterCard({ person, isAdmin, isSelected, onSelect, isShiftGoverned }: {
  person: RosterPerson; isAdmin?: boolean; isSelected: boolean; onSelect: () => void; isShiftGoverned?: boolean;
}) {
  const { loc, place } = person;
  const sharing = loc?.sharingState === "sharing";
  const isOnsite = sharing && !!loc?.currentPlaceId;
  const isOffsite = sharing && !loc?.currentPlaceId;
  const isLastSeen = loc?.sharingState === "off_duty" && !!loc?.coords;
  const canSelect = !!loc?.coords && loc.sharingState !== "off_duty";
  const isOffline = person.hasPresence && person.onlineStatus === "offline";
  const initials = person.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  // sharingMeta() safely falls back to the "Not Sharing" state for undefined/off_duty, so
  // this row always shows a clear sharing status even for people who've never shared at all.
  const meta = sharingMeta(loc?.sharingState);
  const WhereIcon = !loc
    ? MapPinOff
    : loc.sharingState === "sharing"
      ? (loc.drivingSessionId ? Car : place ? Building2 : Navigation)
      : isLastSeen ? Clock
        : loc.sharingState === "declined_permission" ? MapPinOff
          : Pause;
  const where = !loc ? "Not Sharing" : (isLastSeen ? `Last seen ${timeAgo(loc.lastSeenAt)}` : whereText(loc, place));
  const stationary = !!loc && isNotablyStationary(loc);

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={cn(
        "relative flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
        "bg-card hover:bg-accent/10 hover:border-border",
        isSelected ? "border-primary/50 ring-2 ring-primary/20 bg-primary/3" : person.isMe ? "border-primary/30 ring-1 ring-primary/10" : "border-border/40",
      )}
    >
      <div className="relative shrink-0">
        {person.avatar ? (
          <img src={person.avatar} alt={person.name} className="size-9 rounded-full object-cover" />
        ) : (
          <div className="size-9 text-[11px] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary">
            {initials}
          </div>
        )}
        {person.hasPresence && person.onlineStatus ? (
          <PresenceAvatarDot status={person.onlineStatus} deviceType={person.deviceType} />
        ) : (
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
            sharing ? "bg-emerald-500" : "bg-gray-400",
          )} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className={cn("text-[12px] font-bold truncate", isOffline && "text-muted-foreground/70")}>
            {person.name}
          </span>
          {person.isMe && <span className="text-[9px] font-black text-primary bg-primary/10 px-1 rounded shrink-0">You</span>}
          <DepartmentBadge department={person.department} />
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

        {person.hasPresence && person.onlineStatus && (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-px rounded border leading-none",
              S.badge[person.onlineStatus] ?? "bg-muted/60 text-muted-foreground border-border/30",
            )}>
              {S.label[person.onlineStatus] ?? person.onlineStatus}
            </span>
            {person.lastActive && <span className="text-[9px] text-muted-foreground/40 shrink-0">{timeAgo(person.lastActive)}</span>}
          </div>
        )}

        {person.customStatus ? (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{person.customStatus}</p>
        ) : person.jobTitle ? (
          <span className="text-[9px] text-muted-foreground/50 truncate block mt-0.5">{person.jobTitle}</span>
        ) : null}

        <div className="flex items-center gap-x-2 gap-y-1 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex size-2 shrink-0">
              {meta.pulse && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-50", meta.color)} />}
              <span className={cn("relative inline-flex size-2 rounded-full", meta.color)} />
            </span>
            <WhereIcon className="size-3 shrink-0 text-muted-foreground/60" />
            <span className="text-[10px] font-bold truncate text-foreground/80" style={place && !isLastSeen ? { color: place.color || undefined } : undefined}>
              {where}
            </span>
            {isShiftGoverned && sharing && (
              <span className="text-[8px] font-black text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1 rounded uppercase tracking-wide shrink-0">
                Via Shift
              </span>
            )}
          </span>
          {loc && !isLastSeen && <span className="text-[9px] text-muted-foreground/40 shrink-0">{timeAgo(loc.lastSeenAt)}</span>}
          {typeof person.distanceMi === "number" && (
            <span className="text-[9px] text-muted-foreground/40 font-semibold shrink-0">{formatDistanceMi(person.distanceMi)}</span>
          )}
          {loc && typeof loc.batteryLevel === "number" && loc.batteryLevel <= 20 && (
            <span className="text-[9px] flex items-center gap-0.5 font-semibold text-red-500 shrink-0">
              <BatteryLow className="size-2.5" /> {loc.batteryLevel}%
            </span>
          )}
          {loc?.connectivity === "offline" && (
            <span className="text-[9px] text-red-500 flex items-center gap-0.5 font-semibold shrink-0">
              <WifiOff className="size-2.5" /> Offline
            </span>
          )}
          {stationary && (
            <span className="text-[9px] flex items-center gap-0.5 font-semibold text-sky-600 dark:text-sky-400 shrink-0">
              <Anchor className="size-2.5" /> {formatStationaryDuration(stationaryMinutes(loc!)!)}
            </span>
          )}
        </div>

        {canSelect && (
          <p className="text-[9px] font-bold text-primary/70 mt-1.5 flex items-center gap-1">
            <Navigation className="size-2.5" /> Tap for details
          </p>
        )}
      </div>

      {person.hasPresence && (person.isMe || isAdmin) && (
        <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {person.isMe && (
            <EmploymentTypeToggle userId={person.id} employmentLocationType={person.employmentLocationType} />
          )}
          {isAdmin && !person.isMe && !sharing && (
            <RequestLocationButton userId={person.id} userName={person.name} />
          )}
        </div>
      )}
    </motion.div>
  );
}

function EventItem({ event, myUserId, index }: { event: ActivityEvent; myUserId?: string; index: number }) {
  const { openDm } = useOpenDm();
  const meta = EVENT_META[event.type] ?? EVENT_META.offline;
  const Icon = meta.icon;
  const userName = event.userName || "";
  const description = event.description || "";
  const initials = userName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const canChat = event.userId !== myUserId;
  const m = event.meta ?? {};

  const chips: string[] = [];
  if (typeof m.placeName === "string" && !description.includes(m.placeName)) chips.push(m.placeName);
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
            <img src={event.userAvatar} alt={userName} className="size-7 rounded-full object-cover" />
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
          <span className="font-semibold">{userName}</span>
          {" · "}
          <span className="text-muted-foreground/80">{description.replace(userName, "").trim()}</span>
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
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center justify-center size-6 rounded-lg shrink-0",
          accent ? "bg-primary/10" : "bg-muted/60",
        )}>
          <Icon className={cn("size-3.5", accent ? "text-primary" : "text-muted-foreground/60")} />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
      </div>
      {right}
    </div>
  );
}

const LIST_HEIGHT = "h-[60vh] sm:h-160";

export function ActivityMonitorTab({ members, myUserId, isAdmin }: Props) {
  const [rosterFilter, setRosterFilter] = React.useState<RosterFilter>("all");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
  const [streamFilter, setStreamFilter] = React.useState<StreamFilter>("all");
  const [search, setSearch] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [from, setFrom] = React.useState(() => todayStrMDT(-6));
  const [to, setTo] = React.useState(() => todayStrMDT());
  const focusRef = React.useRef<MapFocus | null>(null);
  const [placePickMode, setPlacePickMode] = React.useState(false);
  const [pickedCoords, setPickedCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [draftPlace, setDraftPlace] = React.useState<Place | null>(null);
  const [mobilePanel, setMobilePanel] = React.useState<"roster" | "stream">("roster");
  const [placesOpen, setPlacesOpen] = React.useState(false);
  const streamEndRef = React.useRef<HTMLDivElement | null>(null);

  const {
    data: eventPages, isLoading: eventsLoading,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useActivityFeed(selectedUserId ?? undefined);
  const events = React.useMemo(() => eventPages?.pages.flat() ?? [], [eventPages]);
  const { data: myStatus } = useMyLocatorStatus();
  const myShiftGoverned = !!myStatus?.isOnShift && !myStatus?.isOnBreak;

  useLocatorSocket();
  useLocationSharing({
    eligible: !!myStatus?.locationConsent?.granted,
    onBreak: !!myStatus?.isOnBreak,
  });

  const { data: activeLocations = [] } = useActiveEmployeeLocations(true);
  const { data: places = [] } = usePlaces();
  const locationByUserId = React.useMemo(() => new Map(activeLocations.map((l) => [l.userId, l])), [activeLocations]);
  const locationByEmail = React.useMemo(
    () => new Map(activeLocations.filter((l) => l.email).map((l) => [l.email!.toLowerCase(), l])),
    [activeLocations],
  );
  const memberEmailById = React.useMemo(
    () => new Map(members.filter((m) => m.email).map((m) => [m._id, m.email!.toLowerCase()])),
    [members],
  );
  // A physical person can have both a main-site User account (this roster) and a separate
  // CrmUser account (e.g. TimeProof) — their location ping may land under either account's
  // _id. Fall back to matching by email so someone sharing via the "other" account still
  // shows as sharing here instead of reading as "Not Sharing".
  const resolveLocation = React.useCallback(
    (id: string): ActiveEmployeeLocation | undefined => {
      const direct = locationByUserId.get(id);
      if (direct) return direct;
      const email = memberEmailById.get(id);
      return email ? locationByEmail.get(email) : undefined;
    },
    [locationByUserId, locationByEmail, memberEmailById],
  );
  const placeById = React.useMemo(() => new Map(places.map((p) => [p._id, p])), [places]);
  const myCoords = myUserId ? resolveLocation(myUserId)?.coords : undefined;
  const distanceMiFor = React.useCallback(
    (userId: string) => {
      if (!myCoords || userId === myUserId) return null;
      const loc = resolveLocation(userId);
      return loc?.coords ? haversineMi(myCoords, loc.coords) : null;
    },
    [myCoords, myUserId, resolveLocation],
  );

  const viewingUserId = selectedUserId ?? myUserId ?? null;

  const fromIso = from ? new Date(`${from}T00:00:00`).toISOString() : undefined;
  const toIso = to ? new Date(`${to}T23:59:59`).toISOString() : undefined;
  const { data: history = [], isLoading: historyLoading } = useLocationHistory(viewingUserId, fromIso, toIso);
  const { data: report = [] } = useTimeAtPlaceReport(
    isAdmin && viewingUserId ? { from: fromIso, to: toIso, userId: viewingUserId } : { from: undefined, to: undefined },
  );

  const sharingCount = activeLocations.filter((l) => l.sharingState === "sharing").length;
  const onlineCount = members.filter((m) => m.onlineStatus === "online").length;
  const offlineCount = members.filter((m) => m.onlineStatus === "offline").length;
  const activeCount = members.length - offlineCount;
  const pct = (n: number) => (members.length ? Math.round((n / members.length) * 100) : 0);

  const statMetrics = [
    { label: "Online Now", value: onlineCount, sub: `${pct(onlineCount)}% of team`, accent: "text-green-600 dark:text-green-400" },
    { label: "Active", value: activeCount, sub: `${members.length} total`, accent: "text-blue-600 dark:text-blue-400" },
    { label: "Sharing", value: sharingCount, sub: "live on map", accent: "text-emerald-600 dark:text-emerald-400" },
    { label: "Offline", value: offlineCount, sub: `${pct(offlineCount)}% of team`, accent: "text-muted-foreground/60" },
  ];

  const handleSelect = React.useCallback((userId: string) => {
    setSelectedUserId(userId);
    const loc = resolveLocation(userId);
    if (loc?.coords) focusRef.current?.(loc.coords.lat, loc.coords.lng);
  }, [resolveLocation]);

  const handleClosePanel = React.useCallback(() => setSelectedUserId(null), []);

  const handleLocateViewing = React.useCallback(() => {
    if (!viewingUserId) return;
    const loc = resolveLocation(viewingUserId);
    if (loc?.coords) focusRef.current?.(loc.coords.lat, loc.coords.lng);
  }, [viewingUserId, resolveLocation]);

  const availableDepartments = React.useMemo(() => {
    const present = new Set(members.map((m) => m.personalInfo?.department).filter((d): d is string => !!d));
    return DEPARTMENTS.filter((d) => present.has(d.key));
  }, [members]);

  const rosterPeople = React.useMemo<RosterPerson[]>(() => {
    const q = search.toLowerCase();
    let list = members.filter((m) => !q || m.name.toLowerCase().includes(q));
    if (rosterFilter === "active") list = list.filter((m) => m.onlineStatus !== "offline");
    else if (rosterFilter === "offline") list = list.filter((m) => m.onlineStatus === "offline");
    if (departmentFilter !== "all") list = list.filter((m) => m.personalInfo?.department === departmentFilter);
    const sorted = [...list].sort((a, b) => {
      if (a._id === myUserId) return -1;
      if (b._id === myUserId) return 1;
      const aShare = resolveLocation(a._id)?.sharingState === "sharing" ? 1 : 0;
      const bShare = resolveLocation(b._id)?.sharingState === "sharing" ? 1 : 0;
      return bShare - aShare;
    });
    return sorted.map((m) => {
      const loc = resolveLocation(m._id);
      return memberToRosterPerson(
        m, m._id === myUserId, loc, loc?.currentPlaceId ? placeById.get(loc.currentPlaceId) : undefined, distanceMiFor(m._id),
      );
    });
  }, [members, search, rosterFilter, departmentFilter, myUserId, resolveLocation, placeById, distanceMiFor]);

  const sharingRosterPeople = React.useMemo(
    () => rosterPeople.filter((p) => p.loc?.sharingState === "sharing"),
    [rosterPeople],
  );
  const restRosterPeople = React.useMemo(
    () => rosterPeople.filter((p) => p.loc?.sharingState !== "sharing"),
    [rosterPeople],
  );

  const filteredEvents = React.useMemo(() => {
    if (streamFilter === "all") return events;
    return events.filter((e) => EVENT_CATEGORY[e.type] === streamFilter);
  }, [events, streamFilter]);

  const eventGroups = React.useMemo(() => {
    const groups: { label: string; events: ActivityEvent[] }[] = [];
    for (const event of filteredEvents) {
      const label = isTodayMDT(event.createdAt) ? "Today" : isYesterdayMDT(event.createdAt) ? "Yesterday" : fmtWeekdayDateMDT(event.createdAt);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.events.push(event);
      else groups.push({ label, events: [event] });
    }
    return groups;
  }, [filteredEvents]);

  const viewingLoc = viewingUserId ? resolveLocation(viewingUserId) : undefined;
  const viewingMember = viewingUserId ? members.find((m) => m._id === viewingUserId) : undefined;
  const viewingPlace = viewingLoc?.currentPlaceId ? placeById.get(viewingLoc.currentPlaceId) : undefined;
  const isSelf = !selectedUserId || selectedUserId === myUserId;

  const handlePlacePicked = React.useCallback((lat: number, lng: number) => {
    setPickedCoords({ lat, lng });
    setPlacePickMode(false);
  }, []);

  React.useEffect(() => {
    const el = streamEndRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, filteredEvents.length]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/30">
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
      </div>

      <div className="space-y-3">
        <SectionHeading icon={MapIcon} label="Live Map" accent
          right={<span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-green-600 dark:text-green-400"><Radio className="size-3" /> Live</span>}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-stretch">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <LocatorLiveMapSection
              selectedUserId={selectedUserId}
              onSelectUser={handleSelect}
              onClearSelection={handleClosePanel}
              historyPoints={history}
              snapHistoryToRoads={!isMobileMonitoringDept(viewingLoc?.department)}
              focusRef={focusRef}
              myUserId={myUserId}
              placePickMode={placePickMode}
              onPlacePicked={handlePlacePicked}
              draftPlace={draftPlace}
            />
          </motion.div>

          {/* Fixed height (not min-h) — a tall Location History list must scroll inside the
              panel instead of stretching this row taller than the map next to it. */}
          <div className="xl:sticky xl:top-20 xl:h-full">
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
      </div>

      <div className="flex items-center gap-1.5 lg:hidden">
        {([
          { key: "roster" as const, label: "Live Roster", icon: Users },
          { key: "stream" as const, label: "Activity Stream", icon: TrendingUp },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMobilePanel(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border transition-all",
              mobilePanel === key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/40 text-muted-foreground/60 hover:border-border hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
        <div className={cn("space-y-3", mobilePanel === "roster" ? "block" : "hidden", "lg:block")}>
          <SectionHeading icon={Users} label="Live Roster"
            right={<span className="text-[10px] text-muted-foreground/40 tabular-nums">{rosterPeople.length} shown</span>}
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members…"
                className="pl-7 h-8 text-xs bg-background border-border/50"
              />
            </div>
            {availableDepartments.length > 0 && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger size="sm" className="h-8 text-[11px] font-semibold w-auto min-w-28 bg-background border-border/50">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                  {availableDepartments.map((d) => (
                    <SelectItem key={d.key} value={d.key} className="text-xs">{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-1 flex-wrap">
            {(Object.keys(FILTER_LABELS) as RosterFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setRosterFilter(f)}
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all shrink-0",
                  rosterFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/40 text-muted-foreground/60 hover:border-border hover:text-foreground",
                )}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className={cn("space-y-2 pr-0.5 overflow-y-auto", LIST_HEIGHT)}>
            {rosterPeople.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground/40">
                <User2 className="size-8" />
                <p className="text-xs">No members match this filter</p>
              </div>
            ) : (
              <>
                {sharingRosterPeople.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 sm:sticky sm:top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Currently Sharing</span>
                      <span className="text-[9px] font-bold text-muted-foreground/30 tabular-nums">{sharingRosterPeople.length}</span>
                      <span className="flex-1 h-px bg-border/30" />
                    </div>
                    {sharingRosterPeople.map((person) => (
                      <RosterCard
                        key={person.id}
                        person={person}
                        isAdmin={isAdmin}
                        isSelected={selectedUserId === person.id}
                        onSelect={() => handleSelect(person.id)}
                        isShiftGoverned={person.isMe && myShiftGoverned}
                      />
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {sharingRosterPeople.length > 0 && (
                    <div className="flex items-center gap-2 sm:sticky sm:top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Everyone Else</span>
                      <span className="text-[9px] font-bold text-muted-foreground/30 tabular-nums">{restRosterPeople.length}</span>
                      <span className="flex-1 h-px bg-border/30" />
                    </div>
                  )}
                  {restRosterPeople.map((person) => (
                    <RosterCard
                      key={person.id}
                      person={person}
                      isAdmin={isAdmin}
                      isSelected={selectedUserId === person.id}
                      onSelect={() => handleSelect(person.id)}
                      isShiftGoverned={person.isMe && myShiftGoverned}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={cn("space-y-3", mobilePanel === "stream" ? "block" : "hidden", "lg:block")}>
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
              <div className="px-3 overflow-y-auto flex-1">
                {eventGroups.map((group) => (
                  <div key={group.label} className="divide-y divide-border/30">
                    <div className="flex items-center gap-2 sticky top-0 bg-card/95 backdrop-blur-sm py-1.5 z-10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{group.label}</span>
                      <span className="flex-1 h-px bg-border/30" />
                    </div>
                    {group.events.map((event, i) => (
                      <EventItem key={event._id} event={event} myUserId={myUserId} index={i} />
                    ))}
                  </div>
                ))}
                {hasNextPage && (
                  <div ref={streamEndRef} className="py-2.5 flex justify-center">
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

      <div className="space-y-3">
        <SectionHeading icon={Car} label="Operations" />

        {isAdmin && (
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <button
              onClick={() => setPlacesOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5"
            >
              <div className="flex items-center justify-center size-6 rounded-lg bg-muted/60 shrink-0">
                <MapPin className="size-3.5 text-muted-foreground/60" />
              </div>
              <span className="text-[11px] font-bold">Company Places</span>
              <span className="text-[10px] text-muted-foreground/40 tabular-nums">{places.length}</span>
              <ChevronDown className={cn("size-3.5 text-muted-foreground/50 ml-auto transition-transform", placesOpen && "rotate-180")} />
            </button>
            {placesOpen && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-border/30">
                <PlacesAdminPanel
                  pickMode={placePickMode}
                  onStartPick={() => setPlacePickMode(true)}
                  onCancelPick={() => setPlacePickMode(false)}
                  pickedCoords={pickedCoords}
                  onPickConsumed={() => setPickedCoords(null)}
                  onDraftChange={setDraftPlace}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2.5">
          <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
            <Car className="size-3" /> Test-Drive Safety
          </p>
          <DrivingSessionsPanel myUserId={myUserId} />
        </div>
      </div>
    </div>
  );
}
