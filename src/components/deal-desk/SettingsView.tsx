'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Timer, Target, Calculator, Globe, Landmark, Plus, Pencil, Trash2, Copy, Search, X, Save, Check } from 'lucide-react';
import { Button, Card, CardHeader, Field, Input, Select, Switch, PageHeader, Modal, Avatar, Pill, Skeleton, ErrorBanner, Textarea } from './ui';
import { dealDeskApi } from '@/lib/deal-desk/api';
import { useBootstrap, toast } from '@/lib/deal-desk/hooks';
import { apiBase } from '@/lib/deal-desk/http';
import { STAGE_META, cn, toNum } from '@/lib/deal-desk/format';
import type { DealDeskSettings, Lender, Person, DealStage } from '@/lib/deal-desk/types';

const SLA_STAGES: DealStage[] = ['submitted', 'picked_up', 'processing', 'needs_info', 'structured', 'ready_for_fi', 'in_fi'];

export function SettingsView() {
  const { boot } = useBootstrap();
  const isAdmin = !!boot?.roles.isAdmin;
  const [s, setS] = React.useState<DealDeskSettings | null>(null);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    Promise.all([dealDeskApi.getSettings(), dealDeskApi.people()])
      .then(([settings, p]) => {
        setS(settings);
        setPeople(p.people);
      })
      .catch((e) => setError(e.message));
  }, []);

  const patch = (p: Partial<DealDeskSettings>) => {
    setS((x) => (x ? { ...x, ...p } : x));
    setDirty(true);
  };

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await dealDeskApi.saveSettings({
        reviewerIds: s.reviewerIds,
        financeManagerIds: s.financeManagerIds,
        managerIds: s.managerIds,
        acceptWindowSeconds: s.acceptWindowSeconds,
        maxRoundsBeforeEscalation: s.maxRoundsBeforeEscalation,
        maxActiveDealsPerFm: s.maxActiveDealsPerFm,
        slaMinutes: s.slaMinutes,
        defaultTaxRate: s.defaultTaxRate,
        defaultDocFee: s.defaultDocFee,
        maxRateMarkup: s.maxRateMarkup,
        aiEnabled: s.aiEnabled,
        requireDocsToSubmit: s.requireDocsToSubmit,
        widget: { enabled: s.widget.enabled, allowedOrigins: s.widget.allowedOrigins, depositAmount: s.widget.depositAmount, headline: s.widget.headline || '', accentColor: s.widget.accentColor || '#16a34a' },
      });
      setDirty(false);
      toast({ title: 'Deal Desk settings saved', tone: 'success' }, 3000);
    } catch (e: any) {
      toast({ title: 'Couldn’t save', body: e.message, tone: 'error' }, 8000);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="mx-auto max-w-4xl p-6"><ErrorBanner message={error} /></div>;
  if (!s) return <div className="mx-auto max-w-5xl space-y-4 p-6"><Skeleton className="h-20" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-32 sm:px-6">
      <PageHeader
        back={<Link href="/crm/deal-desk" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Deal Queue</Link>}
        kicker="Deal Desk // Settings"
        title="Deal Desk settings"
        subtitle={isAdmin ? 'Who works the queue, how the F&I rotation behaves, stage targets, the website widget and your lender matrix.' : 'View only — an admin can change these.'}
      />

      <fieldset disabled={!isAdmin} className="space-y-4">
        <Card>
          <CardHeader icon={<Users className="size-4" />} kicker="Team" title="Who works the Deal Desk" />
          <div className="grid gap-5 p-4 sm:p-5">
            <PeoplePicker label="Online sales team (reviewers)" hint="Pick up deals, run the Deal Builder, request info and approve for F&I." people={people} value={s.reviewerIds} onChange={(v) => patch({ reviewerIds: v })} />
            <PeoplePicker label="Finance Managers" hint="Get the 5-minute offers in rotation." people={people} value={s.financeManagerIds} onChange={(v) => patch({ financeManagerIds: v })} />
            <PeoplePicker label="Managers" hint="See everything, get escalations and can approve with override. CRM managers and admins already count." people={people} value={s.managerIds} onChange={(v) => patch({ managerIds: v })} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Timer className="size-4" />} kicker="F&I rotation" title="Finance Manager assignment" />
          <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
            <Field label="Time to accept" hint="Then the deal moves to the next FM">
              <Select value={s.acceptWindowSeconds} onChange={(e) => patch({ acceptWindowSeconds: Number(e.target.value) })}>
                {[120, 180, 300, 420, 600, 900].map((v) => (
                  <option key={v} value={v}>{v / 60} minutes</option>
                ))}
              </Select>
            </Field>
            <Field label="Max active deals per FM">
              <Input type="number" min={1} max={20} value={s.maxActiveDealsPerFm} onChange={(e) => patch({ maxActiveDealsPerFm: Number(e.target.value) || 1 })} />
            </Field>
            <Field label="Escalate after" hint="Full rotations with no taker">
              <Select value={s.maxRoundsBeforeEscalation} onChange={(e) => patch({ maxRoundsBeforeEscalation: Number(e.target.value) })}>
                {[1, 2, 3].map((v) => (
                  <option key={v} value={v}>{v} round{v > 1 ? 's' : ''}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Target className="size-4" />} kicker="Deal Queue" title="Target time per stage" />
          <div className="p-4 sm:p-5">
            <p className="mb-4 text-sm text-muted-foreground">Timers stay green until the target, turn amber up to 2×, then red — and managers get an alert when a deal goes red.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SLA_STAGES.map((st) => (
                <Field key={st} label={STAGE_META[st].label}>
                  <Input type="number" min={1} value={s.slaMinutes[st] ?? ''} onChange={(e) => patch({ slaMinutes: { ...s.slaMinutes, [st]: Number(e.target.value) || 1 } })} suffix="min" />
                </Field>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Calculator className="size-4" />} kicker="Deal Builder" title="Defaults and AI" />
          <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
            <Field label="Default sales tax"><Input inputMode="decimal" value={s.defaultTaxRate} onChange={(e) => patch({ defaultTaxRate: toNum(e.target.value) ?? 0 })} suffix="%" /></Field>
            <Field label="Default doc fee"><Input prefix="$" inputMode="decimal" value={s.defaultDocFee} onChange={(e) => patch({ defaultDocFee: toNum(e.target.value) ?? 0 })} /></Field>
            <Field label="Max rate markup" hint="Shown as the top of each lender’s rate range"><Input inputMode="decimal" value={s.maxRateMarkup} onChange={(e) => patch({ maxRateMarkup: toNum(e.target.value) ?? 0 })} suffix="%" /></Field>
            <div className="space-y-4 sm:col-span-3">
              <Switch checked={s.aiEnabled} onChange={(v) => patch({ aiEnabled: v })} label="AI document reading" description={boot?.capabilities.aiProvider === 'none' ? 'No AI provider key is configured on the server yet — the rules engine and template summary still work.' : `Provider: ${boot?.capabilities.aiProvider}. Reads Four Squares, credit apps and IDs to fill empty fields.`} />
              <Switch checked={s.requireDocsToSubmit} onChange={(v) => patch({ requireDocsToSubmit: v })} label="Require documents to submit" description="Four Square, credit application and driver’s license must be uploaded before a deal can be submitted." />
            </div>
          </div>
        </Card>

        <WidgetCard s={s} patch={patch} />
      </fieldset>

      <LenderMatrix editable={isAdmin} />

      {isAdmin && dirty && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 flex justify-center px-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/95 py-2 pl-4 pr-2 shadow-2xl backdrop-blur">
            <span className="text-sm">You have unsaved changes</span>
            <Button loading={saving} onClick={save} icon={<Save className="size-4" />}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeoplePicker({ label, hint, people, value, onChange }: { label: string; hint?: string; people: Person[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const selected = value.map((id) => people.find((p) => p.id === id) || { id, name: 'Unknown user' });
  const matches = people.filter((p) => !value.includes(p.id) && `${p.name} ${p.email} ${p.department || ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      {hint && <div className="mb-2 text-xs text-muted-foreground">{hint}</div>}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-input bg-background/60 p-2">
        {selected.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 py-0.5 pl-0.5 pr-1.5 text-xs font-medium">
            <Avatar name={p.name} size="xs" />
            {p.name}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== p.id))} className="rounded-full p-0.5 hover:bg-primary/20" aria-label={`Remove ${p.name}`}><X className="size-3" /></button>
          </span>
        ))}
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Add a person…" className="h-8 w-full bg-transparent pl-7 text-sm outline-none placeholder:text-muted-foreground/70" />
          {open && matches.length > 0 && (
            <ul className="absolute left-0 top-full z-30 mt-1 w-full min-w-[16rem] overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
              {matches.map((p) => (
                <li key={p.id}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange([...value, p.id]); setQ(''); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
                    <Avatar name={p.name} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{p.name}<span className="ml-1 text-xs text-muted-foreground">{p.department || p.role}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function WidgetCard({ s, patch }: { s: DealDeskSettings; patch: (p: Partial<DealDeskSettings>) => void }) {
  const [copied, setCopied] = React.useState(false);
  const [origins, setOrigins] = React.useState((s.widget.allowedOrigins || []).join('\n'));
  const snippet = `<script src="https://suprah-app.com/deal-desk-widget.js"\n  data-dealer="${s.orgKey || 'your-dealer-key'}"\n  data-api="${apiBase() || 'https://api.suprah-app.com'}"\n  data-vin="{{VIN}}" data-price="{{PRICE}}"\n  data-year="{{YEAR}}" data-make="{{MAKE}}" data-model="{{MODEL}}"\n  async></script>`;
  return (
    <Card>
      <CardHeader icon={<Globe className="size-4" />} kicker="Website" title="Online purchase widget" actions={s.widget.enabled ? <Pill className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Live</Pill> : <Pill className="border-border text-muted-foreground">Off</Pill>} />
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div className="sm:col-span-2"><Switch checked={s.widget.enabled} onChange={(v) => patch({ widget: { ...s.widget, enabled: v } })} label="Let customers start a purchase on the website" description="Web deals land in this same queue, tagged “Website”." /></div>
        <Field label="Headline"><Input value={s.widget.headline || ''} onChange={(e) => patch({ widget: { ...s.widget, headline: e.target.value } })} placeholder={`Buy online with ${s.dealerName}`} /></Field>
        <Field label="Deposit to hold a vehicle"><Input prefix="$" inputMode="decimal" value={s.widget.depositAmount} onChange={(e) => patch({ widget: { ...s.widget, depositAmount: toNum(e.target.value) ?? 0 } })} /></Field>
        <Field label="Button color"><div className="flex gap-2"><input type="color" value={s.widget.accentColor || '#16a34a'} onChange={(e) => patch({ widget: { ...s.widget, accentColor: e.target.value } })} className="h-10 w-12 cursor-pointer rounded-lg border border-input bg-transparent" /><Input value={s.widget.accentColor || '#16a34a'} onChange={(e) => patch({ widget: { ...s.widget, accentColor: e.target.value } })} className="font-mono" /></div></Field>
        <Field label="Allowed websites" hint="One per line, e.g. https://actionautoutah.com. Leave empty to allow any site.">
          <Textarea rows={3} value={origins} onChange={(e) => { setOrigins(e.target.value); patch({ widget: { ...s.widget, allowedOrigins: e.target.value.split(/\s+/).map((x) => x.trim().replace(/\/+$/, '')).filter(Boolean) } }); }} className="font-mono text-xs" />
        </Field>
        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/80">Embed code — paste on each vehicle page</span>
            <Button type="button" size="sm" variant="outline" icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} onClick={() => { navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : 'Copy'}</Button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3 font-mono text-[11.5px] leading-relaxed">{snippet}</pre>
          <p className="mt-1.5 text-xs text-muted-foreground">Replace the <code>{'{{…}}'}</code> values with your website’s vehicle fields. Add <code>data-button=&quot;false&quot;</code> and call <code>SuprahDealDesk.open()</code> to use your own button.</p>
        </div>
      </div>
    </Card>
  );
}

const EMPTY_LENDER: Partial<Lender> = { name: '', type: 'bank', active: true, rateTiers: [{ minScore: 720, rate: 6.49 }, { minScore: 660, rate: 8.99 }, { minScore: 600, rate: 13.49 }] };

function LenderMatrix({ editable }: { editable: boolean }) {
  const [lenders, setLenders] = React.useState<Lender[] | null>(null);
  const [edit, setEdit] = React.useState<Partial<Lender> | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => dealDeskApi.lenders().then((r) => setLenders(r.lenders)).catch(() => setLenders([])), []);
  React.useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const body = { ...edit, rateTiers: (edit.rateTiers || []).filter((t) => t.minScore != null && t.rate != null) };
      if (edit.id) await dealDeskApi.updateLender(edit.id, body);
      else await dealDeskApi.createLender(body);
      setEdit(null);
      load();
      toast({ title: 'Lender saved', tone: 'success' }, 2500);
    } catch (e: any) {
      toast({ title: 'Couldn’t save lender', body: e.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const num = (k: keyof Lender) => ({ value: (edit?.[k] as number | undefined) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEdit((x) => ({ ...x, [k]: toNum(e.target.value) })) });

  return (
    <Card className="mt-4 overflow-hidden">
      <CardHeader icon={<Landmark className="size-4" />} kicker="Lender matrix" title="Banks and credit unions" actions={editable && <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setEdit({ ...EMPTY_LENDER })}>Add lender</Button>} />
      {!lenders ? (
        <div className="p-5"><Skeleton className="h-24" /></div>
      ) : !lenders.length ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">No lenders yet. Add the lenders you work with and their guidelines — the Deal Builder ranks them on every deal.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Lender</th>
                <th className="px-3 py-2 text-right font-medium">Min score</th>
                <th className="px-3 py-2 text-right font-medium">Max LTV</th>
                <th className="px-3 py-2 text-right font-medium">Max DTI</th>
                <th className="px-3 py-2 text-right font-medium">Max term</th>
                <th className="px-3 py-2 font-medium">Rates</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {lenders.map((l) => (
                <tr key={l.id} className={cn('border-b border-border/50 last:border-0', !l.active && 'opacity-50')}>
                  <td className="px-5 py-3"><div className="font-medium">{l.name}</div><div className="text-[11px] capitalize text-muted-foreground">{l.type.replace('_', ' ')}{!l.active && ' · inactive'}</div></td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.minScore ?? '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.maxLtv != null ? `${l.maxLtv}%` : '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.maxDti != null ? `${l.maxDti}%` : '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.maxTerm ?? '—'}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{l.rateTiers.length ? l.rateTiers.map((t) => `${t.minScore}+: ${t.rate}%`).join(' · ') : 'default tiers'}</td>
                  <td className="px-5 py-3">
                    {editable && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEdit({ ...l })} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit"><Pencil className="size-4" /></button>
                        <button onClick={async () => { if (confirm(`Remove ${l.name}?`)) { await dealDeskApi.deleteLender(l.id).catch((e) => toast({ title: e.message, tone: 'error' })); load(); } }} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600" aria-label="Delete"><Trash2 className="size-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} size="lg" title={edit?.id ? `Edit ${edit.name}` : 'Add lender'} footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button loading={saving} disabled={!edit?.name || edit.name.length < 2} onClick={save}>Save lender</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required><Input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Lender['type'] })}>
                <option value="bank">Bank</option>
                <option value="credit_union">Credit union</option>
                <option value="captive">Captive</option>
                <option value="subprime">Subprime</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
              <Field label="Min score"><Input inputMode="numeric" {...num('minScore')} /></Field>
              <Field label="Max LTV"><Input inputMode="decimal" {...num('maxLtv')} suffix="%" /></Field>
              <Field label="Max DTI"><Input inputMode="decimal" {...num('maxDti')} suffix="%" /></Field>
              <Field label="Max PTI"><Input inputMode="decimal" {...num('maxPti')} suffix="%" /></Field>
              <Field label="Max term"><Input inputMode="numeric" {...num('maxTerm')} suffix="mo" /></Field>
              <Field label="Max amount"><Input prefix="$" inputMode="decimal" {...num('maxAmount')} /></Field>
              <Field label="Max mileage"><Input inputMode="numeric" {...num('maxMileage')} /></Field>
              <Field label="Max vehicle age"><Input inputMode="numeric" {...num('maxVehicleAge')} suffix="yrs" /></Field>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/80">Buy rate by credit score</span>
                <Button type="button" size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setEdit({ ...edit, rateTiers: [...(edit.rateTiers || []), { minScore: 0, rate: 0 }] })}>Add tier</Button>
              </div>
              <div className="space-y-2">
                {(edit.rateTiers || []).map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <Input inputMode="numeric" value={t.minScore} onChange={(e) => { const tiers = [...(edit.rateTiers || [])]; tiers[i] = { ...t, minScore: toNum(e.target.value) ?? 0 }; setEdit({ ...edit, rateTiers: tiers }); }} prefix="≥" />
                    <Input inputMode="decimal" value={t.rate} onChange={(e) => { const tiers = [...(edit.rateTiers || [])]; tiers[i] = { ...t, rate: toNum(e.target.value) ?? 0 }; setEdit({ ...edit, rateTiers: tiers }); }} suffix="% APR" />
                    <button type="button" onClick={() => setEdit({ ...edit, rateTiers: (edit.rateTiers || []).filter((_, j) => j !== i) })} className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Remove tier"><X className="size-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2"><Switch checked={edit.active !== false} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" description="Inactive lenders are ignored by the Deal Builder." /></div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
