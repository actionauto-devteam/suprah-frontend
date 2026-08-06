import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

// ── Cross-tab auth coordination ───────────────────────────────────────────
// The access token lives only in window.__AUTH_TOKEN__ (in-memory), so each
// tab used to refresh independently. With refresh-token rotation on the
// backend, tabs racing each other's refreshes could invalidate one another.
// The backend now has a reuse grace window that makes the race harmless,
// and this channel reduces the race happening at all: whichever tab
// refreshes first broadcasts the new token so the others adopt it instead
// of firing their own refresh.
const authChannel: BroadcastChannel | null =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("suprah-auth")
    : null;

authChannel?.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "token" && typeof window !== "undefined") {
    (window as any).__AUTH_TOKEN__ = event.data.token;
  }
  if (event.data?.type === "logout" && typeof window !== "undefined") {
    (window as any).__AUTH_TOKEN__ = null;
  }
});

function broadcastToken(token: string) {
  try {
    authChannel?.postMessage({ type: "token", token });
  } catch {
    // BroadcastChannel failures must never break the auth flow.
  }
}

function broadcastLogout() {
  try {
    authChannel?.postMessage({ type: "logout" });
  } catch {
    // Ignore.
  }
}

let lastDegradedDispatch = 0;

function notifyServiceDegraded(message?: string) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastDegradedDispatch < 15_000) return;
  lastDegradedDispatch = now;
  window.dispatchEvent(
    new CustomEvent("system:degraded", { detail: { message } })
  );
}

function isExpectedSupraSpaceAvailabilityError(
  status: number | undefined,
  requestUrl: string
): boolean {
  if (status !== 404 && status !== 409) return false;

  return (
    requestUrl.includes("/api/supraspace/conversations/direct") ||
    requestUrl.includes("/api/supraspace/session-token")
  );
}

