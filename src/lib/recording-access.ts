import type { RecordingPermission } from '@/hooks/useCallRecordingApi';

export type RecordingStaff = { id: string; kind: 'crm' | 'main'; name: string; email: string; role?: string; department?: string; avatar?: string };
export type RecordingGrant = { principalId: string; principalKind: string; permissions: RecordingPermission[] };
export type RecordingDirectory = { staff: RecordingStaff[]; grants: RecordingGrant[]; permissions: RecordingPermission[] };
export const RECORDING_PERMISSION_LABELS: Record<RecordingPermission, string> = {
  view: 'Listen to recordings', download: 'Download recordings', share: 'Share recordings',
  review: 'Review recordings', control: 'Pause / Resume recording', delete: 'Delete recordings',
};
export const RECORDING_ACCESS_PRESETS = [
  { level: 'Viewer', permissions: ['view'], summary: 'Can listen to recordings' },
  { level: 'QA/Reviewer', permissions: ['view', 'review', 'download', 'share'], summary: 'Can listen, review, download and share' },
  { level: 'Full Access', permissions: ['view', 'review', 'download', 'share', 'delete'], summary: 'All recording permissions, including delete' },
] as const;
export type RecordingAccessLevel = typeof RECORDING_ACCESS_PRESETS[number]['level'] | 'Custom';
export const RECORDING_ACCESS_LEVELS: RecordingAccessLevel[] = [...RECORDING_ACCESS_PRESETS.map(p => p.level), 'Custom'];
export const recordingStaffKey = (person: Pick<RecordingStaff, 'id' | 'kind'>) => `${person.kind}:${person.id}`;
export function recordingAccessLevel(permissions: readonly RecordingPermission[]): RecordingAccessLevel {
  const unique = new Set(permissions.filter(key => key !== 'control'));
  return RECORDING_ACCESS_PRESETS.find(p => p.permissions.length === unique.size && p.permissions.every(key => unique.has(key)))?.level || 'Custom';
}
export function recordingAccessSummary(permissions: readonly RecordingPermission[]): string {
  const preset = RECORDING_ACCESS_PRESETS.find(p => p.level === recordingAccessLevel(permissions));
  return preset?.summary || Object.entries(RECORDING_PERMISSION_LABELS).filter(([key]) => key !== 'control' && permissions.includes(key as RecordingPermission)).map(([, label]) => label).join(', ') || 'No recording access';
}
export function recordingPermissionsFor(person: RecordingStaff, grants: readonly RecordingGrant[]): RecordingPermission[] {
  return grants.find(g => g.principalId === person.id && g.principalKind === person.kind)?.permissions || [];
}
export function recordingStaffDescription(person: RecordingStaff): string {
  const role = person.role?.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  return [role, person.department].filter(Boolean).join(' - ');
}
export function matchesRecordingStaff(person: RecordingStaff, search: string): boolean {
  return [person.name, person.email, person.role, person.department, recordingStaffDescription(person)].filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase());
}
export function updateRecordingGrant<T extends RecordingDirectory>(data: T, person: RecordingStaff, permissions: RecordingPermission[]): T {
  const previous = data.grants.find(g => g.principalId === person.id && g.principalKind === person.kind);
  const grants = data.grants.filter(g => g.principalId !== person.id || g.principalKind !== person.kind);
  return { ...data, grants: [...grants, { ...previous, principalId: person.id, principalKind: person.kind, permissions: [...new Set(permissions)] }] };
}
