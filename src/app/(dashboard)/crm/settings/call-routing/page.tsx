"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Phone, Plus, Save, Trash2, Users } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { CrmLeadGroup } from '@/hooks/useCrmLeadGroups';

type Option = {
  digit: string; label: string; type: 'location' | 'department' | 'language' | 'number';
  groupId: string | null; leadLocation: string; language: string; externalDestination: string; phoneNumberId?: string | null;
};
type PhoneNumberChoice = { _id: string; number: string; label: string; ringGroupName?: string; ringGroupId?: string | null };
type Config = {
  _id?: string; enabled: boolean; name: string; inboundNumber: string; mainNumber: string;
  greeting: string; ringTimeoutSeconds: number; retryCount: number;
  receptionGroupId: string | null; allOrgFallback: boolean; options: Option[];
};

const field = 'min-h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm';
const newConfig = (): Config => ({
  enabled: false, name: 'Dealership IVR', inboundNumber: '', mainNumber: '+18017666137',
  greeting: 'Thank you for calling. Press 0 for Spanish assistance. Press 1 for Orem. Press 2 for Lehi. Press 3 for Service. Press 4 for Title and Licensing.',
  ringTimeoutSeconds: 35, retryCount: 1, receptionGroupId: null, allOrgFallback: false,
  options: [
    { digit: '0', label: 'Spanish', type: 'language', groupId: null, leadLocation: '', language: 'Spanish', externalDestination: '' },
    { digit: '1', label: 'Orem', type: 'location', groupId: null, leadLocation: 'Orem', language: '', externalDestination: '' },
    { digit: '2', label: 'Lehi', type: 'location', groupId: null, leadLocation: 'Lehi', language: '', externalDestination: '' },
    { digit: '3', label: 'Service', type: 'department', groupId: null, leadLocation: '', language: '', externalDestination: '+18018752782' },
    { digit: '4', label: 'Title/Licensing', type: 'department', groupId: null, leadLocation: '', language: '', externalDestination: '' },
  ],
});

function message(error: unknown): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to save call routing.';
}

