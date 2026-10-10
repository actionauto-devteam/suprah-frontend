"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, Loader2, Headphones } from 'lucide-react';
import { useCallRecordingApi, recordingError, type RecordingPermission } from '@/hooks/useCallRecordingApi';
import { RecordingPermissionsSection } from '@/components/communications/RecordingPermissionsSection';
import { updateRecordingGrant, type RecordingDirectory, type RecordingStaff } from '@/lib/recording-access';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

type Policy = { _id?: string; name: string; number: string; direction: 'inbound' | 'outbound'; enabled: boolean; retentionMonths: number; connectionId: string; legalApproved: boolean; providerVerified: boolean; disclosureOwner: 'pending' | 'suprah' | 'provider'; disclosureText: string; disclosureLanguage: string; providerDisclosureVerified: boolean; consentMode: 'pending' | 'notice' | 'staff-confirmed' };
type Settings = RecordingDirectory & { policies: Policy[] };
const field = 'min-h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm';
const blank = (): Policy => ({ name: 'Call recording', number: '', direction: 'inbound', enabled: false, retentionMonths: 6, connectionId: '', legalApproved: false, providerVerified: false, disclosureOwner: 'pending', disclosureText: '', disclosureLanguage: 'en-US', providerDisclosureVerified: false, consentMode: 'pending' });
function PolicyForm({ initial, save, close }: { initial: Policy; save: (policy: Policy) => Promise<void>; close: () => void }) {
  const [policy, setPolicy] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const patch = (value: Partial<Policy>) => setPolicy(current => ({ ...current, ...value }));
  return <form className="min-w-0 space-y-5" onSubmit={async event => { event.preventDefault(); if (policy.enabled && !window.confirm('Enable recording only after provider QA and legal approval for this number and direction. Continue?')) return; setBusy(true); setError(''); try { await save(policy); close(); } catch (err) { setError(recordingError(err)); } finally { setBusy(false); } }}>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <label className="flex min-h-11 items-center gap-3 text-sm"><Switch checked={policy.enabled} onCheckedChange={enabled => patch({ enabled })} aria-label="Recording enabled" />Recording enabled</label>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Policy name<input required maxLength={120} className={field} value={policy.name} onChange={e => patch({ name: e.target.value })} /></label>
        <label className="space-y-1 text-sm">Dealership number (E.164)<input required type="tel" pattern="\+[1-9][0-9]{7,14}" className={field} value={policy.number} onChange={e => patch({ number: e.target.value })} /></label>
        <label className="space-y-1 text-sm">Direction<select className={field} value={policy.direction} onChange={e => patch({ direction: e.target.value as Policy['direction'] })}><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select></label>
        <label className="space-y-1 text-sm">Retention (calendar months)<input required type="number" min={1} max={120} className={field} value={policy.retentionMonths} onChange={e => patch({ retentionMonths: Number(e.target.value) })} /></label>
        <label className="space-y-1 text-sm">Verified provider connection ID<input maxLength={120} className={field} value={policy.connectionId} onChange={e => patch({ connectionId: e.target.value })} /></label>
        <label className="space-y-1 text-sm">Disclosure owner<select className={field} value={policy.disclosureOwner} onChange={e => patch({ disclosureOwner: e.target.value as Policy['disclosureOwner'] })}><option value="pending">Pending confirmation</option><option value="suprah">Suprah</option><option value="provider">Provider</option></select></label>
        <label className="space-y-1 text-sm">Disclosure language<input className={field} pattern="[a-z]{2}-[A-Z]{2}" value={policy.disclosureLanguage} onChange={e => patch({ disclosureLanguage: e.target.value })} /></label>
        <label className="space-y-1 text-sm">Consent policy<select className={field} value={policy.consentMode} onChange={e => patch({ consentMode: e.target.value as Policy['consentMode'] })}><option value="pending">Pending legal decision</option><option value="notice">Approved notice</option><option value="staff-confirmed">Staff confirms customer consent</option></select></label>
      </div>
      <label className="block space-y-1 text-sm">Approved disclosure<textarea rows={3} maxLength={3000} className={field} value={policy.disclosureText} onChange={e => patch({ disclosureText: e.target.value })} /></label>
      <div className="space-y-2">{(['legalApproved', 'providerVerified', 'providerDisclosureVerified'] as const).map(key => <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={policy[key]} onChange={e => patch({ [key]: e.target.checked })} />{key === 'legalApproved' ? 'Legal / business policy approved' : key === 'providerVerified' ? 'Provider lifecycle verified in staging' : 'Provider disclosure verified (provider-owned only)'}</label>)}</div>
    </fieldset>
    {error && <p role="alert" className="break-words text-sm text-red-500">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save policy</Button><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={close}>Cancel</Button></div>
  </form>;
}
export default function CallRecordingSettingsPage() {
  const { request, orgId, authKey } = useCallRecordingApi();
  const [editing, setEditing] = useState<Policy | null>(null);
  const queryClient = useQueryClient();
  const queryKey = ['call-recording-settings', orgId, authKey];
  const query = useQuery({ queryKey, retry: false, queryFn: () => request<Settings>('get', '/recording-settings') });
  const saveAccess = async (person: RecordingStaff, permissions: RecordingPermission[]) => {
    await queryClient.cancelQueries({ queryKey, exact: true });
    await request('put', '/recording-grants', { principalId: person.id, principalKind: person.kind, permissions });
    await queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData<Settings>(queryKey, current => current ? updateRecordingGrant(current, person, permissions) : current);
  };
  const save = async (policy: Policy) => {
    const body = Object.fromEntries(Object.keys(blank()).map(k => [k, policy[k as keyof Policy]]));
    await request(policy._id ? 'put' : 'post', `/recording-settings${policy._id ? `/${policy._id}` : ''}`, body);
    await query.refetch();
  };
  return <main className="mx-auto w-full min-w-0 max-w-5xl space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-center gap-3 border-b pb-4"><Link href="/crm/settings" aria-label="Back to settings" title="Back to settings" className="flex h-11 w-11 items-center justify-center rounded-md border"><ArrowLeft className="h-4 w-4" /></Link><Headphones className="h-5 w-5 text-emerald-500" /><h1 className="text-lg font-semibold">Call Recording</h1></header>
    {query.isPending ? <Loader2 aria-label="Loading recording settings" className="h-5 w-5 animate-spin" /> : query.isError && !query.data ? <p role="alert" className="break-words text-sm text-red-500">{recordingError(query.error)}</p> : editing ? <PolicyForm key={editing._id || 'new'} initial={editing} save={save} close={() => setEditing(null)} /> : query.data && <>
      <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">Number policies</h2><Button variant="outline" className="min-h-11" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" />Add policy</Button></div>
        {!query.data.policies.length && <p className="text-sm text-muted-foreground">Recording disabled - no policies configured</p>}
        {query.data.policies.map(p => <button key={p._id} className="flex min-h-16 w-full flex-wrap justify-between gap-3 border-b py-4 text-left text-sm" onClick={() => setEditing(p)}><span className="min-w-0 break-words">{p.name}<span className="block text-muted-foreground">{p.number} - {p.direction}</span></span><span>{p.enabled ? 'Enabled' : 'Disabled'} - {p.retentionMonths} months</span></button>)}
      </section>
      <RecordingPermissionsSection directory={query.data} save={saveAccess} />
    </>}
  </main>;
}
