"use client"

import * as React from "react"
import {
  User,
  Mail,
  Phone,
  FileText,
  Clock,
  DollarSign,
  History,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Plus,
  Save,
  X,
} from "lucide-react"
import { CustomerRecord, InboundCall, OutboundCall } from "./types"

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, "0")}s`
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

interface CustomerInfoPanelProps {
  call: (InboundCall | OutboundCall) | null
  callerNumber?: string
  customer: CustomerRecord | null
  isLoadingCustomer: boolean
  onSaveNotes?: (notes: string) => void
  onCreateLead?: (data: { name: string; phone: string; email?: string }) => void
}

export function CustomerInfoPanel({
  call,
  callerNumber,
  customer,
  isLoadingCustomer,
  onSaveNotes,
  onCreateLead,
}: CustomerInfoPanelProps) {
  const [notes, setNotes] = React.useState("")
  const [showLead, setShowLead] = React.useState(false)
  const [leadForm, setLeadForm] = React.useState({ name: "", phone: "", email: "" })

  React.useEffect(() => { setNotes(customer?.internalNotes || "") }, [customer])
  React.useEffect(() => {
    const num = callerNumber || ""
    if (num) setLeadForm((p) => ({ ...p, phone: num }))
  }, [callerNumber])

  const statusConfig = {
    active: { label: "Active Account", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-400/10", border: "border-emerald-200 dark:border-emerald-400/20", dot: "bg-emerald-500" },
    inactive: { label: "Inactive", color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800", border: "border-zinc-200 dark:border-zinc-700", dot: "bg-zinc-400" },
    new: { label: "Prospect/New", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-400/10", border: "border-sky-200 dark:border-sky-400/20", dot: "bg-sky-500" },
  }

  // Base card styling structure
  const PanelWrapper = ({ children, headerRight }: { children: React.ReactNode, headerRight?: React.ReactNode }) => (
    <div className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden h-full shadow-sm transition-colors duration-200">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-zinc-500">CRM File</span>
        {headerRight}
      </div>
      {children}
    </div>
  )

  if (!call) {
    return (
      <PanelWrapper>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-12 w-12 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-50/30 dark:bg-zinc-900/10">
            <User className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Line idle · Waiting for sync</p>
        </div>
      </PanelWrapper>
    )
  }

  if (isLoadingCustomer) {
    return (
      <PanelWrapper>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="h-5 w-5 border-2 border-violet-600 dark:border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Fetching secure records...</p>
        </div>
      </PanelWrapper>
    )
  }

  if (!customer) {
    return (
      <PanelWrapper>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Unregistered Identity</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                No active contact matrix matched for <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{callerNumber}</span>.
              </p>
            </div>
          </div>

          {!showLead ? (
            <button
              onClick={() => setShowLead(true)}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs font-semibold bg-zinc-50/50 dark:bg-transparent transition-all cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" /> Create Contact Card
            </button>
          ) : (
            <div className="space-y-3.5 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">New Account Entry</p>
                <button onClick={() => setShowLead(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {[
                { key: "name", label: "Full Name *", placeholder: "e.g., Jane Doe", type: "text" },
                { key: "phone", label: "Phone Identifier", placeholder: "", type: "tel" },
                { key: "email", label: "Email Address", placeholder: "optional@domain.com", type: "email" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold block mb-1">{label}</label>
                  <input
                    type={type}
                    value={(leadForm as any)[key]}
                    onChange={(e) => setLeadForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder || undefined}
                    className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 text-xs font-medium placeholder:text-zinc-300 dark:placeholder:text-zinc-600 outline-none focus:border-violet-500 dark:focus:border-violet-500/50 transition-colors shadow-sm"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1.5">
                <button
                  onClick={() => setShowLead(false)}
                  className="flex-1 h-8 rounded-lg bg-white hover:bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!leadForm.name.trim()}
                  onClick={() => {
                    onCreateLead?.({ name: leadForm.name, phone: leadForm.phone, email: leadForm.email || undefined })
                    setShowLead(false)
                    setLeadForm({ name: "", phone: "", email: "" })
                  }}
                  className="flex-1 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-300 dark:disabled:text-zinc-600 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Save Card
                </button>
              </div>
            </div>
          )}
        </div>
      </PanelWrapper>
    )
  }

  const sc = statusConfig[customer.accountStatus] || statusConfig.active

  return (
    <PanelWrapper headerRight={
      <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.border} ${sc.color}`}>
        <span className={`h-1 w-1 rounded-full ${sc.dot}`} /> {sc.label}
      </span>
    }>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Identity Section */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 dark:from-violet-600 dark:to-indigo-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {getInitials(customer.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{customer.name}</p>
            {customer.email && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5 flex items-center gap-1">
                <Mail className="h-3 w-3 text-zinc-300 dark:text-zinc-600" /> {customer.email}
              </p>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/50">
            <p className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Direct Line</p>
            <p className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 mt-1 truncate">{customer.phone}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/50">
            <p className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Account Matrix ID</p>
            <p className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 mt-1 truncate">#{customer.id.slice(-6)}</p>
          </div>
        </div>

        {/* Financial Transactions Module */}
        {customer.recentTransactions && customer.recentTransactions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Recent Invoices</p>
            </div>
            <div className="space-y-1">
              {customer.recentTransactions.slice(0, 3).map((tx, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/30">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{tx.description}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{tx.date}</p>
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 shrink-0 ml-2 tabular-nums">{tx.amount}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Log History Module */}
        {customer.previousCalls && customer.previousCalls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-zinc-400" />
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Touchpoint Log</p>
            </div>
            <div className="space-y-1">
              {customer.previousCalls.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/30">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{c.date}</p>
                    {c.notes && <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{c.notes}</p>}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0 ml-2 tabular-nums">{formatDuration(c.duration)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dispatcher Workspace Notes Area */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-zinc-400" />
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Call Wrap-up Notes</p>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type comprehensive interaction records here..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 outline-none focus:border-violet-500 dark:focus:border-violet-500/50 shadow-sm resize-none transition-colors"
          />
          <button
            onClick={() => onSaveNotes?.(notes)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-[11px] font-semibold transition-all cursor-pointer"
          >
            <Save className="h-3 w-3 text-zinc-400" /> Update CRM File
          </button>
        </div>
      </div>
    </PanelWrapper>
  )
}