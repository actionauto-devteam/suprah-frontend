import * as React from "react"
import { Mail, MessageSquare, FileText, Phone, Globe } from "lucide-react"

export const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  email: { label: 'Email', icon: <Mail className="h-2.5 w-2.5" />, cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  sms: { label: 'SMS', icon: <MessageSquare className="h-2.5 w-2.5" />, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  adf: { label: 'ADF', icon: <FileText className="h-2.5 w-2.5" />, cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  phone: { label: 'Phone', icon: <Phone className="h-2.5 w-2.5" />, cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  web: { label: 'Web', icon: <Globe className="h-2.5 w-2.5" />, cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
}

export const ChannelBadge = React.memo(({ channel }: { channel?: string }) => {
  const c = CHANNEL_CONFIG[channel || 'email'] || CHANNEL_CONFIG.email
  
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  )
})

ChannelBadge.displayName = "ChannelBadge"
