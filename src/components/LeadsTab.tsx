"use client"

import * as React from "react"
import { RefreshCw, Mail, MessageSquare, Sun, Moon } from "lucide-react"
import { useLeads, Lead } from "@/hooks/useLeads"
import { initializeSocket } from "@/lib/socket.client"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { ShippingQuoteModal } from "@/components/shipping-quote-modal"
import { Vehicle } from "@/types/inventory"
import { useTheme } from "@/context/ThemeContext"
import { injectSS4Styles } from "@/lib/ss4-styles"
import { cn } from "@/lib/utils"

injectSS4Styles()

// Atomic & Modular Components
import { SyncStatus } from "./leads/atomic/SyncStatus"
import { ToastStack, Toast } from "./leads/atomic/ToastStack"
import { LeadsList } from "./leads/LeadsList"
import { ConversationView } from "./leads/ConversationView"
import { ReplySection } from "./leads/ReplySection"
import { CreateAppointmentModal } from "@/components/CreateAppointmentModal"

// External Components
import { InboundCallsTab } from "@/components/inbound-calls/InboundCallsTab"
import { SupraLeoAI } from "@/components/supra-leo-ai/SupraLeoAI"

// Constants
const LEADS_SOURCE_EMAIL = 'leads@dealerscloud.com'
const LEADS_PER_PAGE = 20
const THREAD_POLL_INTERVAL_MS = 15_000
const DRAFT_STORAGE_KEY = 'crm-appointment-draft'

