import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";

// Use absolute URLs in both browser and server to hit the backend directly
// This ensures consistency across services and simplifies network debugging
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Token refresh queue ───────────────────────────────────────────────────────
// Prevents multiple simultaneous refresh calls during a burst of 401 errors.
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
        // Auto-inject native auth token if not already set
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

        // Inject impersonation header if present
        if (typeof window !== "undefined") {
          const impersonatedOrgId = localStorage.getItem(
            "admin_impersonate_org_id",
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
      },
    );

    // ── Response interceptor ─────────────────────────────────────────────
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        // ── Silently ignore intentional request cancellations ─────────
        if (
          axios.isCancel(error) ||
          error?.code === "ERR_CANCELED" ||
          error?.message === "canceled"
        ) {
          return Promise.reject(error);
        }

        // ── 401 Handler: Silent Token Refresh & Retry ─────────────────
        // When the access token expires mid-session, we silently refresh
        // it using the HttpOnly refreshToken cookie, then retry the
        // original request. The user never sees the error.
        const originalRequest = error.config;
        const requestUrl = String(originalRequest?.url || "");
        const skipAuthRefresh = Boolean(
          (originalRequest as any)?._skipAuthRefresh,
        );
        const isRefreshEndpoint = requestUrl.includes(
          "/api/auth/refresh-tokens",
        );
        const isPublicAuthEndpoint =
          /\/api\/auth\/(login|register|register-dealership|verify-email|resend-otp|forgot-password|reset-password)/.test(
            requestUrl,
          );

        if (error.response?.status === 401 && typeof window !== "undefined") {
          // Never refresh for auth endpoints that are expected to be unauthenticated
          // or explicitly marked to skip refresh. This prevents login/signup flows
          // from being polluted by refresh-token errors.
          if (skipAuthRefresh || isPublicAuthEndpoint) {
            return Promise.reject(error);
          }

          // Prevent retrying the refresh-tokens endpoint itself
          if (isRefreshEndpoint) {
            // Refresh failed — clear the token and let the auth provider handle redirect
            (window as any).__AUTH_TOKEN__ = null;
            return Promise.reject(error);
          }

          if (originalRequest._retry) {
            return Promise.reject(error);
          }

          originalRequest._retry = true;

          if (isRefreshing) {
            // Another request is already refreshing — queue this one
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          isRefreshing = true;

          try {
            const refreshResponse = await axios.post(
              `${API_URL}/api/auth/refresh-tokens`,
              {},
              { withCredentials: true },
            );

            const newToken =
              refreshResponse.data?.data?.accessToken ||
              refreshResponse.data?.accessToken;

            if (!newToken) throw new Error("No token in refresh response");

            // Update the global token store
            (window as any).__AUTH_TOKEN__ = newToken;

            // Notify queued requests
            processQueue(null, newToken);

            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed — clear token and reject all queued requests
            processQueue(refreshError, null);
            (window as any).__AUTH_TOKEN__ = null;
            console.error(
              "[apiClient] Token refresh failed. User may need to re-login.",
            );

            // Trigger global logout if listener is registered
            if (this.onAuthFailure) {
              this.onAuthFailure();
            }

            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        // Handle org suspension redirect
        if (error.response?.status === 403) {
          const msg = error.response.data?.message || "";
          if (msg.includes("Suspended") && typeof window !== "undefined") {
            window.location.href = "/suspended";
          }
        }

        if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
          const attemptedUrl = `${error.config?.baseURL}${error.config?.url}`;
          console.error("[apiClient] NETWORK ERROR");
          console.error("   Attempted URL:", attemptedUrl);
          console.error("   This means: Cannot reach backend server");
          console.error(
            "   Check: Is backend running on http://localhost:5000?",
          );
        } else if (error.response) {
          console.error(
            `[apiClient] Server responded with ${error.response.status}:`,
            error.response.data,
          );
        } else {
          console.error("[apiClient] Error:", error.message);
        }

        return Promise.reject(error);
      },
    );
  }

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  // Extended timeout (120s) for long-running operations like Gmail sync.
  // Now uses the primary client to ensure interceptors (Tokens/Retry) are applied.
  async syncPost<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, {
      ...config,
      timeout: 120000, // Explicitly set long timeout for sync operations
    });
  }

  // ── Organization Methods ─────────────────────────────────────────────────
  async createOrganization(
    data: { name: string; slug: string },
    config?: AxiosRequestConfig,
  ) {
    return this.post("/api/organizations", data, config);
  }

  async getOrganization(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/organizations/${id}`, config);
  }

  async updateOrganization(id: string, data: any, config?: AxiosRequestConfig) {
    return this.patch(`/api/organizations/${id}`, data, config);
  }

  async getUserOrganizations(config?: AxiosRequestConfig) {
    return this.get("/api/users/me/organizations", config);
  }

  async selectOrganization(
    organizationId: string,
    config?: AxiosRequestConfig,
  ) {
    return this.post("/api/users/me/select-org", { organizationId }, config);
  }

  async getMembers(id: string, config?: AxiosRequestConfig) {
    return this.get(`/api/organizations/${id}/members`, config);
  }

  async removeMember(
    orgId: string,
    userId: string,
    config?: AxiosRequestConfig,
  ) {
    return this.delete(`/api/organizations/${orgId}/members/${userId}`, config);
  }

  // ── Invitation Methods ───────────────────────────────────────────────────
  async sendInvite(
    data: { email: string; role: string },
    config?: AxiosRequestConfig,
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
    config?: AxiosRequestConfig,
  ) {
    return this.post("/api/driver-requests", data, config);
  }

  async getDriverRequestStatus(config?: AxiosRequestConfig) {
    return this.get("/api/driver-requests/my-status", config);
  }

  async getDriverRequests(
    params?: { status?: string },
    config?: AxiosRequestConfig,
  ) {
    return this.get("/api/driver-requests", { ...config, params });
  }

  async approveDriverRequest(id: string, config?: AxiosRequestConfig) {
    return this.patch(`/api/driver-requests/${id}/approve`, {}, config);
  }

  async rejectDriverRequest(id: string, config?: AxiosRequestConfig) {
    return this.patch(`/api/driver-requests/${id}/reject`, {}, config);
  }

  // ── Auth Methods ─────────────────────────────────────────────────────────
  // ── Dashboard Methods ────────────────────────────────────────────────────
  async getDashboardMetrics(
    params: { period?: string; month?: string },
    config?: AxiosRequestConfig,
  ) {
    return this.get("/api/dashboard/metrics", { ...config, params });
  }

  async getLeaderboard(
    params: { page?: number; limit?: number },
    config?: AxiosRequestConfig,
  ) {
    return this.get("/api/dashboard/leaderboard", { ...config, params });
  }

  // ── Team Pulse Methods ───────────────────────────────────────────────────
  async getTeamMembers(config?: AxiosRequestConfig) {
    return this.get("/api/team-pulse/members", config);
  }

  async getTeamAbsences(
    params: { year?: number; month?: number },
    config?: AxiosRequestConfig,
  ) {
    return this.get("/api/team-pulse/absences", { ...config, params });
  }

  async createAbsence(
    data: { date: string; type: string; note?: string },
    config?: AxiosRequestConfig,
  ) {
    return this.post("/api/team-pulse/absences", data, config);
  }

  async updateAbsence(
    id: string,
    data: { title?: string; note?: string; otherText?: string },
    config?: AxiosRequestConfig,
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
    data: { content: string; color?: string; title?: string; durationDays?: number | null; announcementType?: string; emoji?: string },
    config?: AxiosRequestConfig,
  ) {
    return this.post("/api/team-pulse/board", data, config);
  }

  async deleteBoardNote(id: string, config?: AxiosRequestConfig) {
    return this.delete(`/api/team-pulse/board/${id}`, config);
  }

  async updateBoardNote(
    id: string,
    data: { title?: string; content?: string; color?: string; emoji?: string },
    config?: AxiosRequestConfig,
  ) {
    return this.patch(`/api/team-pulse/board/${id}`, data, config);
  }

  async togglePinBoardNote(id: string, config?: AxiosRequestConfig) {
    return this.patch(`/api/team-pulse/board/${id}/pin`, {}, config);
  }

  async reorderBoardNotes(orderedIds: string[], config?: AxiosRequestConfig) {
    return this.patch("/api/team-pulse/board/reorder", { orderedIds }, config);
  }

  async getTeamMemberProfile(userId: string, config?: AxiosRequestConfig) {
    return this.get(`/api/users/profile/${userId}`, config);
  }

  async updateOnlineStatus(
    data: { status: string; customStatus?: string },
    config?: AxiosRequestConfig,
  ) {
    return this.patch("/api/profile/online-status", data, config);
  }

  async completeOnboarding(role: string, config?: AxiosRequestConfig) {
    return this.post("/api/auth/complete-onboarding", { role }, config);
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
    config?: AxiosRequestConfig,
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
    config?: AxiosRequestConfig,
  ) {
    return this.post("/api/customer/leads/inquiry", data, config);
  }

  async submitFinanceApplication(
    data: {
      vehicleId: string;
      personalInfo: any;
      employmentInfo: any;
    },
    config?: AxiosRequestConfig,
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
    config?: AxiosRequestConfig,
  ) {
    return this.post("/api/admin/broadcast-push", data, config);
  }

  setOnAuthFailure(callback: () => void) {
    this.onAuthFailure = callback;
  }
}

export const apiClient = new ApiClient();