class ApiClient {
  private client: AxiosInstance;
  private onAuthFailure?: () => void;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
      withCredentials: true,
    });

    // ── Request interceptor ──────────────────────────────────────────────
    this.client.interceptors.request.use(
      async (config) => {
        // When sending FormData, remove the default Content-Type: application/json.
        // Without this, axios's transformRequest JSON-serializes the FormData into {}
        // so the backend receives an empty JSON body instead of multipart form data.
        // Deleting the header here lets the browser set the correct
        // Content-Type: multipart/form-data; boundary=... automatically.
        if (config.data instanceof FormData) {
          delete (config.headers as any)["Content-Type"];
        }

        if (typeof window !== "undefined" && !config.headers.Authorization) {
          try {
            const token = (window as any).__AUTH_TOKEN__;
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (e) {
            // Ignore
          }
        }

        if (typeof window !== "undefined") {
          const impersonatedOrgId = localStorage.getItem(
            "admin_impersonate_org_id"
          );
          if (impersonatedOrgId) {
            config.headers["x-impersonate-org-id"] = impersonatedOrgId;
          }
        }

        return config;
      },
      (error) => {
        console.error("[apiClient] Request setup failed:", error);
        return Promise.reject(error);
      }
    );

    // ── Response interceptor ─────────────────────────────────────────────
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          axios.isCancel(error) ||
          error?.code === "ERR_CANCELED" ||
          error?.message === "canceled"
        ) {
          return Promise.reject(error);
        }

        const originalRequest = error.config;
        const requestUrl = String(originalRequest?.url || "");

        const skipAuthRefresh = Boolean(
          (originalRequest as any)?._skipAuthRefresh
        );

        const isRefreshEndpoint = requestUrl.includes(
          "/api/auth/refresh-tokens"
        );
        const isPublicAuthEndpoint =
          /\/api\/auth\/(login|register|register-dealership|verify-email|resend-otp|forgot-password|reset-password)/.test(
            requestUrl
          );

        if (error.response?.status === 401 && typeof window !== "undefined") {
          if (skipAuthRefresh || isPublicAuthEndpoint || isRefreshEndpoint) {
            if (isRefreshEndpoint) {
              (window as any).__AUTH_TOKEN__ = null;
            }
            return Promise.reject(error);
          }

          if (originalRequest._retry) {
            (window as any).__AUTH_TOKEN__ = null;
            broadcastLogout();
            if (this.onAuthFailure) {
              this.onAuthFailure();
            }
            return Promise.reject(error);
          }

          originalRequest._retry = true;

          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          isRefreshing = true;

          try {
            const refreshResponse = await axios.post(
              `${API_URL}/api/auth/refresh-tokens`,
              {},
              { withCredentials: true, timeout: 15000 }
            );

            const newToken =
              refreshResponse.data?.data?.accessToken ||
              refreshResponse.data?.accessToken;

            if (!newToken) throw new Error("No token in refresh response");

            (window as any).__AUTH_TOKEN__ = newToken;
            broadcastToken(newToken);
            processQueue(null, newToken);

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            const refreshStatus = (refreshError as any)?.response?.status;
            if (refreshStatus === 401 || refreshStatus === 403) {
              // Definitive rejection of the refresh token by the server.
              // With the backend reuse grace window in place, this now
              // only fires for genuinely expired/revoked sessions.
              (window as any).__AUTH_TOKEN__ = null;
              broadcastLogout();
              console.error(
                "[apiClient] Refresh token rejected. User needs to re-login."
              );
              if (this.onAuthFailure) {
                this.onAuthFailure();
              }
            } else {
              // Network error / 429 / 5xx — NOT an auth failure.
              // Keep the session; the next 401 will retry the refresh.
              console.error(
                "[apiClient] Token refresh unreachable. Keeping session for retry."
              );
            }
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        if (error.response?.status === 403) {
          const msg = error.response.data?.message || "";
          if (msg.includes("Suspended") && typeof window !== "undefined") {
            window.location.href = "/suspended";
          }
        }

        if (error.response?.status === 503) {
          notifyServiceDegraded(error.response.data?.message);
        }

        if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
          const attemptedUrl = `${error.config?.baseURL}${error.config?.url}`;
          console.error("[apiClient] NETWORK ERROR");
          console.error("   Attempted URL:", attemptedUrl);
          console.error("   This means: Cannot reach backend server");
          console.error(
            "   Check: Is backend running on http://localhost:5000?"
          );
        } else if (error.response) {
          const status = error.response.status;
          if (isExpectedSupraSpaceAvailabilityError(status, requestUrl)) {
            // This is an expected account-availability result, not an
            // application crash. Logging it as console.error causes the
            // Next.js development overlay even though the caller handles it.
            console.warn(
              `[apiClient] Suprah Space is unavailable for this account (${status}):`,
              error.response.data
            );
          } else {
            console.error(
              `[apiClient] Server responded with ${status}:`,
              error.response.data
            );
          }
        } else {
          console.error("[apiClient] Error:", error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async syncPost<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, {
      ...config,
      timeout: 120000,
    });
  }

  // ── Organization Methods ─────────────────────────────────────────────────
  async createOrganization(
    data: { name: string; slug: string },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/organizations", data, config);
  }

  async getOrganization(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/organizations/${id}`, config);
  }

  async updateOrganization(
    id: string,
    data: any,
    config?: AxiosRequestConfig
  ) {
    return this.patch(`/api/organizations/${id}`, data, config);
  }

  async updateOrganizationSubscription(
    id: string,
    data: { tier: string },
    config?: AxiosRequestConfig
  ) {
    return this.patch(`/api/organizations/${id}/subscription`, data, config);
  }

  async adminUpdateOrganizationSubscription(
    id: string,
    data: { tier?: string; status?: string },
    config?: AxiosRequestConfig
  ) {
    return this.put(`/api/admin/organizations/${id}/subscription`, data, config);
  }

  async getUserOrganizations(config?: AxiosRequestConfig) {
    return this.get("/api/users/me/organizations", config);
  }

  async selectOrganization(
    organizationId: string,
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/users/me/select-org", { organizationId }, config);
  }

  async getMembers(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/organizations/${id}/members`, config);
  }

  async removeMember(
    orgId: string,
    userId: string,
    config?: AxiosRequestConfig
  ) {
    return this.delete(
      `/api/organizations/${orgId}/members/${userId}`,
      config
    );
  }

  // ── Invitation Methods ───────────────────────────────────────────────────
  async sendInvite(
    data: { email: string; role: string },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/invitations", data, config);
  }

  async validateInvite(token: string, config?: AxiosRequestConfig) {
    return this.get(`/api/invitations/validate/${token}`, config);
  }

  async acceptInvite(token: string, config?: AxiosRequestConfig) {
    return this.post("/api/invitations/accept", { token }, config);
  }

  // ── Driver Request Methods ───────────────────────────────────────────────
  async createDriverRequest(
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/driver-requests", data, config);
  }

  async getDriverRequestStatus(config?: AxiosRequestConfig) {
    return this.get("/api/driver-requests/my-status", config);
  }

  async getDriverRequests(
    params?: { status?: string },
    config?: AxiosRequestConfig
  ) {
    return this.get("/api/driver-requests", { ...config, params });
  }

  async approveDriverRequest(id: string, config?: AxiosRequestConfig) {
    return this.patch(`/api/driver-requests/${id}/approve`, {}, config);
  }

  async rejectDriverRequest(id: string, config?: AxiosRequestConfig) {
    return this.patch(`/api/driver-requests/${id}/reject`, {}, config);
  }

  // ── Dashboard Methods ────────────────────────────────────────────────────
  async getDashboardMetrics(
    params: { period?: string; month?: string },
    config?: AxiosRequestConfig
  ) {
    return this.get("/api/dashboard/metrics", { ...config, params });
  }

  async getLeaderboard(
    params: { page?: number; limit?: number },
    config?: AxiosRequestConfig
  ) {
    return this.get("/api/dashboard/leaderboard", { ...config, params });
  }

  // ── Team Pulse Methods ───────────────────────────────────────────────────
  async getTeamMembers(config?: AxiosRequestConfig) {
    return this.get("/api/team-pulse/members", config);
  }

  async getTeamAbsences(
    params: { year?: number; month?: number; status?: string },
    config?: AxiosRequestConfig
  ) {
    return this.get("/api/team-pulse/absences", { ...config, params });
  }

  async createAbsence(
    data: { date: string; type: string; note?: string },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/team-pulse/absences", data, config);
  }

  async updateAbsence(
    id: string,
    data: { title?: string; note?: string; otherText?: string },
    config?: AxiosRequestConfig
  ) {
    return this.patch(`/api/team-pulse/absences/${id}`, data, config);
  }

  async deleteAbsence(id: string, config?: AxiosRequestConfig) {
    return this.delete(`/api/team-pulse/absences/${id}`, config);
  }

  async getBoardNotes(config?: AxiosRequestConfig) {
    return this.get("/api/team-pulse/board", config);
  }

  async createBoardNote(
    data: {
      content: string;
      color?: string;
      title?: string;
      durationDays?: number | null;
      announcementType?: string;
      emoji?: string;
    },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/team-pulse/board", data, config);
  }

  async deleteBoardNote(id: string, config?: AxiosRequestConfig) {
    return this.delete(`/api/team-pulse/board/${id}`, config);
  }

  async updateBoardNote(
    id: string,
    data: {
      title?: string;
      content?: string;
      color?: string;
      emoji?: string;
    },
    config?: AxiosRequestConfig
  ) {
    return this.patch(`/api/team-pulse/board/${id}`, data, config);
  }

  async togglePinBoardNote(id: string, config?: AxiosRequestConfig) {
    return this.patch(`/api/team-pulse/board/${id}/pin`, {}, config);
  }

  async reorderBoardNotes(
    orderedIds: string[],
    config?: AxiosRequestConfig
  ) {
    return this.patch(
      "/api/team-pulse/board/reorder",
      { orderedIds },
      config
    );
  }

  async ackBoardNote(id: string, config?: AxiosRequestConfig) {
    return this.patch(`/api/team-pulse/board/${id}/ack`, {}, config);
  }

  async getBoardNoteReactions(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/team-pulse/board/${id}/reactions`, config);
  }

  async toggleBoardNoteReaction(id: string, reaction: string, config?: AxiosRequestConfig) {
    return this.post(`/api/team-pulse/board/${id}/reactions`, { reaction }, config);
  }

  async uploadBoardNoteAttachments(id: string, formData: FormData, config?: AxiosRequestConfig) {
    return this.post(`/api/team-pulse/board/${id}/attachments`, formData, {
      ...config,
      headers: { ...(config?.headers || {}), 'Content-Type': 'multipart/form-data' },
    });
  }

  async approveAbsence(id: string, config?: AxiosRequestConfig) {
    return this.patch(`/api/team-pulse/absences/${id}/approve`, {}, config);
  }

  async rejectAbsence(id: string, data: { reason?: string }, config?: AxiosRequestConfig) {
    return this.patch(`/api/team-pulse/absences/${id}/reject`, data, config);
  }

  async uploadAbsenceProof(id: string, formData: FormData, config?: AxiosRequestConfig) {
    return this.post(`/api/team-pulse/absences/${id}/proof`, formData, {
      ...config,
      headers: { ...(config?.headers || {}), 'Content-Type': 'multipart/form-data' },
    });
  }

  async getPendingAbsences(config?: AxiosRequestConfig) {
    return this.get('/api/team-pulse/absences?status=pending', config);
  }

  async getTeamLeaderboard(period: string, config?: AxiosRequestConfig) {
    return this.get('/api/team-pulse/leaderboard', { ...config, params: { period } });
  }

  async getTeamPerformance(period: string, config?: AxiosRequestConfig) {
    return this.get('/api/team-pulse/performance', { ...config, params: { period } });
  }

  async getDeals(config?: AxiosRequestConfig) {
    return this.get('/api/deal-board', config);
  }

  async createDeal(data: Record<string, any>, config?: AxiosRequestConfig) {
    return this.post('/api/deal-board', data, config);
  }

  async updateDeal(id: string, data: Record<string, any>, config?: AxiosRequestConfig) {
    return this.patch(`/api/deal-board/${id}`, data, config);
  }

  async moveDeal(id: string, data: { stage: string; sortOrder?: number }, config?: AxiosRequestConfig) {
    return this.patch(`/api/deal-board/${id}/move`, data, config);
  }

  async deleteDeal(id: string, config?: AxiosRequestConfig) {
    return this.delete(`/api/deal-board/${id}`, config);
  }

  async getShifts(params: { year?: number; month?: number; week?: string }, config?: AxiosRequestConfig) {
    return this.get('/api/schedules', { ...config, params });
  }

  async createShift(data: Record<string, any>, config?: AxiosRequestConfig) {
    return this.post('/api/schedules', data, config);
  }

  async updateShift(id: string, data: Record<string, any>, config?: AxiosRequestConfig) {
    return this.patch(`/api/schedules/${id}`, data, config);
  }

  async deleteShift(id: string, config?: AxiosRequestConfig) {
    return this.delete(`/api/schedules/${id}`, config);
  }

  async getTeamMemberProfile(userId: string, config?: AxiosRequestConfig) {
    return this.get(`/api/users/profile/${userId}`, config);
  }

  async updateOnlineStatus(
    data: { status: string; customStatus?: string; expiresIn?: number | null },
    config?: AxiosRequestConfig
  ) {
    return this.patch("/api/profile/online-status", data, config);
  }

  async setEmploymentLocationType(
    userId: string,
    employmentLocationType: "onsite" | "remote",
    config?: AxiosRequestConfig
  ) {
    return this.patch(`/api/team-pulse/members/${userId}/employment-location`, { employmentLocationType }, config);
  }

  // ── Locator Methods ──────────────────────────────────────────────────────

  async getMyLocatorStatus(config?: AxiosRequestConfig) {
    return this.get("/api/locator/my-status", config);
  }

  async setLocationConsent(
    data: { granted: boolean; deviceHint?: string },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/locator/consent", data, config);
  }

  async setLocationSharingOptOut(
    data: { optOut: boolean },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/locator/sharing-preference", data, config);
  }

  async pingLocation(
    data: {
      lat: number; lng: number; heading?: number; speedMph?: number; accuracyM?: number;
      batteryLevel?: number; isCharging?: boolean; connectivity?: "online" | "offline";
      deviceType?: "mobile" | "desktop"; connectionType?: string; effectiveType?: string; downlinkMbps?: number;
    },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/locator/ping", data, config);
  }

  async pauseLocationSharing(data: { reason?: "manual" | "break" }, config?: AxiosRequestConfig) {
    return this.post("/api/locator/pause", data, config);
  }

  async resumeLocationSharing(config?: AxiosRequestConfig) {
    return this.post("/api/locator/resume", {}, config);
  }

  async stopLocationSharing(config?: AxiosRequestConfig) {
    return this.post("/api/locator/off-duty", {}, config);
  }

  async getActiveEmployeeLocations(config?: AxiosRequestConfig) {
    return this.get("/api/locator/active", config);
  }

  async requestLocationShare(userId: string, config?: AxiosRequestConfig) {
    return this.post(`/api/locator/request/${userId}`, {}, config);
  }

  async getPlaces(config?: AxiosRequestConfig) {
    return this.get("/api/locator/places", config);
  }

  async createPlace(
    data: { name: string; lat: number; lng: number; radiusM?: number; icon?: string; color?: string; address?: string; description?: string },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/locator/places", data, config);
  }

  async updatePlace(id: string, data: Record<string, any>, config?: AxiosRequestConfig) {
    return this.patch(`/api/locator/places/${id}`, data, config);
  }

  async deletePlace(id: string, config?: AxiosRequestConfig) {
    return this.delete(`/api/locator/places/${id}`, config);
  }

  async manualCheckIn(placeId: string, config?: AxiosRequestConfig) {
    return this.post(`/api/locator/places/${placeId}/check-in`, {}, config);
  }

  async getLocationHistory(
    userId: string,
    params: { from?: string; to?: string },
    config?: AxiosRequestConfig
  ) {
    return this.get(`/api/locator/history/${userId}`, { ...config, params });
  }

  async getTimeAtPlaceReport(
    params: { from?: string; to?: string; userId?: string; placeId?: string },
    config?: AxiosRequestConfig
  ) {
    return this.get("/api/locator/reports/time-at-place", { ...config, params });
  }

  async getDailyActivityLog(
    params: { date: string; userId?: string },
    config?: AxiosRequestConfig
  ) {
    return this.get("/api/locator/daily-activity", { ...config, params });
  }

  // ── Admin time-log correction (CRM) ─────────────────────────────────────

  async correctTimeLog(
    data: { userId: string; date: string; correctedTimeOut: string; reason: string },
    config?: AxiosRequestConfig
  ) {
    return this.patch("/api/crm/timeproof/correct-time", data, config);
  }

  async excludeScreenshots(
    data: { userId: string; date: string; after: string; reason: string },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/crm/timeproof/screenshots/exclude", data, config);
  }

  async getDrivingSessions(
    params: { userId?: string; from?: string; to?: string },
    config?: AxiosRequestConfig
  ) {
    return this.get("/api/locator/driving-sessions", { ...config, params });
  }

  async getDrivingSessionDetail(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/locator/driving-sessions/${id}`, config);
  }

  async respondToIncident(id: string, confirmed: boolean, config?: AxiosRequestConfig) {
    return this.post(`/api/locator/driving-sessions/${id}/incident-response`, { confirmed }, config);
  }

  async triggerSos(data: { lat: number; lng: number }, config?: AxiosRequestConfig) {
    return this.post("/api/locator/sos", data, config);
  }

  async resolveSos(id: string, data: { status: "resolved" | "false_alarm"; note?: string }, config?: AxiosRequestConfig) {
    return this.post(`/api/locator/sos/${id}/resolve`, data, config);
  }

  async getActiveSosAlerts(config?: AxiosRequestConfig) {
    return this.get("/api/locator/sos/active", config);
  }

  // ── Onboarding Methods ───────────────────────────────────────────────────

  /**
   * Step 1 — set role.
   * Returns { skipOrgSelect: true } for dealers (onboarding done),
   * or { skipOrgSelect: false } for customers (must call selectOnboardingOrg next).
   */
  async completeOnboarding(role: string, config?: AxiosRequestConfig) {
    return this.post("/api/users/me/complete-onboarding", { role }, config); // ← fixed: was /api/auth/complete-onboarding
  }

  /**
   * Step 2 — customers only.
   * Links the customer to a dealership org and flips onboardingCompleted.
   */
  async selectOnboardingOrg(
    organizationId: string,
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/users/me/join-org", { organizationId }, config); // ← onboarding join: no prior membership required
  }

  /**
   * Fetch the public list of dealerships for the onboarding org picker.
   * No auth token required — this is called before onboarding is complete.
   */
  async getPublicOrganizations(config?: AxiosRequestConfig) {
    return this.get("/api/organizations/public", config);
  }

  // ── Vehicle Methods ──────────────────────────────────────────────────────
  async getVehicles(params?: any, config?: AxiosRequestConfig) {
    return this.get("/api/vehicles", { ...config, params });
  }

  async getVehicle(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/vehicles/${id}`, config);
  }

  async getPublicVehicle(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/vehicles/public/${id}`, config);
  }

  async checkVehicleAvailability(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/vehicles/${id}/availability`, config);
  }

  async reserveVehicle(
    id: string,
    customerName: string,
    config?: AxiosRequestConfig
  ) {
    return this.post(`/api/vehicles/${id}/reserve`, { customerName }, config);
  }

  // ── Customer Lead Methods ────────────────────────────────────────────────
  async submitInquiry(
    data: {
      vehicleId: string;
      comments?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/customer/leads/inquiry", data, config);
  }

  async submitFinanceApplication(
    data: {
      vehicleId: string;
      personalInfo: any;
      employmentInfo: any;
    },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/customer/leads/finance", data, config);
  }

  async broadcastPush(
    data: {
      roleTarget: string;
      title: string;
      body: string;
      url?: string;
      image?: string;
      icon?: string;
    },
    config?: AxiosRequestConfig
  ) {
    return this.post("/api/admin/broadcast-push", data, config);
  }

  setOnAuthFailure(callback: () => void) {
    this.onAuthFailure = callback;
  }
}

export const apiClient = new ApiClient();