const TABS = [
  { key: null, label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Contacted', label: 'Contacted' },
  { key: 'Appointment Set', label: 'Appt. Set' },
  { key: 'Closed', label: 'Closed' },
  { key: 'Inbound Calls', label: 'Inbound Calls' },
] as const

export interface LeadsTabPendingNav {
  leadId?: string
  leadSearch?: string
}

export function LeadsTab({
  pendingNav,
  onNavConsumed,
}: {
  pendingNav?: LeadsTabPendingNav | null
  onNavConsumed?: () => void
} = {}) {
  const { getToken } = useAuth()
  const { theme, toggleTheme } = useTheme()

  // -- Filters & Pagination --
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)

  // -- Main Data Hook --
  const {
    leads, isLoading, total, pages, updateLeadStatus, markAsRead, refetch,
    sync, isSyncing: isWorkerSyncing
  } = useLeads({
    page: currentPage,
    limit: LEADS_PER_PAGE,
    search: searchQuery,
    status: statusFilter
  })

  // -- Pending deep-link lead (from ?leadId= or ?leadSearch= URL param) --
  const [pendingLeadId, setPendingLeadId] = React.useState<string | null>(null)
  const [autoSelectOnSingleResult, setAutoSelectOnSingleResult] = React.useState(false)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const leadId = params.get('leadId')
    const leadSearch = params.get('leadSearch')

    if (leadId || leadSearch) {
      const url = new URL(window.location.href)
      url.searchParams.delete('leadId')
      url.searchParams.delete('leadSearch')
      url.searchParams.delete('tab')
      const newSearch = url.searchParams.toString()
      window.history.replaceState({}, '', url.pathname + (newSearch ? `?${newSearch}` : ''))
    }

    if (leadId) {
      setPendingLeadId(leadId)
    } else if (leadSearch) {
      setSearchQuery(decodeURIComponent(leadSearch))
      setAutoSelectOnSingleResult(true)
    }
  }, [])

  // -- React to pendingNav prop (same-page navigation from CustomerCredentials) --
  React.useEffect(() => {
    if (!pendingNav) return
    onNavConsumed?.()
    if (pendingNav.leadId) {
      setPendingLeadId(pendingNav.leadId)
    } else if (pendingNav.leadSearch) {
      setSearchQuery(pendingNav.leadSearch)
      setAutoSelectOnSingleResult(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNav])

  // -- Local UI State --
  const [selectedLead, _setSelectedLead] = React.useState<Lead | null>(null)
  const [localIsSyncing, setLocalIsSyncing] = React.useState(false)
  const [centralConnected, setCentralConnected] = React.useState(false)
  const [centralStatusLoaded, setCentralStatusLoaded] = React.useState(false)
  const [centralEmail, setCentralEmail] = React.useState('')
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null)

  const [replyMessage, setReplyMessage] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const [apptOpen, setApptOpen] = React.useState(false)
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const [isClosed, setIsClosed] = React.useState(false)
  const [threads, setThreads] = React.useState<Record<string, any[]>>({})
  const [highlightedLeadIds, setHighlightedLeadIds] = React.useState<Set<string>>(new Set())
  const [shippingOpen, setShippingOpen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!stored) return

    try {
      const draft = JSON.parse(stored) as any
      const leadId = draft?.meta?.extraPayload?.leadId
      if (draft?.resume && leadId) {
        setApptOpen(true)
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, resume: false }))
      }
    } catch {
      // ignore invalid draft
    }
  }, [])

  // 1. Reliability Sync: Keep selectedLead in sync with master leads list
  React.useEffect(() => {
    if (!selectedLead) return
    const updated = leads.find(l => l._id === selectedLead._id)
    if (updated && JSON.stringify(updated) !== JSON.stringify(selectedLead)) {
      _setSelectedLead(updated)
      if (updated.status === 'Closed') setIsClosed(true)
      else if ((updated.status as string) !== 'Closed') setIsClosed(false)
    }
  }, [leads, selectedLead])

  // 1b-ii. Auto-select if email search produces exactly one result
  React.useEffect(() => {
    if (!autoSelectOnSingleResult || isLoading || leads.length !== 1) return
    setAutoSelectOnSingleResult(false)
    setSelectedLead(leads[0]) // eslint-disable-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, isLoading, autoSelectOnSingleResult])

  // 1b. Deep-link: fetch lead by ID directly, bypassing pagination
  React.useEffect(() => {
    if (!pendingLeadId) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiClient.get(`/api/leads/${pendingLeadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const lead: Lead = res.data?.data
        if (!cancelled && lead?._id) {
          setPendingLeadId(null)
          setSelectedLead(lead) // eslint-disable-line react-hooks/exhaustive-deps
        }
      } catch {
        setPendingLeadId(null)
      }
    })()
    return () => { cancelled = true }
  // setSelectedLead intentionally omitted — render-scope fn, not a stable ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLeadId, getToken])

  // 2. Real-Time WebSocket Implementation
  React.useEffect(() => {
    let socket: any = null
    const setupSocket = async () => {
      const token = await getToken()
      if (!token) return
      socket = initializeSocket(token)

      socket.on('lead:new', (newLead: any) => {
        if (currentPage === 1) {
          refetch()
          setHighlightedLeadIds(prev => new Set(prev).add(newLead._id))
          setTimeout(() => {
            setHighlightedLeadIds(prev => {
              const next = new Set(prev); next.delete(newLead._id); return next
            })
          }, 10000)
          addToast('success', 'New lead received!')
        }
      })
      socket.on('lead:update', () => refetch())
      socket.on('lead:delete', () => { refetch(); setSelectedLead(null) })
    }
    setupSocket()
    return () => {
      if (socket) {
        socket.off('lead:new')
        socket.off('lead:update')
        socket.off('lead:delete')
      }
    }
  }, [getToken, currentPage, refetch])

  // 3. Central Status Fetch
  React.useEffect(() => {
    (async () => {
      try {
        const token = await getToken()
        const res = await apiClient.get('/api/org-lead/config', { headers: { Authorization: `Bearer ${token}` } })
        const d = res.data?.data
        setCentralConnected(d?.gmailConnected || false)
        setCentralEmail(d?.gmailAddress || '')
      } catch {
        setCentralConnected(false)
      } finally {
        setCentralStatusLoaded(true)
      }
    })()
  }, [getToken])

  // 4. Sync & Refresh Logic (Refined)
  const syncAndRefresh = React.useCallback(async () => {
    if (isWorkerSyncing || localIsSyncing) return
    setLocalIsSyncing(true)
    try {
      const token = await getToken(); if (!token) return
      await refetch()
      if (!centralStatusLoaded || !centralConnected) return

      const r = await sync()
      const n = r?.data?.leads?.synced ?? 0
      if (n > 0) addToast('success', `${n} new lead${n > 1 ? 's' : ''} added`)
      setLastSyncTime(new Date())
    } catch {
      try { await refetch() } catch { }
    } finally {
      setLocalIsSyncing(false)
    }
  }, [getToken, centralConnected, centralStatusLoaded, refetch, sync, isWorkerSyncing, localIsSyncing])

  React.useEffect(() => {
    if (centralStatusLoaded) syncAndRefresh()
  }, [centralStatusLoaded])

  // 5. Safety Sync (Background only, no 1s timer)
  React.useEffect(() => {
    if (!centralStatusLoaded) return
    const SAFETY_SYNC_MS = 20 * 60 * 1000
    const sI = setInterval(() => syncAndRefresh(), SAFETY_SYNC_MS)
    return () => clearInterval(sI)
  }, [syncAndRefresh, centralStatusLoaded])

  // 6. Thread Refresh
  const fetchThread = React.useCallback(async (lead: Lead) => {
    const threadId = (lead as any).threadId
    if (!threadId) { setThreads(p => ({ ...p, [lead._id]: [] })); return }
    try {
      const token = await getToken(); if (!token) return
      const res = await apiClient.get(`/api/leads/${lead._id}/thread`, { headers: { Authorization: `Bearer ${token}` } })
      setThreads(p => ({ ...p, [lead._id]: res.data?.data?.messages || [] }))
    } catch { setThreads(p => ({ ...p, [lead._id]: [] })) }
  }, [getToken])

  React.useEffect(() => {
    if (!selectedLead) return
    fetchThread(selectedLead)
    const tid = setInterval(() => fetchThread(selectedLead), THREAD_POLL_INTERVAL_MS)
    return () => clearInterval(tid)
  }, [selectedLead, fetchThread])

  // Hide the floating mobile bottom nav while a lead conversation is open,
  // matching the SupraSpace convention, so it doesn't sit over the reply composer.
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('crm-leads:convo-state', { detail: { active: !!selectedLead } }))
  }, [selectedLead])
  React.useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('crm-leads:convo-state', { detail: { active: false } }))
    }
  }, [])

  // Helpers
  const addToast = (type: Toast['type'], msg: string) => {
    if (toasts.some(t => t.message === msg)) return
    const id = Math.random().toString(36)
    setToasts(p => [...p, { id, type, message: msg, ts: new Date() }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000)
  }

  const handleStatus = async (status: string, targetLead?: Lead) => {
    const leadToUpdate = targetLead || selectedLead
    if (!leadToUpdate) return
    await updateLeadStatus({ id: leadToUpdate._id, status })
    _setSelectedLead(p => (p && p._id === leadToUpdate._id) ? { ...p, status: status as any } : p)
    if (leadToUpdate._id === selectedLead?._id) {
      if (status === 'Closed') setIsClosed(true)
      else setIsClosed(false)
    }
    addToast('success', `Marked as ${status}`)
  }

  const setSelectedLead = async (lead: any) => {
    _setSelectedLead(lead)
    if (lead) {
      setIsClosed(lead.status === 'Closed')
      fetchThread(lead)

      if (!lead.isRead) {
        await markAsRead(lead._id)
      }

      // Only transition to Pending if it's currently New
      if (lead.status === 'New') {
        await handleStatus('Pending', lead)
      }
    }
  }

  const handleSend = async () => {
    if (!selectedLead || !replyMessage.trim()) return
    setIsSending(true)
    try {
      const token = await getToken(); if (!token) { addToast('error', 'Auth required'); return }
      await apiClient.post(`/api/leads/${selectedLead._id}/reply`, { message: replyMessage }, { headers: { Authorization: `Bearer ${token}` } })
      setReplyMessage('')
      addToast('success', 'Reply sent')
      await updateLeadStatus({ id: selectedLead._id, status: 'Contacted' })
      setTimeout(() => fetchThread(selectedLead), 1000)
      await refetch()
    } catch { addToast('error', 'Failed to send') }
    finally { setIsSending(false) }
  }

  const handleAppt = async (appointmentData: Record<string, unknown>) => {
    const hasLeadId = Boolean((appointmentData as any)?.leadId)
    if (!selectedLead && !hasLeadId) {
      throw new Error('Please select a lead first.')
    }
    try {
      const token = await getToken()
      if (!token) throw new Error('Authentication required.')

      await apiClient.post(
        '/api/crm/calendar/appointments',
        appointmentData,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      addToast('success', 'Appointment scheduled')
      await refetch()
    } catch (err: any) {
      const status = err?.response?.status
      const backendMessage = err?.response?.data?.message || err?.response?.data?.data?.message
      let message = backendMessage || 'Failed to save appointment'

      if (status === 401) {
        message = 'Google Calendar not connected. Please go to Settings.'
      } else if (status === 409 || status === 400) {
        message = backendMessage || 'Time Slot Unavailable: You have a conflicting appointment.'
      }

      addToast('error', message)
      throw new Error(message)
    }
  }

  const handleCalculateQuote = async (formData: any) => {
    try {
      const token = await getToken()
      await apiClient.post('/api/quotes', {
        ...formData,
        toZip: formData.zipCode,
        toAddress: formData.fullAddress,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      addToast('success', 'Shipping Quote Calculated & Saved')
      setShippingOpen(false)
    } catch {
      addToast('error', 'Failed to calculate quote')
    }
  }

  // ── Dot colour per lead status ─────────────────────────────────────────────
  const TAB_DOTS: Record<string, string> = {
    'New':             'bg-emerald-500',
    'Pending':         'bg-amber-500',
    'Contacted':       'bg-sky-500',
    'Appointment Set': 'bg-violet-500',
    'Closed':          'bg-muted-foreground/40',
    'Inbound Calls':   'bg-teal-500',
  }

  return (
    <div className={cn('ss4 flex flex-col h-full min-h-0')} data-theme={theme}>
      <ToastStack toasts={toasts} dismiss={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* ── TOPBAR ── */}
      {/* On mobile/tablet, the open conversation shows its own header — collapse
          the inbox topbar + tab strip so the conversation gets near-full height. */}
      <header className={cn('ss4-topbar shrink-0', selectedLead && 'hidden lg:block')} style={{ minHeight: 52 }}>

        {/* Title + actions */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-3 pb-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 ss4-logo-mark flex shrink-0 items-center justify-center">
              <Mail className="h-3.5 w-3.5" style={{ color: '#fff' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="ss4-display font-bold leading-tight tracking-tight" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                  Lead Inbox
                </h1>
                {total > 0 && (
                  <span className="ss4-badge inline-flex items-center tabular-nums" style={{ borderRadius: 10 }}>
                    {total}
                  </span>
                )}
              </div>
              <div className="mt-0.5">
                <SyncStatus
                  connected={centralConnected}
                  email={centralEmail}
                  sourceEmail={LEADS_SOURCE_EMAIL}
                  lastSyncTime={lastSyncTime}
                  statusLoaded={centralStatusLoaded}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={syncAndRefresh}
              disabled={!centralConnected || isWorkerSyncing || localIsSyncing}
              className="ss4-pill-btn flex items-center gap-1.5 px-2.5 h-9 sm:h-7 text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-3 sm:w-3 ${isWorkerSyncing || localIsSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {(isWorkerSyncing || localIsSyncing) ? 'Syncing…' : 'Refresh'}
              </span>
            </button>
            <button
              onClick={toggleTheme}
              className="ss4-theme-btn h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center shrink-0"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <Moon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
            </button>
            <SupraLeoAI variant="toolbar" />
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex items-center overflow-x-auto px-3 mt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ borderTop: '1px solid var(--border-1)' }}>
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); setSelectedLead(null); }}
              className="relative flex items-center gap-1.5 px-3 py-2.5 sm:py-2 text-[13px] font-semibold transition-all shrink-0"
              style={{
                color: statusFilter === tab.key ? 'var(--accent)' : 'var(--text-tertiary)',
                borderBottom: `2px solid ${statusFilter === tab.key ? 'var(--accent)' : 'transparent'}`,
              }}
            >
              {tab.key !== null && TAB_DOTS[tab.key] && (
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  statusFilter === tab.key ? TAB_DOTS[tab.key] : ''
                }`} style={statusFilter !== tab.key ? { background: 'var(--text-disabled)' } : {}} />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── BODY ── */}
      {statusFilter === 'Inbound Calls' ? (
        <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--bg-base)' }}>
          <InboundCallsTab />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <LeadsList
            leads={leads}
            isLoading={isLoading}
            total={total}
            pages={pages}
            currentPage={currentPage}
            selectedLeadId={selectedLead?._id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onPageChange={setCurrentPage}
            onLeadSelect={setSelectedLead}
            highlightedLeadIds={highlightedLeadIds}
            itemsPerPage={LEADS_PER_PAGE}
            sourceEmail={LEADS_SOURCE_EMAIL}
            markAsRead={markAsRead}
          />

          {/* Right panel */}
          <div
            className={cn('flex-1 flex flex-col min-w-0 min-h-0', !selectedLead ? 'hidden lg:flex' : 'flex')}
            style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--border-1)' }}
          >
            {selectedLead ? (
              <>
                <ConversationView
                  lead={selectedLead}
                  threads={threads[selectedLead._id] || []}
                  onClose={() => setSelectedLead(null)}
                  sourceEmail={LEADS_SOURCE_EMAIL}
                />
                <ReplySection
                  isClosed={isClosed}
                  replyMessage={replyMessage}
                  setReplyMessage={setReplyMessage}
                  onSend={handleSend}
                  isSending={isSending}
                  onStatusChange={handleStatus}
                  onApptOpen={() => setApptOpen(true)}
                  onQuoteShipping={() => setShippingOpen(true)}
                  onReopen={() => handleStatus('Pending')}
                  selectedLeadStatus={selectedLead.status}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-6 sm:px-10 py-12 sm:py-16">
                <div className="relative">
                  <div className="ss4-empty-icon flex h-20 w-20 items-center justify-center">
                    <MessageSquare className="h-8 w-8" style={{ color: 'var(--accent)', opacity: 0.4 }} />
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-7 w-7 ss4-logo-mark flex items-center justify-center">
                    <Mail className="h-3 w-3" style={{ color: '#fff' }} />
                  </div>
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <p className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Select a conversation</p>
                  <p className="leading-relaxed" style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                    Choose a lead from the list to view their inquiry, reply, and schedule appointments.
                  </p>
                  <p className="ss4-mono pt-1" style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{LEADS_SOURCE_EMAIL}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CreateAppointmentModal
        open={apptOpen}
        onOpenChange={setApptOpen}
        onCreateAppointment={handleAppt}
        conversations={[]}
        initialCustomerBooking={selectedLead ? {
          firstName: selectedLead.firstName || '',
          lastName: selectedLead.lastName || '',
          email: selectedLead.email || '',
          phone: selectedLead.phone || ''
        } : undefined}
        forceCustomerBooking={true}
        extraPayload={selectedLead ? { leadId: selectedLead._id } : undefined}
        entryTypeLock="appointment"
      />

      <ShippingQuoteModal
        open={shippingOpen}
        onOpenChange={setShippingOpen}
        vehicles={[]}
        onCalculate={handleCalculateQuote}
        defaultVehicle={selectedLead?.vehicle ? {
          make: selectedLead.vehicle.make,
          model: selectedLead.vehicle.model,
          year: parseInt(selectedLead.vehicle.year)
        } as any : undefined}
        initialData={selectedLead ? {
          firstName: selectedLead.firstName,
          lastName: selectedLead.lastName,
          email: selectedLead.email,
          phone: selectedLead.phone,
        } : undefined}
      />
    </div>
  )
}
