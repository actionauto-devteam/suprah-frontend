"use client";

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useCallRecordingApi, recordingError, type RecordingAccess, type RecordingPermission } from '@/hooks/useCallRecordingApi';
import { RecordingPermissionsSection } from '@/components/communications/RecordingPermissionsSection';
import { CallRecordingsList } from '@/components/communications/CallRecordingsList';
import { updateRecordingGrant, type RecordingDirectory, type RecordingStaff } from '@/lib/recording-access';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RecordingSettings = { announcementText: string; retentionMonths: number };
type Settings = RecordingDirectory & { settings: RecordingSettings };
const field = 'min-h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm';

function SettingsForm({ initial, save }: { initial: RecordingSettings; save: (value: RecordingSettings) => Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const changed = value.announcementText.trim() !== initial.announcementText || value.retentionMonths !== initial.retentionMonths;
  return <form className="min-w-0 max-w-2xl space-y-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try { await save({ announcementText: value.announcementText.trim(), retentionMonths: value.retentionMonths }); setSaved(true); } catch (err) { setError(recordingError(err)); } finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <label className="block space-y-1 text-sm"><span className="block font-medium">Announcement</span>
        <textarea required rows={3} maxLength={300} className={field} value={value.announcementText} onChange={event => { setSaved(false); setValue({ ...value, announcementText: event.target.value }); }} />
        <span className="block text-xs text-muted-foreground">The customer and the rep hear this right before the recording starts.</span>
      </label>
      <label className="block space-y-1 text-sm"><span className="block font-medium">Keep recordings for (months)</span>
        <input required type="number" min={1} max={120} className={`${field} sm:w-40`} value={value.retentionMonths} onChange={event => { setSaved(false); setValue({ ...value, retentionMonths: Number(event.target.value) }); }} />
        <span className="block text-xs text-muted-foreground">Recordings are deleted automatically after this many months.</span>
      </label>
    </fieldset>
    {error && <p role="alert" className="break-words text-sm text-red-500">{error}</p>}
    {saved && <p role="status" className="text-sm text-emerald-600">Settings saved.</p>}
    <Button type="submit" className="min-h-11" disabled={busy || !changed}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save settings</Button>
  </form>;
}

export function RecordingsPanel() {
  const { request, orgId, authKey } = useCallRecordingApi();
  const queryClient = useQueryClient();
  const access = useQuery({ queryKey: ['call-recording-access', orgId, authKey], retry: false, queryFn: () => request<RecordingAccess>('get', '/recording-access') });
  const isAdmin = Boolean(access.data?.admin);
  const canList = isAdmin || Boolean(access.data?.permissions.includes('view'));
  const queryKey = ['call-recording-settings', orgId, authKey];
  const settings = useQuery({ queryKey, enabled: isAdmin, retry: false, queryFn: () => request<Settings>('get', '/recording-settings') });
  const saveAccess = async (person: RecordingStaff, permissions: RecordingPermission[]) => {
    await queryClient.cancelQueries({ queryKey, exact: true });
    await request('put', '/recording-grants', { principalId: person.id, principalKind: person.kind, permissions });
    await queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData<Settings>(queryKey, current => current ? updateRecordingGrant(current, person, permissions) : current);
    await queryClient.invalidateQueries({ queryKey: ['call-recording-access'] });
  };
  const saveSettings = async (value: RecordingSettings) => {
    await request('put', '/recording-settings', value);
    queryClient.setQueryData<Settings>(queryKey, current => current ? { ...current, settings: value } : current);
  };
  return <div className="min-w-0 space-y-5">
    {access.isPending ? <Loader2 aria-label="Loading call recordings" className="h-5 w-5 animate-spin" />
      : access.isError ? <p role="alert" className="break-words text-sm text-red-500">{recordingError(access.error)}</p>
      : !canList ? <p role="alert" className="break-words rounded-lg border p-4 text-sm text-muted-foreground">You don&apos;t have access to call recordings. Ask an admin to give you access.</p>
      : !isAdmin ? <CallRecordingsList />
      : <Tabs defaultValue="recordings" className="min-w-0 space-y-5">
        <TabsList aria-label="Recording sections" className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="recordings" className="min-h-10">Recorded calls</TabsTrigger>
          <TabsTrigger value="access" className="min-h-10">Who can access</TabsTrigger>
          <TabsTrigger value="settings" className="min-h-10">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="recordings" className="min-w-0"><CallRecordingsList /></TabsContent>
        <TabsContent value="access" className="min-w-0">{settings.isPending ? <Loader2 aria-label="Loading access" className="h-5 w-5 animate-spin" /> : settings.data ? <RecordingPermissionsSection directory={settings.data} save={saveAccess} /> : <p role="alert" className="break-words text-sm text-red-500">{recordingError(settings.error)}</p>}</TabsContent>
        <TabsContent value="settings" className="min-w-0">{settings.isPending ? <Loader2 aria-label="Loading settings" className="h-5 w-5 animate-spin" /> : settings.data ? <SettingsForm initial={settings.data.settings} save={saveSettings} /> : <p role="alert" className="break-words text-sm text-red-500">{recordingError(settings.error)}</p>}</TabsContent>
      </Tabs>}
  </div>;
}
