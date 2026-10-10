"use client";

import { useId, useRef, useState } from 'react';
import { Check, ChevronDown, Download, Headphones, Loader2, MoreHorizontal, Pause, Pencil, Plus, Search, Share2, ShieldCheck, Trash2, UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { recordingError, type RecordingPermission } from '@/hooks/useCallRecordingApi';
import { RECORDING_ACCESS_LEVELS, RECORDING_ACCESS_PRESETS, RECORDING_PERMISSION_LABELS, recordingAccessLevel, recordingAccessSummary, recordingPermissionsFor, recordingStaffDescription, recordingStaffKey, matchesRecordingStaff, type RecordingAccessLevel, type RecordingDirectory, type RecordingStaff } from '@/lib/recording-access';

const tones: Record<RecordingAccessLevel, string> = {
  Viewer: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  'QA/Reviewer': 'border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300',
  'Full Access': 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Custom: 'border-border bg-muted text-muted-foreground',
};
const permissionIcons = { view: Headphones, download: Download, share: Share2, review: ShieldCheck, control: Pause, delete: Trash2 };
function AccessBadge({ level }: { level: RecordingAccessLevel }) {
  return <span className={cn('inline-flex max-w-full shrink-0 items-center rounded-md border px-2 py-1 text-[11px] font-semibold', tones[level])}>{level}</span>;
}
function StaffIdentity({ person }: { person: RecordingStaff }) {
  const name = person.name || person.email;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const description = recordingStaffDescription(person);
  return <div className="flex min-w-0 items-center gap-3">
    <Avatar className="h-10 w-10 shrink-0"><AvatarImage src={person.avatar} alt="" /><AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{initials}</AvatarFallback></Avatar>
    <div className="min-w-0"><p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{name}</p>{description && <p className="mt-0.5 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{description}</p>}</div>
  </div>;
}
function AccessDialog({ person, candidates, initialPermissions, availablePermissions, save, close, remove }: {
  person: RecordingStaff | null; candidates: RecordingStaff[]; initialPermissions: RecordingPermission[];
  availablePermissions: RecordingPermission[]; save: (person: RecordingStaff, permissions: RecordingPermission[]) => Promise<void>;
  close: () => void; remove: (person: RecordingStaff) => void;
}) {
  const [selected, setSelected] = useState(person);
  const [permissions, setPermissions] = useState<RecordingPermission[]>(person ? [...initialPermissions] : ['view']);
  const [level, setLevel] = useState<RecordingAccessLevel>(person ? recordingAccessLevel(initialPermissions) : 'Viewer');
  const [customExpanded, setCustomExpanded] = useState(Boolean(person && recordingAccessLevel(initialPermissions) === 'Custom'));
  const customPermissionsId = useId();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const submit = async () => {
    if (saving.current || !selected || !permissions.length) return;
    saving.current = true; setBusy(true); setError('');
    try { await save(selected, permissions); close(); }
    catch (err) { setError(recordingError(err)); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !saving.current) close(); }}>
    <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl" onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (saving.current) event.preventDefault(); }}>
      <header className="flex shrink-0 items-start justify-between gap-3 border-b p-4 sm:p-5"><div className="min-w-0"><DialogTitle className="break-words text-base leading-snug">{person ? `Edit access - ${person.name || person.email}` : 'Grant Recording Access'}</DialogTitle><DialogDescription className="sr-only">Call Recording permissions</DialogDescription></div><Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" title="Close" aria-label="Close access dialog" disabled={busy} onClick={close}><X className="h-4 w-4" /></Button></header>
      <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {person ? <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b pb-4"><StaffIdentity person={person} /><AccessBadge level={recordingAccessLevel(initialPermissions)} /></div> : <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">Employee</p>
            <Popover modal open={selectorOpen} onOpenChange={setSelectorOpen}><PopoverTrigger asChild><Button type="button" role="combobox" aria-label="Select employee" aria-expanded={selectorOpen} variant="outline" className="min-h-11 h-auto w-full min-w-0 justify-between gap-3 whitespace-normal py-3 text-left" disabled={busy}><span className="min-w-0 break-words">{selected ? selected.name || selected.email : 'Select employee'}</span><ChevronDown className="h-4 w-4 shrink-0" /></Button></PopoverTrigger>
              <PopoverContent aria-label="Employees" align="start" collisionPadding={16} className="flex max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] flex-col p-0"><Command shouldFilter={false} className="min-h-0 [&_[data-slot=command-input-wrapper]]:shrink-0"><CommandInput aria-label="Search employees to grant access" placeholder="Search employees..." value={search} onValueChange={setSearch} /><CommandList className="min-h-0 max-h-72 overscroll-contain"><CommandEmpty>No employees found</CommandEmpty>{candidates.filter(candidate => matchesRecordingStaff(candidate, search)).map(candidate => <CommandItem key={recordingStaffKey(candidate)} value={recordingStaffKey(candidate)} disabled={busy} className="min-h-16 gap-3 px-3 py-3" onSelect={() => { setSelected(candidate); setSelectorOpen(false); setSearch(''); setError(''); }}><div className="min-w-0 flex-1"><StaffIdentity person={candidate} /></div>{selected && recordingStaffKey(selected) === recordingStaffKey(candidate) && <Check className="h-4 w-4 shrink-0" />}</CommandItem>)}</CommandList></Command></PopoverContent>
            </Popover>
          </div>}
          <fieldset disabled={busy} className="space-y-2"><legend className="mb-3 text-xs font-semibold text-muted-foreground">Access level</legend>
            {RECORDING_ACCESS_LEVELS.map(option => {
              const preset = RECORDING_ACCESS_PRESETS.find(p => p.level === option);
              const rowClass = cn('flex min-h-16 items-center gap-3 rounded-md border px-3 py-3', level === option ? option === 'Full Access' ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/40 bg-emerald-500/5' : 'border-border', busy && 'cursor-wait opacity-70');
              if (option === 'Custom') return <div key={option} className={rowClass}>
                <input type="radio" name="recording-access-level" value={option} aria-label="Custom" checked={level === option} className="h-4 w-4 shrink-0 accent-emerald-600" onChange={() => { setLevel('Custom'); setCustomExpanded(true); setError(''); }} />
                <button type="button" aria-label="Custom permissions" aria-expanded={level === 'Custom' && customExpanded} aria-controls={customPermissionsId} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { setCustomExpanded(level !== 'Custom' || !customExpanded); setLevel('Custom'); setError(''); }}>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Custom</span><span className="mt-1 block text-xs text-muted-foreground">Custom permissions</span></span><ChevronDown className={cn('h-4 w-4 shrink-0', level === 'Custom' && customExpanded && 'rotate-180')} />
                </button>
              </div>;
              return <label key={option} className={cn(rowClass, 'cursor-pointer')}>
                <input type="radio" name="recording-access-level" value={option} checked={level === option} className="h-4 w-4 shrink-0 accent-emerald-600" onChange={() => { setLevel(option); setCustomExpanded(false); if (preset) setPermissions([...preset.permissions]); setError(''); }} />
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{option}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{preset?.summary}</span></span>
              </label>;
            })}
          </fieldset>
          {level === 'Custom' && <fieldset id={customPermissionsId} hidden={!customExpanded} disabled={busy} className="space-y-1 border-t pt-4"><legend className="px-0 text-xs font-semibold text-muted-foreground">Individual permissions</legend>{availablePermissions.map(permission => {
            const Icon = permissionIcons[permission];
            return <label key={permission} className={cn('flex min-h-14 cursor-pointer items-center gap-3 border-b py-3', permission === 'delete' && 'text-red-600 dark:text-red-400')}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 break-words text-sm">{RECORDING_PERMISSION_LABELS[permission]}{permission === 'delete' && <span className="ml-2 inline-block rounded border border-red-500/25 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold">Sensitive</span>}</span><input type="checkbox" checked={permissions.includes(permission)} className="h-4 w-4 shrink-0 accent-emerald-600" onChange={event => { setPermissions(current => event.target.checked ? [...current, permission] : current.filter(key => key !== permission)); setError(''); }} /></label>;
          })}</fieldset>}
          {person && <Button type="button" variant="outline" className="min-h-11 w-full border-red-500/25 text-red-600 hover:bg-red-500/10 dark:text-red-400" disabled={busy} onClick={() => remove(person)}><UserMinus className="h-4 w-4" />Remove recording access</Button>}
        </div>
        <footer className="shrink-0 space-y-3 border-t bg-background p-4 sm:p-5">{error && <p role="alert" className="break-words text-sm text-red-600 dark:text-red-400">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" className="min-h-11" disabled={busy || !selected || !permissions.length}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy ? 'Saving...' : 'Save access'}</Button></div></footer>
      </form>
    </DialogContent>
  </Dialog>;
}
export function RecordingPermissionsSection({ directory, save }: { directory: RecordingDirectory; save: (person: RecordingStaff, permissions: RecordingPermission[]) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RecordingAccessLevel | 'all'>('all');
  const [editing, setEditing] = useState<{ person: RecordingStaff | null; permissions: RecordingPermission[] } | null>(null);
  const [removing, setRemoving] = useState<RecordingStaff | null>(null);
  const [removalBusy, setRemovalBusy] = useState(false);
  const [removalError, setRemovalError] = useState('');
  const [success, setSuccess] = useState('');
  const removalSaving = useRef(false);
  const authorized = directory.staff.filter(person => recordingPermissionsFor(person, directory.grants).length > 0).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  const visible = authorized.filter(person => matchesRecordingStaff(person, search) && (filter === 'all' || recordingAccessLevel(recordingPermissionsFor(person, directory.grants)) === filter));
  const candidates = directory.staff.filter(person => !recordingPermissionsFor(person, directory.grants).length).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  const edit = (person: RecordingStaff) => { setSuccess(''); setEditing({ person, permissions: [...recordingPermissionsFor(person, directory.grants)] }); };
  const remove = (person: RecordingStaff) => { setRemovalError(''); setRemoving(person); };
  const confirmRemove = async () => {
    if (!removing || removalSaving.current) return;
    removalSaving.current = true; setRemovalBusy(true); setRemovalError('');
    try { await save(removing, []); setSuccess(`Recording access removed for ${removing.name || removing.email}`); setRemoving(null); setEditing(null); }
    catch (err) { setRemovalError(recordingError(err)); }
    finally { removalSaving.current = false; setRemovalBusy(false); }
  };
  return <section className="min-w-0 space-y-4 border-t pt-5" aria-labelledby="recording-permissions-heading">
    <h2 id="recording-permissions-heading" className="text-base font-semibold">Recording Permissions</h2>
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row"><Button className="order-first min-h-11 self-start sm:order-last sm:shrink-0" disabled={!candidates.length} onClick={() => { setSuccess(''); setEditing({ person: null, permissions: [] }); }}><Plus className="h-4 w-4" />Grant Access</Button>
      <label className="relative min-w-0 flex-1"><Search aria-hidden className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input aria-label="Search employees with recording access" placeholder="Search employees..." value={search} onChange={event => setSearch(event.target.value)} className="min-h-11 w-full min-w-0 rounded-md border bg-background py-2 pl-10 pr-3 text-sm" /></label>
      <select aria-label="Access Level filter" className="min-h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm sm:w-44" value={filter} onChange={event => setFilter(event.target.value as RecordingAccessLevel | 'all')}><option value="all">All Access Levels</option>{RECORDING_ACCESS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}</select>
    </div>
    <p className="text-xs text-muted-foreground">{visible.length !== authorized.length ? `${visible.length} of ` : ''}{authorized.length} {authorized.length === 1 ? 'employee' : 'employees'} with recording access</p>
    {success && <p role="status" className="break-words text-sm text-emerald-700 dark:text-emerald-300">{success}</p>}
    {!visible.length && <p className="py-6 text-center text-sm text-muted-foreground">{authorized.length ? 'No employees match your filters' : 'No employees have recording access'}</p>}
    <div className="space-y-3 sm:space-y-0">{visible.map(person => {
      const permissions = recordingPermissionsFor(person, directory.grants);
      const level = recordingAccessLevel(permissions);
      return <article key={recordingStaffKey(person)} className="flex min-w-0 items-start gap-3 rounded-lg border bg-muted/20 p-4 sm:items-center sm:rounded-none sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:px-0" aria-label={`${person.name || person.email} recording access`}>
        <div className="min-w-0 flex-1 space-y-2"><div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"><StaffIdentity person={person} /><span className="ml-13 sm:ml-0"><AccessBadge level={level} /></span></div><p className="ml-13 break-words text-xs text-muted-foreground">{recordingAccessSummary(permissions)}</p></div>
        <div className="flex shrink-0 items-center gap-1"><Button type="button" variant="outline" className="hidden min-h-11 sm:inline-flex" aria-label={`Edit access for ${person.name || person.email}`} onClick={() => edit(person)}><Pencil className="h-4 w-4" />Edit</Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-11 w-11" title="Access options" aria-label={`Access options for ${person.name || person.email}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" collisionPadding={12} className="w-48 max-w-[calc(100vw-2rem)]"><DropdownMenuItem className="min-h-11" onSelect={() => edit(person)}><Pencil className="h-4 w-4" />Edit access</DropdownMenuItem><DropdownMenuItem className="min-h-11" variant="destructive" onSelect={() => remove(person)}><UserMinus className="h-4 w-4" />Remove access</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </article>;
    })}</div>
    {editing && <AccessDialog key={editing.person ? recordingStaffKey(editing.person) : 'grant'} person={editing.person} initialPermissions={editing.permissions} candidates={candidates} availablePermissions={directory.permissions} close={() => setEditing(null)} remove={remove} save={async (person, permissions) => { await save(person, permissions); setSuccess(`Recording access saved for ${person.name || person.email}`); }} />}
    <AlertDialog open={Boolean(removing)} onOpenChange={open => { if (!open && !removalSaving.current) setRemoving(null); }}><AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto" onEscapeKeyDown={event => { if (removalSaving.current) event.preventDefault(); }}><AlertDialogTitle>Remove recording access?</AlertDialogTitle><AlertDialogDescription>This removes all Call Recording permissions for {removing?.name || removing?.email}.</AlertDialogDescription>{removalError && <p role="alert" className="break-words text-sm text-red-600 dark:text-red-400">{removalError}</p>}<div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button variant="outline" className="min-h-11" disabled={removalBusy}>Cancel</Button></AlertDialogCancel><Button variant="destructive" className="min-h-11" disabled={removalBusy} onClick={() => void confirmRemove()}>{removalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}{removalBusy ? 'Removing...' : 'Remove access'}</Button></div></AlertDialogContent></AlertDialog>
  </section>;
}
