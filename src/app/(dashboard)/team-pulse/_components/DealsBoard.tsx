"use client";

import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  DollarSign,
  Handshake,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Deal, DealStage, TeamMember } from "@/hooks/useTeamPulse";
import {
  useDeals,
  useCreateDeal,
  useUpdateDeal,
  useMoveDeal,
  useDeleteDeal,
} from "@/hooks/useTeamPulse";

const STAGES: { key: DealStage; label: string; icon: React.ComponentType<any>; color: string; accent: string; bg: string; border: string }[] = [
  { key: "lead",        label: "Lead",        icon: CircleDot,     color: "text-slate-600 dark:text-slate-400",     accent: "bg-slate-400",   bg: "bg-card",                         border: "border-border/50" },
  { key: "contacted",   label: "Contacted",   icon: MessageSquare, color: "text-blue-600 dark:text-blue-400",       accent: "bg-blue-500",    bg: "bg-card",                         border: "border-border/50" },
  { key: "proposal",    label: "Proposal",    icon: Target,        color: "text-violet-600 dark:text-violet-400",   accent: "bg-violet-500",  bg: "bg-card",                         border: "border-border/50" },
  { key: "negotiation", label: "Negotiation", icon: TrendingUp,    color: "text-amber-600 dark:text-amber-400",     accent: "bg-amber-500",   bg: "bg-card",                         border: "border-border/50" },
  { key: "closed_won",  label: "Closed Won",  icon: CheckCircle2,  color: "text-emerald-600 dark:text-emerald-400", accent: "bg-emerald-500", bg: "bg-emerald-50/30 dark:bg-emerald-950/20", border: "border-emerald-200/50 dark:border-emerald-800/30" },
  { key: "closed_lost", label: "Closed Lost", icon: XCircle,       color: "text-rose-600 dark:text-rose-400",       accent: "bg-rose-500",    bg: "bg-rose-50/30 dark:bg-rose-950/20",      border: "border-rose-200/50 dark:border-rose-800/30" },
];

