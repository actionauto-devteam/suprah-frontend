import * as React from "react"
import { Car, Mail, MessageSquare } from "lucide-react"

interface AdfContentProps {
  parsed: any // ParsedAdfLead
}

export const AdfContent = React.memo(({ parsed }: AdfContentProps) => {
  const v = parsed.vehicle
  const c = parsed.customer
  const comments = parsed.comments
  
  const vehicleLabel = [v?.year, v?.make, v?.model, v?.trim].filter(Boolean).join(' ')
  const hasVehicle = !!(v?.year || v?.make || v?.model)

  const KVRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
    value ? (
      <div className="flex items-baseline gap-4 py-2 border-b border-border/40 last:border-0">
        <span className="text-muted-foreground text-[12px] font-medium shrink-0 w-28 text-right uppercase tracking-wide">{label}</span>
        <span className={`text-foreground text-[14px] font-semibold ${mono ? 'font-mono' : ''}`}>{value}</span>
      </div>
    ) : null
  )

  return (
    <div className="space-y-5">
      {(parsed.source || v?.interest || v?.status) && (
        <div className="flex items-center gap-2 flex-wrap">
          {parsed.source && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
              {parsed.source}
            </span>
          )}
          {v?.interest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-sky-500/10 border-sky-500/20 text-[10px] font-bold text-sky-400 uppercase tracking-wide">
              Interest: {v.interest}
            </span>
          )}
          {v?.status && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase tracking-wide">
              {v.status}
            </span>
          )}
          {parsed.requestDate && (
            <span className="text-[11px] text-muted-foreground/60 ml-auto">
              {(() => { try { return new Date(parsed.requestDate).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return parsed.requestDate } })()}
            </span>
          )}
        </div>
      )}

      {hasVehicle && (
        <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-emerald-500/10">
            <Car className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500">Vehicle of Interest</span>
          </div>
          <div className="px-4 py-1">
            {vehicleLabel && (
              <div className="py-3 border-b border-border/40">
                <p className="text-[17px] font-bold text-foreground">{vehicleLabel}</p>
                {v?.style && <p className="text-[12px] text-muted-foreground/80 mt-0.5">{v.style}</p>}
              </div>
            )}
            <KVRow label="VIN" value={v?.vin || ''} mono />
            <KVRow label="Stock #" value={v?.stock || ''} mono />
            <KVRow label="Odometer" value={v?.odometer ? `${Number(v.odometer).toLocaleString()} mi` : ''} />
          </div>
        </div>
      )}

      {(c?.name || c?.email || c?.phone) && (
        <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-sky-500/10">
            <Mail className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-400">Customer</span>
          </div>
          <div className="px-4 py-1">
            <KVRow label="Name" value={c?.name || ''} />
            <KVRow label="Email" value={c?.email || ''} />
            <KVRow label="Phone" value={c?.phone || ''} />
          </div>
        </div>
      )}

      {comments && (
        <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Customer Comments</span>
          </div>
          <div className="px-5 py-4">
            <p className="text-[15px] text-foreground leading-[1.75]">{comments}</p>
          </div>
        </div>
      )}
    </div>
  )
})

AdfContent.displayName = "AdfContent"
