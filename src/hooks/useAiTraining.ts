"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"
import type {
  DraftEvaluation,
  TrainingProposalDetail,
  TrainingProposalPage,
  TrainingStatusInfo,
} from "@/lib/aiTraining"
import type { LabRun, LabRunPage, LabScenario, LabScenarioPage, LabScenarioRevision, LabStatus } from "@/lib/aiTrainingLab"
import type { ImportBatchDetail, ImportBatchPage, ImportItemDetail } from "@/lib/aiTrainingImport"

type GetToken = () => Promise<string | null>

export function trainingErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message || fallback
}

function useTrainingResource<T>(getToken: GetToken, path: string | null, fallbackError: string) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(Boolean(path))
  const [error, setError] = React.useState<string | null>(null)
  const [errorStatus, setErrorStatus] = React.useState<number | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const getTokenRef = React.useRef(getToken)

  React.useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  React.useEffect(() => {
    if (!path) {
      setData(null)
      setLoading(false)
      setError(null)
      setErrorStatus(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setErrorStatus(null)
    const load = async () => {
      try {
        const token = await getTokenRef.current()
        if (!token) throw new Error("Please sign in again")
        const res = await apiClient.get(path, { headers: { Authorization: `Bearer ${token}` } })
        if (!cancelled) setData((res.data?.data || res.data) as T)
      } catch (err) {
        if (!cancelled) {
          setError(trainingErrorMessage(err, fallbackError))
          setErrorStatus((err as { response?: { status?: number } })?.response?.status ?? null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [path, fallbackError, reloadKey])

  const reload = React.useCallback(() => setReloadKey((key) => key + 1), [])
  return { data, setData, loading, error, errorStatus, reload }
}

export function useTrainingStatus(getToken: GetToken, enabled = true) {
  return useTrainingResource<TrainingStatusInfo>(getToken, enabled ? "/api/crm/ai-training/status" : null, "Could not load AI training status")
}

export function useTrainingProposals(getToken: GetToken, filters: { status?: string; source?: string; mine?: boolean; page?: number }, enabled = true) {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.source) params.set("source", filters.source)
  if (filters.mine) params.set("mine", "true")
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  const query = params.toString()
  const path = enabled ? `/api/crm/ai-training/proposals${query ? `?${query}` : ""}` : null
  return useTrainingResource<TrainingProposalPage>(getToken, path, "Could not load training proposals")
}

export function useTrainingProposal(getToken: GetToken, id: string | null) {
  const path = id ? `/api/crm/ai-training/proposals/${encodeURIComponent(id)}` : null
  return useTrainingResource<TrainingProposalDetail>(getToken, path, "Could not load this proposal")
}

export function useDraftEvaluations(getToken: GetToken, draftId: string | null, enabled = true) {
  const path = enabled && draftId ? `/api/crm/ai-training/evaluations?draftId=${encodeURIComponent(draftId)}` : null
  return useTrainingResource<{ evaluations: DraftEvaluation[] }>(getToken, path, "Could not load draft ratings")
}

export function useLabStatus(getToken: GetToken, enabled = true) {
  return useTrainingResource<LabStatus>(getToken, enabled ? "/api/crm/ai-training/lab/status" : null, "Could not load the Testing Lab")
}

export function useLabScenarios(getToken: GetToken, filters: { archived?: boolean; channel?: string; mine?: boolean; q?: string; page?: number; limit?: number }, enabled = true) {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.archived) params.set("archived", "true")
  if (filters.channel) params.set("channel", filters.channel)
  if (filters.mine) params.set("mine", "true")
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  const query = params.toString()
  const path = enabled ? `/api/crm/ai-training/lab/scenarios${query ? `?${query}` : ""}` : null
  return useTrainingResource<LabScenarioPage>(getToken, path, "Could not load scenarios")
}

export function useLabScenario(getToken: GetToken, id: string | null) {
  const path = id ? `/api/crm/ai-training/lab/scenarios/${encodeURIComponent(id)}` : null
  return useTrainingResource<{ scenario: LabScenario; revisions: LabScenarioRevision[] }>(getToken, path, "Could not load this scenario")
}

export function useLabRuns(getToken: GetToken, filters: { policyId?: string; scenarioId?: string; version?: number; page?: number; limit?: number }, enabled = true) {
  const params = new URLSearchParams()
  if (filters.policyId) params.set("policyId", filters.policyId)
  if (filters.scenarioId) params.set("scenarioId", filters.scenarioId)
  if (filters.version) params.set("version", String(filters.version))
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  const query = params.toString()
  const path = enabled ? `/api/crm/ai-training/lab/runs${query ? `?${query}` : ""}` : null
  return useTrainingResource<LabRunPage>(getToken, path, "Could not load test results")
}

export function useLabRun(getToken: GetToken, id: string | null) {
  const path = id ? `/api/crm/ai-training/lab/runs/${encodeURIComponent(id)}` : null
  return useTrainingResource<LabRun>(getToken, path, "Could not load this test result")
}

export function useTrainingProposalOptions(getToken: GetToken, filters: { q?: string; page?: number; limit?: number }, enabled = true) {
  const params = new URLSearchParams({ limit: String(filters.limit || 10) })
  if (filters.q) params.set("q", filters.q)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  const path = enabled ? `/api/crm/ai-training/proposals?${params.toString()}` : null
  return useTrainingResource<TrainingProposalPage>(getToken, path, "Could not load training proposals")
}

export function useImportBatches(getToken: GetToken, page: number, enabled = true) {
  const path = enabled ? `/api/crm/ai-training/imports?limit=10${page > 1 ? `&page=${page}` : ""}` : null
  return useTrainingResource<ImportBatchPage>(getToken, path, "Could not load import history")
}

export function useImportBatch(getToken: GetToken, id: string | null, filters: { status?: string; page?: number }) {
  const params = new URLSearchParams({ limit: "50" })
  if (filters.status) params.set("status", filters.status)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  const path = id ? `/api/crm/ai-training/imports/${encodeURIComponent(id)}?${params.toString()}` : null
  return useTrainingResource<ImportBatchDetail>(getToken, path, "Could not load this import")
}

export function useImportItem(getToken: GetToken, batchId: string | null, itemId: string | null) {
  const path = batchId && itemId ? `/api/crm/ai-training/imports/${encodeURIComponent(batchId)}/items/${encodeURIComponent(itemId)}` : null
  return useTrainingResource<ImportItemDetail>(getToken, path, "Could not load the import details")
}

export async function trainingRequest<T>(
  getToken: GetToken,
  method: "post" | "put" | "patch",
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const token = await getToken()
  const res = await apiClient[method](path, body, { headers: { Authorization: `Bearer ${token}` } })
  return (res.data?.data || res.data) as T
}