function formatValue(v: number | null | undefined) {
  if (v == null) return null;
  if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${v}`;
}

function DealCard({
  deal,
  members,
  isAdmin,
  myUserId,
  onEdit,
}: {
  deal: Deal;
  members: TeamMember[];
  isAdmin: boolean;
  myUserId?: string;
  onEdit: () => void;
}) {
  const deleteDeal = useDeleteDeal();
  const moveDeal = useMoveDeal();
  const [showMoveMenu, setShowMoveMenu] = React.useState(false);

  const isOwner = deal.createdBy === myUserId;
  const canEdit = isOwner || isAdmin;

  return (
    <div className="bg-card border border-border/40 rounded-xl overflow-hidden hover:border-border/70 transition-all group">
      <div className="flex items-start gap-2 p-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-snug truncate">{deal.title}</p>
          {deal.company && (
            <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{deal.company}</p>
          )}
          {deal.contactName && (
            <p className="text-[10px] text-muted-foreground/40 truncate">{deal.contactName}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit} className="p-1 rounded hover:bg-muted/60 text-muted-foreground/50 hover:text-foreground transition-colors">
              <Pencil className="size-3" />
            </button>
            <button
              onClick={() => deleteDeal.mutateAsync(deal._id).catch(() => toast.error("Failed"))}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-muted-foreground/50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap px-3 pb-3">
        {deal.value != null && (
          <span className="flex items-center gap-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
            <DollarSign className="size-2.5" />
            {formatValue(deal.value)}
          </span>
        )}
        {deal.probability != null && (
          <span className="text-[10px] font-semibold text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded">
            {deal.probability}%
          </span>
        )}
        {deal.assignedName && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="size-5 ml-auto shrink-0">
                <AvatarImage src={deal.assignedAvatar ?? undefined} />
                <AvatarFallback className="text-[8px] font-black">{deal.assignedName[0]}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{deal.assignedName}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {canEdit && (
        <div className="relative border-t border-border/20">
          <button
            onClick={() => setShowMoveMenu((p) => !p)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors w-full px-3 py-2"
          >
            <ChevronDown className="size-3" />
            Move to stage
          </button>
          {showMoveMenu && (
            <div className="absolute top-full left-0 right-0 mt-0.5 z-50 bg-background border border-border/60 rounded-lg shadow-lg py-1 overflow-hidden">
              {STAGES.filter((s) => s.key !== deal.stage).map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      moveDeal.mutate({ id: deal._id, stage: s.key });
                      setShowMoveMenu(false);
                    }}
                    className={cn("flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors text-left", s.color)}
                  >
                    <Icon className="size-3" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DealsBoard({
  members,
  isAdmin,
  myUserId,
}: {
  members: TeamMember[];
  isAdmin: boolean;
  myUserId?: string;
}) {
  const [dealDialog, setDealDialog] = React.useState(false);
  const [editDealId, setEditDealId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "", company: "", contactName: "", value: "", currency: "USD",
    stage: "lead" as DealStage, probability: "", assignedTo: "", note: "",
  });

  const { data: deals = [], isLoading } = useDeals();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();

  const dealsByStage = React.useMemo(() => {
    const map: Record<DealStage, Deal[]> = {
      lead: [], contacted: [], proposal: [], negotiation: [], closed_won: [], closed_lost: [],
    };
    deals.forEach((d) => {
      if (map[d.stage]) map[d.stage].push(d);
    });
    return map;
  }, [deals]);

  const totalPipeline = deals
    .filter((d) => !['closed_lost'].includes(d.stage))
    .reduce((s, d) => s + (d.value || 0), 0);
  const wonDeals = deals.filter((d) => d.stage === 'closed_won');
  const wonValue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);

  function openNew(stage: DealStage = 'lead') {
    setEditDealId(null);
    setForm({ title: "", company: "", contactName: "", value: "", currency: "USD", stage, probability: "", assignedTo: "", note: "" });
    setDealDialog(true);
  }

  function openEdit(deal: Deal) {
    setEditDealId(deal._id);
    setForm({
      title: deal.title,
      company: deal.company || "",
      contactName: deal.contactName || "",
      value: deal.value?.toString() || "",
      currency: deal.currency,
      stage: deal.stage,
      probability: deal.probability?.toString() || "",
      assignedTo: deal.assignedTo || "",
      note: deal.note || "",
    });
    setDealDialog(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    try {
      const payload: any = {
        title: form.title.trim(),
        company: form.company.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        value: form.value ? Number(form.value) : null,
        currency: form.currency,
        stage: form.stage,
        probability: form.probability ? Number(form.probability) : null,
        note: form.note.trim() || undefined,
      };
      if (form.assignedTo) {
        const m = members.find((mb) => mb._id === form.assignedTo);
        payload.assignedTo = form.assignedTo;
        payload.assignedName = m?.name || null;
        payload.assignedAvatar = m?.avatar || null;
      }
      if (editDealId) {
        await updateDeal.mutateAsync({ id: editDealId, ...payload });
        toast.success("Deal updated");
      } else {
        await createDeal.mutateAsync(payload);
        toast.success("Deal created");
      }
      setDealDialog(false);
    } catch {
      toast.error("Failed to save deal");
    }
  }

  return (
    <div className="space-y-5">

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border/30">
          {[
            { label: "Total Deals", value: deals.length },
            { label: "Pipeline Value", value: totalPipeline ? `$${(totalPipeline / 1000).toFixed(1)}k` : "$0" },
            { label: "Closed Won", value: wonDeals.length },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-4 py-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{s.label}</p>
              <p className="text-3xl font-black tabular-nums text-foreground leading-none mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x" style={{ scrollbarWidth: "thin" }}>
          {STAGES.map(({ key, label, icon: Icon, color, accent, bg, border }) => {
            const stageDeals = dealsByStage[key] || [];
            const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
            return (
              <div key={key} className="shrink-0 w-60 sm:w-68 snap-start">
                <div className={cn("rounded-xl border overflow-hidden flex flex-col", bg, border)}>
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
                    <div className={cn("w-1 h-4 rounded-full shrink-0", accent)} />
                    <Icon className={cn("size-3.5 shrink-0", color)} />
                    <span className="text-xs font-black flex-1 truncate">{label}</span>
                    <span className="text-[10px] font-black tabular-nums text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                      {stageDeals.length}
                    </span>
                    {stageValue > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                        {formatValue(stageValue)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 p-2 overflow-y-auto" style={{ maxHeight: 480, scrollbarWidth: "thin" }}>
                    {stageDeals.map((deal) => (
                      <DealCard
                        key={deal._id}
                        deal={deal}
                        members={members}
                        isAdmin={isAdmin}
                        myUserId={myUserId}
                        onEdit={() => openEdit(deal)}
                      />
                    ))}
                    <button
                      onClick={() => openNew(key)}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted/30"
                    >
                      <Plus className="size-3.5" />
                      Add deal
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deal dialog */}
      <Dialog open={dealDialog} onOpenChange={setDealDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="size-4 text-primary" />
              {editDealId ? "Edit Deal" : "New Deal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Deal Title *</label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Deal name…" className="mt-1 h-9 text-sm" maxLength={150} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Company</label>
                <Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="Company name" className="mt-1 h-9 text-sm" maxLength={100} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Contact</label>
                <Input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} placeholder="Contact name" className="mt-1 h-9 text-sm" maxLength={100} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Value ($)</label>
                <Input type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} placeholder="0" className="mt-1 h-9 text-sm" min={0} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Probability (%)</label>
                <Input type="number" value={form.probability} onChange={(e) => setForm((p) => ({ ...p, probability: e.target.value }))} placeholder="50" className="mt-1 h-9 text-sm" min={0} max={100} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Stage</label>
              <Select value={form.stage} onValueChange={(v) => setForm((p) => ({ ...p, stage: v as DealStage }))}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key} className="text-sm">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Assign To</label>
              <Select value={form.assignedTo || "unassigned"} onValueChange={(v) => setForm((p) => ({ ...p, assignedTo: v === "unassigned" ? "" : v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-sm">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m._id} value={m._id} className="text-sm">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Note</label>
              <Textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Deal notes…" className="mt-1 text-sm resize-none h-20" maxLength={1000} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDealDialog(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={handleSave} disabled={!form.title.trim() || createDeal.isPending || updateDeal.isPending}>
                <Handshake className="size-3.5" />
                {editDealId ? "Update" : "Create Deal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
