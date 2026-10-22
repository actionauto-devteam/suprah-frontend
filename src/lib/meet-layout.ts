export type MeetViewLayout = "auto" | "tiled" | "spotlight" | "sidebar";
export type MeetStageMode = "content" | "spotlight" | "sidebar" | "pip" | "grid";

export interface MeetStageInput<T extends { attendeeId: string }> {
  people: T[];
  selfId: string | null;
  pinnedId: string | null;
  activeSpeakerId: string | null;
  lastSpeakerId: string | null;
  layout: MeetViewLayout;
  hasContent: boolean;
}

export interface MeetStage<T> {
  mode: MeetStageMode;
  hero: T | null;
  self: T | null;
  others: T[];
}

export function pickMeetStage<T extends { attendeeId: string }>(input: MeetStageInput<T>): MeetStage<T> {
  const { people, selfId, pinnedId, activeSpeakerId, lastSpeakerId, layout, hasContent } = input;
  const others = people.filter((p) => p.attendeeId !== selfId);
  const self = people.find((p) => p.attendeeId === selfId) ?? null;
  const hero =
    people.find((p) => p.attendeeId === pinnedId) ??
    others.find((p) => p.attendeeId === activeSpeakerId) ??
    others.find((p) => p.attendeeId === lastSpeakerId) ??
    others[0] ?? self ?? people[0] ?? null;

  const mode: MeetStageMode =
    hasContent ? "content"
    : !hero ? "grid"
    : layout === "spotlight" || people.length === 1 ? "spotlight"
    : layout === "sidebar" || (pinnedId && people.some((p) => p.attendeeId === pinnedId)) ? "sidebar"
    : layout === "auto" && others.length === 1 && self ? "pip"
    : "grid";

  return { mode, hero, self, others };
}

export interface MeetRosterPerson { attendeeId: string; crmUserId: string; name: string; }
export interface MeetDirectoryEntry {
  crmUserId: string; fullName: string; department: string | null;
  isHost: boolean; joinedBefore: boolean;
}

export function splitMeetPeople<R extends MeetRosterPerson, D extends MeetDirectoryEntry>(input: {
  roster: R[];
  directory: D[] | null;
  hostCrmUserId: string | null;
  selfId: string | null;
  query: string;
}) {
  const { roster, directory, hostCrmUserId, selfId } = input;
  const q = input.query.trim().toLowerCase();
  const matches = (name: string, dept?: string | null) =>
    !q || name.toLowerCase().includes(q) || (dept ?? "").toLowerCase().includes(q);
  const byCrmId = new Map((directory ?? []).map((d) => [d.crmUserId, d]));
  const inCall = new Set(roster.map((p) => p.crmUserId));
  const rank = (p: R) => (p.attendeeId === selfId ? 0 : p.crmUserId === hostCrmUserId ? 1 : 2);

  const inMeeting = roster
    .filter((p) => matches(p.name, byCrmId.get(p.crmUserId)?.department))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  const allOut = (directory ?? []).filter((d) => !inCall.has(d.crmUserId));
  const notInMeeting = allOut
    .filter((d) => matches(d.fullName, d.department))
    .sort((a, b) => Number(b.isHost) - Number(a.isHost)
      || Number(b.joinedBefore) - Number(a.joinedBefore)
      || a.fullName.localeCompare(b.fullName));

  return { inMeeting, notInMeeting, notInTotal: allOut.length, byCrmId };
}
