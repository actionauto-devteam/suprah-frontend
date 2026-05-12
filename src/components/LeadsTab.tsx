"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import { useLeads, Lead } from "@/hooks/useLeads"
import { initializeSocket } from "@/lib/socket.client"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { ShippingQuoteModal } from "@/components/shipping-quote-modal"
import { Vehicle } from "@/types/inventory"

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

export function LeadsTab() {
  const { getToken } = useAuth()

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

  return (
    <div className="flex flex-col bg-background text-foreground" style={{ height: '100vh', minHeight: 860 }}>
      <ToastStack toasts={toasts} dismiss={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* TOPBAR */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Inquiries & Leads</h1>
            <div className="mt-1.5 flex items-center gap-2">
              <SyncStatus
                connected={centralConnected}
                email={centralEmail}
                sourceEmail={LEADS_SOURCE_EMAIL}
                lastSyncTime={lastSyncTime}
                statusLoaded={centralStatusLoaded}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <button
              onClick={syncAndRefresh}
              disabled={!centralConnected || isWorkerSyncing || localIsSyncing}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border border-border/40 text-muted-foreground hover:text-foreground hover:border-emerald-500/50 hover:bg-muted/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isWorkerSyncing || localIsSyncing ? 'animate-spin' : ''}`} />
              {(isWorkerSyncing || localIsSyncing) ? 'Syncing…' : 'Refresh'}
            </button>
            <SupraLeoAI variant="toolbar" />
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); setSelectedLead(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all sm:mx-1 shrink-0 ${statusFilter === tab.key
                ? 'bg-white shadow-sm text-emerald-900 border border-emerald-100'
                : 'text-emerald-700/60 hover:text-emerald-800 hover:bg-emerald-50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      {statusFilter === 'Inbound Calls' ? (
        <div className="flex-1 overflow-auto p-6 bg-background"><InboundCallsTab /></div>
      ) : (
        <div className="flex flex-1 min-h-0 border-t border-border shadow-inner">
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

          <div className={`flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50/50 dark:bg-background ${!selectedLead ? 'hidden lg:flex' : 'flex'}`}>
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
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="h-24 w-24 rounded-4xl border-2 border-dashed border-border bg-white dark:bg-muted/10 shadow-sm flex items-center justify-center">
                  <RefreshCw className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <div className="space-y-1 mt-2">
                  <p className="text-base font-semibold text-foreground">Select a conversation</p>
                  <p className="text-sm text-muted-foreground font-medium">{LEADS_SOURCE_EMAIL}</p>
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