function RoutingForm({ initial, groups, numbers, save, pending, cancel }: {
  initial: Config; groups: CrmLeadGroup[]; numbers: PhoneNumberChoice[]; save: (config: Config) => Promise<Config>; pending: boolean; cancel: () => void;
}) {
  const [config, setConfig] = useState(initial);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const patch = (values: Partial<Config>) => { setConfig(current => ({ ...current, ...values })); setSaved(false); };
  const optionPatch = (index: number, values: Partial<Option>) => patch({ options: config.options.map((option, i) => i === index ? { ...option, ...values } : option) });
  const groupOptions = <><option value="">Select Lead Group</option>{groups.map(group => <option key={group._id} value={group._id}>{group.name} ({group.memberIds.length})</option>)}</>;
  const submit = async () => {
    setError(''); setSaved(false);
    if (new Set(config.options.map(option => option.digit)).size !== config.options.length) { setError('Each digit must be unique.'); return; }
    try { const updated = await save(config); setConfig(updated); setSaved(true); } catch (err) { setError(message(err)); }
  };
  return (
    <form className="min-w-0 space-y-6" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <fieldset disabled={pending} className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <h2 className="text-base font-semibold">{config._id ? 'Edit routing' : 'New routing'}</h2>
          <label className="flex min-h-11 items-center gap-3 text-sm"><Switch checked={config.enabled} onCheckedChange={enabled => patch({ enabled })} aria-label="IVR enabled" />IVR enabled</label>
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Configuration name<input required maxLength={120} className={field} value={config.name} onChange={event => patch({ name: event.target.value })} /></label>
          <label className="space-y-1 text-sm">Inbound IVR number<input required type="tel" className={field} value={config.inboundNumber} onChange={event => patch({ inboundNumber: event.target.value })} /></label>
          <label className="space-y-1 text-sm">Public main number<input required type="tel" className={field} value={config.mainNumber} onChange={event => patch({ mainNumber: event.target.value })} /></label>
          <label className="space-y-1 text-sm">Reception Lead Group<select aria-label="Reception Lead Group" required={config.enabled} className={field} value={config.receptionGroupId || ''} onChange={event => patch({ receptionGroupId: event.target.value || null })}>{groupOptions}</select></label>
          <label className="space-y-1 text-sm">Ring timeout (seconds)<input required type="number" min={10} max={120} className={field} value={config.ringTimeoutSeconds} onChange={event => patch({ ringTimeoutSeconds: Number(event.target.value) })} /></label>
          <label className="space-y-1 text-sm">Menu retries<input required type="number" min={0} max={3} className={field} value={config.retryCount} onChange={event => patch({ retryCount: Number(event.target.value) })} /></label>
        </div>
        <label className="block space-y-1 text-sm">Greeting and menu<textarea required maxLength={3000} rows={4} className={field} value={config.greeting} onChange={event => patch({ greeting: event.target.value })} /></label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <h3 className="text-sm font-semibold">Menu options</h3>
          <Button type="button" className="min-h-11" variant="outline" disabled={config.options.length >= 10} onClick={() => {
            const digit = Array.from({ length: 10 }, (_, i) => String(i)).find(value => !config.options.some(option => option.digit === value));
            if (digit) patch({ options: [...config.options, { digit, label: '', type: 'department', groupId: null, leadLocation: '', language: '', externalDestination: '' }] });
          }}><Plus className="h-4 w-4" />Add option</Button>
        </div>
        <div className="space-y-5">
          {config.options.map((option, index) => (
            <div key={index} className="min-w-0 space-y-3 border-b pb-5">
              <div className="flex items-center justify-between gap-3"><h4 className="break-words text-sm font-semibold">Press {option.digit}{option.label && ` - ${option.label}`}</h4><Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" title="Remove option" aria-label={`Remove option ${option.digit}`} disabled={config.options.length === 1} onClick={() => patch({ options: config.options.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1 text-sm">Digit<select className={field} value={option.digit} onChange={event => optionPatch(index, { digit: event.target.value })}>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></label>
                <label className="space-y-1 text-sm">Label<input required maxLength={80} className={field} value={option.label} onChange={event => optionPatch(index, { label: event.target.value })} /></label>
                <label className="space-y-1 text-sm">Route type<select className={field} value={option.type} onChange={event => optionPatch(index, { type: event.target.value as Option['type'], leadLocation: '', language: '', ...(event.target.value === 'number' ? { groupId: null, externalDestination: '' } : { phoneNumberId: null }) })}><option value="number">Dealership number</option><option value="location">Location</option><option value="department">Department</option><option value="language">Language</option></select></label>
                {option.type === 'number' && <label className="space-y-1 text-sm">Dealership number<select aria-label={`Dealership number for option ${option.digit}`} required className={field} value={option.phoneNumberId || ''} onChange={event => optionPatch(index, { phoneNumberId: event.target.value || null })}><option value="">Select a number</option>{numbers.map(number => <option key={number._id} value={number._id}>{number.label} ({number.number})</option>)}</select><span className="block text-xs text-muted-foreground">{(() => { const chosen = numbers.find(number => number._id === option.phoneNumberId); return chosen ? `Rings ${chosen.ringGroupId ? chosen.ringGroupName || 'its team' : 'everyone'}, as set on the Phone Numbers page.` : 'Uses the team set for that number on the Phone Numbers page.'; })()}</span></label>}
                {option.type !== 'number' && <label className="space-y-1 text-sm">Target Lead Group<select aria-label={`Target Lead Group for option ${option.digit}`} required={config.enabled && !(option.digit === '0' && option.type === 'language')} disabled={option.digit === '0' && option.type === 'language'} className={field} value={option.digit === '0' && option.type === 'language' ? config.receptionGroupId || '' : option.groupId || ''} onChange={event => optionPatch(index, { groupId: event.target.value || null })}>{groupOptions}</select></label>}
                {option.type === 'location' && <label className="space-y-1 text-sm">Lead location<input maxLength={120} className={field} value={option.leadLocation} onChange={event => optionPatch(index, { leadLocation: event.target.value })} /></label>}
                {option.type === 'language' && <label className="space-y-1 text-sm">Language request<input maxLength={40} className={field} value={option.language} onChange={event => optionPatch(index, { language: event.target.value })} /></label>}
                {option.type !== 'number' && <label className="space-y-1 text-sm">External number (pending verification)<input type="tel" className={field} value={option.externalDestination} onChange={event => optionPatch(index, { externalDestination: event.target.value })} /><span className="block text-xs text-muted-foreground">External transfer disabled</span></label>}
              </div>
            </div>
          ))}
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm"><Switch checked={config.allOrgFallback} onCheckedChange={allOrgFallback => patch({ allOrgFallback })} aria-label="All organization fallback" />Ring all organization users after Reception</label>
      </fieldset>
      {error && <p role="alert" className="break-words text-sm text-red-500">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-600">Call routing saved</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" className="min-h-11" variant="outline" onClick={cancel} disabled={pending}>Close</Button><Button type="submit" className="min-h-11" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save routing</Button></div>
    </form>
  );
}

export default function CallRoutingSettingsPage() {
  const { getToken, orgId } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Config | null>(null);
  const headers = async () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('crm_token') || await getToken()}` } });
  const key = ['crm-call-routing', orgId];
  const query = useQuery({ queryKey: key, retry: false, queryFn: async () => {
    const auth = await headers();
    const [routing, groupResponse, numberResponse] = await Promise.all([
      apiClient.get('/api/crm/communications/ivr-configs', auth),
      apiClient.get('/api/crm/lead-groups', auth),
      apiClient.get('/api/crm/phone-numbers', auth).catch(() => null),
    ]);
    return { configs: routing.data.data.configs as Config[], groups: groupResponse.data.data as CrmLeadGroup[], numbers: (numberResponse?.data?.data?.numbers || []) as PhoneNumberChoice[] };
  } });
  const mutation = useMutation({ mutationFn: async (config: Config) => {
    const { _id, ...body } = config;
    const payload = { enabled: body.enabled, name: body.name, inboundNumber: body.inboundNumber, mainNumber: body.mainNumber,
      greeting: body.greeting, ringTimeoutSeconds: body.ringTimeoutSeconds, retryCount: body.retryCount,
      receptionGroupId: body.receptionGroupId, allOrgFallback: body.allOrgFallback,
      options: body.options.map(option => ({ digit: option.digit, label: option.label, type: option.type, groupId: option.groupId,
        leadLocation: option.leadLocation, language: option.language, externalDestination: option.externalDestination,
        phoneNumberId: option.type === 'number' ? option.phoneNumberId || null : null })),
    };
    const auth = await headers();
    const response = _id ? await apiClient.put(`/api/crm/communications/ivr-configs/${_id}`, payload, auth) : await apiClient.post('/api/crm/communications/ivr-configs', payload, auth);
    return response.data.data as Config;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-center gap-3"><Link href="/crm/settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border" title="Back to settings" aria-label="Back to settings"><ArrowLeft className="h-4 w-4" /></Link><h1 className="flex items-center gap-2 text-lg font-semibold"><Phone className="h-5 w-5 text-emerald-500" />Call Routing</h1></div>
        <Link href="/crm/settings/lead-groups" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />Lead Groups</Link>
      </div>
      {query.isPending ? <Loader2 aria-label="Loading call routing" className="h-5 w-5 animate-spin" /> : query.isError ? <p role="alert" className="break-words text-sm text-red-500">{message(query.error)}</p> : editing ? (
        <RoutingForm key={editing._id || 'new'} initial={editing} groups={query.data.groups} numbers={query.data.numbers} pending={mutation.isPending} cancel={() => setEditing(null)} save={config => mutation.mutateAsync(config)} />
      ) : (
        <div className="space-y-4"><Button className="min-h-11" onClick={() => setEditing(newConfig())} variant="outline"><Plus className="h-4 w-4" />New configuration</Button>
          {query.data.configs.map(config => <button key={config._id} onClick={() => setEditing(config)} className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 border-b py-4 text-left"><span className="min-w-0"><span className="block break-words text-sm font-semibold">{config.name}</span><span className="block text-sm text-muted-foreground">{config.inboundNumber}</span></span><span className={`text-sm ${config.enabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</span></button>)}
          {!query.data.configs.length && <p className="text-sm text-muted-foreground">No call routing configurations</p>}
        </div>
      )}
    </main>
  );
}
