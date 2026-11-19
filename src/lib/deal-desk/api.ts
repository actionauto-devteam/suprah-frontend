import { request, getDealDeskToken, apiBase, DEAL_DESK_PREFIX, DealDeskError } from './http';
import type {
  Bootstrap,
  DealDetail,
  DealEvent,
  DealMessage,
  DealPermissions,
  DealScope,
  DealSummary,
  DealDeskSettings,
  FmPresence,
  Lender,
  Person,
  QueueMetrics,
} from './types';

export interface DealPayload {
  customer?: Record<string, unknown>;
  coBuyer?: Record<string, unknown>;
  vehicle?: Record<string, unknown>;
  tradeIn?: Record<string, unknown>;
  fourSquare?: Record<string, unknown>;
  creditApp?: Record<string, unknown>;
  salespersonId?: string;
}

export interface DealBundle {
  deal: DealDetail;
  messages: DealMessage[];
  events: DealEvent[];
  permissions: DealPermissions;
}

const qs = (o: Record<string, unknown>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const dealDeskApi = {
  bootstrap: () => request<Bootstrap>('/me'),

  listDeals: (params: { scope?: DealScope; stage?: string; source?: string; q?: string; limit?: number; page?: number }, signal?: AbortSignal) =>
    request<{ deals: DealSummary[]; total: number; page: number; limit: number }>(`/deals${qs(params)}`, { signal }),
  getDeal: (id: string) => request<DealBundle>(`/deals/${id}`),
  createDeal: (body: DealPayload) => request<{ deal: DealDetail }>('/deals', { body }),
  updateDeal: (id: string, body: DealPayload) => request<{ deal: DealDetail }>(`/deals/${id}`, { method: 'PATCH', body }),

  submit: (id: string) => request<{ deal: DealDetail }>(`/deals/${id}/submit`, { body: {} }),
  pickup: (id: string) => request<{ deal: DealDetail }>(`/deals/${id}/pickup`, { body: {} }),
  returnToQueue: (id: string) => request<{ deal: DealDetail }>(`/deals/${id}/return`, { body: {} }),
  analyze: (id: string) => request<{ deal: DealDetail }>(`/deals/${id}/analyze`, { body: {} }),
  requestInfo: (id: string, note: string) => request<{ deal: DealDetail }>(`/deals/${id}/request-info`, { body: { note } }),
  approve: (id: string, override = false, note?: string) => request<{ deal: DealDetail }>(`/deals/${id}/approve`, { body: { override, note } }),
  acceptOffer: (id: string) => request<{ deal: DealDetail }>(`/deals/${id}/offer/accept`, { body: {} }),
  declineOffer: (id: string) => request<{ deal: DealDetail }>(`/deals/${id}/offer/decline`, { body: {} }),
  release: (id: string, reason?: string) => request<{ deal: DealDetail }>(`/deals/${id}/release`, { body: { reason } }),
  changeStage: (id: string, to: 'signed' | 'funded' | 'cancelled' | 'structured', reason?: string) =>
    request<{ deal: DealDetail }>(`/deals/${id}/stage`, { body: { to, reason } }),
  revealSsn: (id: string) => request<{ ssn: string }>(`/deals/${id}/reveal-ssn`, { body: {} }),

  uploadDocument: (id: string, file: File, kind: string, onProgress?: (pct: number) => void) =>
    uploadWithProgress<{ deal: DealDetail }>(`/deals/${id}/documents`, file, kind, onProgress),
  deleteDocument: (id: string, docId: string) => request<{ deal: DealDetail }>(`/deals/${id}/documents/${docId}`, { method: 'DELETE' }),

  listMessages: (id: string, before?: string) => request<{ messages: DealMessage[] }>(`/deals/${id}/messages${qs({ before })}`),
  postMessage: (id: string, body: string) => request<{ message: DealMessage }>(`/deals/${id}/messages`, { body: { body } }),

  metrics: (range: string) => request<QueueMetrics>(`/metrics${qs({ range, tzOffset: -new Date().getTimezoneOffset() })}`),
  presence: () => request<{ presence: FmPresence[] }>('/fm'),
  setAvailability: (available: boolean) => request<{ available: boolean; activeDealCount: number }>('/fm/availability', { body: { available } }),

  getSettings: () => request<DealDeskSettings>('/settings'),
  saveSettings: (body: Partial<DealDeskSettings>) => request<DealDeskSettings>('/settings', { method: 'PUT', body }),
  people: () => request<{ people: Person[] }>('/people'),

  lenders: () => request<{ lenders: Lender[] }>('/lenders'),
  createLender: (body: Partial<Lender>) => request<{ lender: Lender }>('/lenders', { body }),
  updateLender: (id: string, body: Partial<Lender>) => request<{ lender: Lender }>(`/lenders/${id}`, { method: 'PUT', body }),
  deleteLender: (id: string) => request<null>(`/lenders/${id}`, { method: 'DELETE' }),
};

/** XHR upload so the UI can show real progress on large PDFs/photos. */
async function uploadWithProgress<T>(path: string, file: File, kind: string, onProgress?: (pct: number) => void): Promise<T> {
  const token = await getDealDeskToken();
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBase()}${DEAL_DESK_PREFIX}${path}`);
    xhr.withCredentials = true;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json: any = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve((json?.data ?? json) as T);
      else reject(new DealDeskError(json?.message || `Upload failed (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(new DealDeskError('Upload failed — check your connection.', 0));
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);
    xhr.send(form);
  });
}
