import * as React from "react"
import { Mail, Phone, Calendar, Clock3, XCircle, PhoneIncoming } from "lucide-react"

export const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; label: string; icon: React.ReactNode }> = {
  'New': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400', label: 'New', icon: <Mail className="h-3 w-3" /> },
  'Pending': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400', label: 'Pending', icon: <Clock3 className="h-3 w-3" /> },
  'Contacted': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/25', dot: 'bg-sky-400', label: 'Contacted', icon: <Phone className="h-3 w-3" /> },
  'Appointment Set': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/25', dot: 'bg-violet-400', label: 'Appt. Set', icon: <Calendar className="h-3 w-3" /> },
  'Closed': { bg: 'bg-muted/60', text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground/50', label: 'Closed', icon: <XCircle className="h-3 w-3" /> },
  'Inbound Calls': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/25', dot: 'bg-teal-400', label: 'Inbound', icon: <PhoneIncoming className="h-3 w-3" /> },
}

export const StatusPill = React.memo(({ status }: { status: string }) => {
  const c = STATUS_CONFIG[status]
  if (!c) return null
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide ${c.bg} ${c.text} ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  )
})

StatusPill.displayName = "StatusPill"
