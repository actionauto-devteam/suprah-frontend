"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle2, Loader2, PhoneCall, Smartphone, XCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { formatSmsRecipient } from "@/lib/api/leadComposer"
import { cn } from "@/lib/utils"

interface CallPhoneStatus {
  phone: string
  enabled: boolean
  verified: boolean
  verifying: boolean
}

const field = "mt-1 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

export default function MyCallsSettingsPage() {
  const { getToken, userId } = useAuth()
  const queryClient = useQueryClient()
  const headers = async () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("crm_token") || await getToken()}` } })
  const key = ["crm-my-call-phone", userId]
  const [phone, setPhone] = React.useState("")
  const [enabled, setEnabled] = React.useState(false)
  const [notice, setNotice] = React.useState("")
  const [error, setError] = React.useState("")

  const query = useQuery({
    queryKey: key,
    retry: false,
    queryFn: async () => (await apiClient.get("/api/crm/my-call-phone", await headers())).data.data as CallPhoneStatus,
    refetchInterval: (current) => (current.state.data?.verifying ? 3000 : false),
  })
  const status = query.data
  const loadedPhone = status ? status.phone : null
  const loadedEnabled = status ? status.enabled : null

  React.useEffect(() => {
    if (loadedPhone === null) return
    setPhone(loadedPhone ? formatSmsRecipient(loadedPhone) || loadedPhone : "")
    setEnabled(Boolean(loadedEnabled))
  }, [loadedPhone, loadedEnabled])

  const save = useMutation({
    mutationFn: async () => (await apiClient.put("/api/crm/my-call-phone", { phone, enabled }, await headers())).data.data as CallPhoneStatus,
    onSuccess: (data) => queryClient.setQueryData(key, data),
  })

  const verify = useMutation({
    mutationFn: async () => (await apiClient.post("/api/crm/my-call-phone/verify", {}, await headers())).data.data as CallPhoneStatus,
    onSuccess: (data) => queryClient.setQueryData(key, data),
  })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setNotice("")
    setError("")
    try {
      const saved = await save.mutateAsync()
      setNotice(saved.phone ? "Saved." : "Your mobile number was removed. Calls ring only in Suprah CRM.")
    } catch (err) {
      setError(errorMessage(err, "Could not save your phone."))
    }
  }

  const startVerify = async () => {
    setNotice("")
    setError("")
    try {
      await verify.mutateAsync()
    } catch (err) {
      setError(errorMessage(err, "Could not call your phone."))
    }
  }

  const savedPhone = status?.phone ? formatSmsRecipient(status.phone) || status.phone : ""

  return (
    <main className="mx-auto w-full min-w-0 max-w-2xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 border-b pb-4">
        <Link href="/crm/settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border" title="Back to settings" aria-label="Back to settings">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Smartphone className="h-5 w-5 text-emerald-500" />
            My Calls
          </h1>
          <p className="text-sm text-muted-foreground">Choose whether customer calls also ring your mobile phone.</p>
        </div>
      </div>

      <ul className="space-y-1.5 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <li>Customer calls always pop up in Suprah CRM. When this is on, your phone rings at the same time.</li>
        <li>Your phone shows the dealership number. You hear who is calling, then press 1 to take the call.</li>
        <li>Whoever answers first gets the call. Everyone else stops ringing.</li>
      </ul>

      {query.isPending ? (
        <Loader2 aria-label="Loading your call settings" className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorMessage(query.error, "Could not load your call settings.")}</p>
      ) : (
        <>
          <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-4" aria-label="My mobile phone">
            <label className="block text-xs font-medium text-muted-foreground">
              Your mobile number
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(801) 555-0123" className={field} />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3">
              <span className="text-sm font-medium">Also ring my phone for customer calls</span>
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-emerald-600" />
            </label>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={save.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>

          {status?.phone && (
            <section aria-label="Phone confirmation" className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{savedPhone}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", status.verified ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
                  {status.verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {status.verified ? "Confirmed" : "Not confirmed yet"}
                </span>
              </div>
              {status.verified ? (
                <p className="text-sm text-muted-foreground">
                  {status.enabled ? "Customer calls will also ring this phone." : "This phone is confirmed but turned off. Turn on \"Also ring my phone\" and save to use it."}
                </p>
              ) : status.verifying ? (
                <p role="status" className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  Calling {savedPhone} now. Answer and press 1.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Your phone won&apos;t ring for customer calls until it is confirmed. We call you once; answer and press 1.</p>
                  <button type="button" onClick={startVerify} disabled={verify.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50">
                    {verify.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm with a test call
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}
