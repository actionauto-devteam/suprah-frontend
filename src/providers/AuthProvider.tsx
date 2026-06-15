"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { UpdateProfileRequest } from "@/types/user";
import { sanitizeRedirectUrl } from "@/lib/navigation";

// --- TYPES & INTERFACES (Action Auto Security) ---
export interface AuthUser {
  _id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  avatarUrl?: string;
  role: string;
  organizationId?: string;
  organizationRole?: string;
  isActive: boolean;
  isApproved: boolean;
  onboardingCompleted: boolean;
  theme?: "light" | "dark";
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  organizationId: string | null;
  organizationRole: string | null;
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  getToken: () => Promise<string | null>;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  signUpState: any;
  setSignUpState: (state: any) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Module-level variable to track ongoing refresh requests across all hooks/components
let globalRefreshPromise: Promise<string | null> | null = null;

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/upgrade",
  "/auth/callback",
  "/verify-email",
  "/accept-invite",
  "/vehicle",
  "/referral",
  "/offline",
  "/support",
];

const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.some((r) => path.startsWith(r));
};

const isMissingRefreshTokenError = (err: any) => {
  const message =
    err?.response?.data?.message ||
    err?.message ||
    err?.errors?.[0]?.longMessage ||
    "";

  return (
    typeof message === "string" &&
    /(refresh token missing|no refresh token|missing refresh token)/i.test(
      message,
    )
  );
};

// --- PROVIDER COMPONENT ---

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [signUpState, setSignUpState] = useState<any>({ status: "missing" });
  const router = useRouter();

  const setAccessToken = useCallback((token: string | null) => {
    if (typeof window !== 'undefined') {
      (window as any).__AUTH_TOKEN__ = token;

      // Sync to IndexedDB for Service Worker access
      try {
        const request = indexedDB.open('action-auto-auth', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('tokens')) {
            db.createObjectStore('tokens');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('tokens', 'readwrite');
          const store = tx.objectStore('tokens');
          if (token) {
            store.put(token, 'accessToken');
          } else {
            store.delete('accessToken');
          }
        };
      } catch (e) {
        console.warn('[Auth] IndexedDB sync failed', e);
      }
    }
    setAccessTokenState(token);
  }, []);

  // 1. Initial Load: Check if we have a valid session (via refresh token cookie)
  const refreshUser = useCallback(async () => {
    try {
      // Attempt silent refresh if we don't have a token in memory
      let currentToken = null;
      if (typeof window !== "undefined") {
        currentToken = (window as any).__AUTH_TOKEN__;
      }

      if (!currentToken) {
        // Check if a refresh is already in progress globally
        if (globalRefreshPromise) {
          currentToken = await globalRefreshPromise;
        } else {
          globalRefreshPromise = (async () => {
            try {
              const tokenRes = await apiClient.post("/api/auth/refresh-tokens");
              const token =
                tokenRes.data?.data?.accessToken || tokenRes.data?.accessToken;
              return token || null;
            } catch (err) {
              if (!isMissingRefreshTokenError(err)) {
                console.error(
                  "[AuthProvider] Global refresh failed (Silent Refresh)",
                );
              }
              return null;
            } finally {
              globalRefreshPromise = null;
            }
          })();
          currentToken = await globalRefreshPromise;
        }

        if (currentToken) {
          setAccessToken(currentToken);
        } else {
          setUser(null);
          setAccessToken(null);
          setIsLoaded(true);
          return;
        }
      }

      const response = await apiClient.get("/api/users/me");
      if (response.data?.success || response.data?.data) {
        let userData = response.data.data || response.data;
        if (process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true" && typeof window !== "undefined") {
          const devRoleOverride = localStorage.getItem("dev_role_override");
          if (devRoleOverride) userData = { ...userData, role: devRoleOverride };
        }
        setUser(userData);

        const token =
          response.data?.data?.accessToken || response.data?.accessToken;
        if (token) {
          setAccessToken(token);
        }
      } else {
        setUser(null);
        setAccessToken(null);
      }
    } catch (error) {
      console.error("[AuthProvider] Refresh error:", error);
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoaded(true);
    }
  }, [setAccessToken]);

  // Centralized Redirection Engine
  useEffect(() => {
    if (!isLoaded) return;

    const path = window.location.pathname;
    const search = window.location.search;
    const isPublic = isPublicRoute(path);
    const hasInviteToken = search.includes("token=");

    // CASE 1: NOT SIGNED IN
    if (!user) {
      // FORCE REDIRECT for all non-public routes, including the root path
      if (!isPublic) {
        router.push("/sign-in" + search);
      }
      return;
    }

    // CASE 2: SIGNED IN - GLOBAL GUARDS

    // 1. Force Email Verification
    if (!user.emailVerified && !isPublic) {
      router.push(`/verify-email?email=${encodeURIComponent(user.email)}`);
      return;
    }

    // 2. Force Onboarding (Role Selection)
    if (!user.onboardingCompleted) {
      if (
        !isPublic &&
        !hasInviteToken &&
        path !== "/onboarding/role-selection"
      ) {
        router.push("/onboarding/role-selection");
        return;
      }
      // If they are on a public page (like /auth/callback), don't force them yet
      // This prevents loops during the initial callback dance.
      if (isPublic) return;
    }

    // 3. Prevent Logged-in users from hitting Auth pages (Sign-in/Sign-up)
    if (isPublic && (path === "/sign-in" || path === "/sign-up")) {
      const params = new URLSearchParams(search);
      const redirectUrl = sanitizeRedirectUrl(params.get("redirect_url"));

      if (redirectUrl) {
        router.push(redirectUrl);
        return;
      }

      // Default redirects based on role
      if (user.role === "customer") router.push("/customer");
      else if (user.role === "driver") router.push("/driver");
      else if (user.role === "super_admin") router.push("/admin/dashboard");
      else if (user.role === "admin" && !user.organizationId)
        router.push("/org-selection");
      else router.push("/");
      return;
    }

    // 4. Forced Org Selection for Admins
    if (
      !isPublic &&
      !hasInviteToken &&
      user.role === "admin" &&
      !user.organizationId &&
      path !== "/org-selection"
    ) {
      router.push("/org-selection");
      return;
    }

    // 5. Dashboard / Root Redirects
    if (path === "/") {
      if (user.role === "customer") router.push("/customer");
      else if (user.role === "driver") router.push("/driver");
      else if (user.role === "super_admin") router.push("/admin/dashboard");
      else if (user.role === "admin" && !user.organizationId)
        router.push("/org-selection");
    }
  }, [isLoaded, user, router]);

  // Redundant useEffect removed.

  // Removed redundant useEffect because setAccessToken handles this now.

  // 2. Token Management
  const getToken = useCallback(async () => {
    // Helper: decode JWT and check if it's expired (with a 30-second buffer)
    const isExpired = (token: string): boolean => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return (
          typeof payload.exp === "number" &&
          Date.now() >= payload.exp * 1000 - 30_000
        );
      } catch {
        return true;
      }
    };

    // Synchronization: Check if background refresh (via api-client interceptor)
    // has updated the global window variable.
    if (typeof window !== "undefined" && (window as any).__AUTH_TOKEN__) {
      const globalToken = (window as any).__AUTH_TOKEN__;
      // Only use it if it's still valid
      if (!isExpired(globalToken)) {
        if (globalToken !== accessToken) {
          setAccessTokenState(globalToken);
        }
        return globalToken;
      }
      // Token is expired — clear it and fall through to refresh
      (window as any).__AUTH_TOKEN__ = null;
    }

    // If in-memory token is still valid, use it
    if (accessToken && !isExpired(accessToken)) return accessToken;

    // Otherwise, proactively refresh before any API call sees a 401
    if (globalRefreshPromise) {
      return globalRefreshPromise;
    }

    try {
      globalRefreshPromise = (async () => {
        try {
          const response = await apiClient.post("/api/auth/refresh-tokens");
          const token =
            response.data?.data?.accessToken || response.data?.accessToken;
          if (token) {
            setAccessToken(token);
            return token;
          }
          return null;
        } catch (e) {
          if (!isMissingRefreshTokenError(e)) {
            console.warn("[AuthProvider] Token refresh request failed");
          }
          return null;
        } finally {
          globalRefreshPromise = null;
        }
      })();

      return await globalRefreshPromise;
    } catch (e) {
      console.warn("[AuthProvider] Failed to refresh token");
    }
    return null;
  }, [accessToken, setAccessToken]);

  // 3. Sign Out
  const signOut = useCallback(
    async (options?: { redirectUrl?: string }) => {
      try {
        await apiClient.post("/api/auth/logout");
      } catch (e) {
        // Ignore
      } finally {
        setUser(null);
        setAccessToken(null);
        router.push(options?.redirectUrl || "/sign-in");
        router.refresh();
      }
    },
    [router],
  );

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isLoaded,
      isSignedIn: !!user,
      organizationId: user?.organizationId || null,
      organizationRole: user?.organizationRole || null,
      setAccessToken,
      setUser,
      getToken,
      signOut,
      refreshUser,
      signUpState,
      setSignUpState,
    }),
    [
      user,
      accessToken,
      isLoaded,
      getToken,
      signOut,
      refreshUser,
      signUpState,
      setSignUpState,
    ],
  );

  useEffect(() => {
    refreshUser();

    // Register API failure listener
    apiClient.setOnAuthFailure(() => {
      setUser(null);
      setAccessToken(null);
      const path = window.location.pathname;
      if (!isPublicRoute(path)) {
        router.push("/sign-in");
      }
    });
  }, [refreshUser, setAccessToken, router]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- SHADOW HOOKS (Compatibility Layer) ---

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");

  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    userId: context.user?._id || null,
    orgId: context.organizationId,
    orgRole: context.organizationRole,
    getToken: context.getToken,
    signOut: context.signOut,
    refreshUser: context.refreshUser,
  };
}

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useUser must be used within an AuthProvider");

  // Standardized User object structure
  const userProxy = context.user
    ? {
      id: context.user._id,
      primaryEmailAddress: { emailAddress: context.user.email },
      emailAddresses: [{ emailAddress: context.user.email }],
      fullName: context.user.name,
      firstName:
        context.user.firstName || context.user.name?.split(" ")[0] || "",
      lastName:
        context.user.lastName ||
        context.user.name?.split(" ").slice(1).join(" ") ||
        "",
      imageUrl:
        context.user.avatar ||
        context.user.avatarUrl ||
        "/placeholder-avatar.png",
      role: context.user.role,
      onboardingCompleted: context.user.onboardingCompleted,
      theme: context.user.theme,
      publicMetadata: {},
      unsafeMetadata: {},
      update: async (data: UpdateProfileRequest) => {
        const res = await apiClient.patch("/api/users/me", data);
        context.refreshUser();
        return res.data;
      },
    }
    : null;

  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: userProxy,
  };
}

export function useAuthActions() {
  const context = useContext(AuthContext);
  const router = useRouter();
  if (!context)
    throw new Error("useAuthActions must be used within an AuthProvider");

  return {
    signOut: context.signOut,
    refreshUser: context.refreshUser,
    openUserProfile: () => router.push("/profile"),
    user: context.user,
  };
}

/**
 * useSignUp - Shadow hook for multi-step registration (used in DriverAuthForm)
 */
export function useSignUp() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useSignUp must be used within an AuthProvider");

  const { signUpState, setSignUpState } = context;

  const signUp = {
    create: async (data: any) => {
      try {
        const response = await apiClient.post("/api/auth/register", {
          email: data.emailAddress,
          password: data.password,
          name:
            `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
            data.emailAddress.split("@")[0],
          role: data.role || "customer",
          inviteToken: data.inviteToken,
          // Forward the dealership the customer selected so the backend can
          // link the new account to it (otherwise org-scoped features 403).
          organizationId: data.organizationId,
          dealershipSlug: data.dealershipSlug,
        });

        const token =
          response.data?.data?.accessToken || response.data?.accessToken;
        const userObj = response.data?.data?.user || response.data?.user;

        if (token) {
          context?.setAccessToken(token);
          context?.setUser(userObj);
          return {
            status: "complete",
            createdSessionId: "local_session",
            targetUrl: userObj?.role === "driver" ? "/driver" : "/",
          };
        }

        const emailSent = response.data?.data?.emailSent !== false;
        setSignUpState({
          emailAddress: data.emailAddress,
          firstName: data.firstName,
          lastName: data.lastName,
          status: "needs_verification",
        });

        if (!emailSent) {
          toast.warning("Account created! We couldn't send the verification email — tap \"Resend Code\" on the next screen.");
        }

        return { status: "needs_verification" };
      } catch (e: any) {
        throw {
          errors: [
            { longMessage: e.response?.data?.message || "Registration failed" },
          ],
        };
      }
    },
    createDealership: async (data: any) => {
      try {
        const response = await apiClient.post("/api/auth/register-dealership", {
          name: data.name,
          email: data.email,
          password: data.password,
          dealershipName: data.dealershipName,
          dealershipSlug: data.dealershipSlug,
        });

        const userObj = response.data?.data?.user || response.data?.user;

        setSignUpState({
          emailAddress: data.email,
          firstName: data.name,
          status: "needs_verification",
        });

        return { status: "needs_verification" };
      } catch (e: any) {
        throw {
          errors: [
            {
              longMessage:
                e.response?.data?.message || "Dealership registration failed",
            },
          ],
        };
      }
    },
    prepareEmailAddressVerification: async (params: any) => {
      try {
        const emailToVerify = params?.email || signUpState.emailAddress;
        await apiClient.post("/api/auth/resend-otp", { email: emailToVerify });
        return { status: "pending" };
      } catch (e: any) {
        throw {
          errors: [
            {
              longMessage:
                e.response?.data?.message ||
                "Failed to resend verification code",
            },
          ],
        };
      }
    },
    attemptEmailAddressVerification: async (params: any) => {
      try {
        // Use provided email or fallback to state
        const emailToVerify = params.email || signUpState.emailAddress;

        const response = await apiClient.post("/api/auth/verify-email", {
          email: emailToVerify,
          otp: params.code,
        });

        const token =
          response.data?.data?.accessToken || response.data?.accessToken;
        const userObj = response.data?.data?.user || response.data?.user;

        if (token) {
          context?.setAccessToken(token);
          context?.setUser(userObj);
          return { status: "complete", createdSessionId: "local_session" };
        }
        return { status: "failed" };
      } catch (e: any) {
        throw {
          errors: [
            { longMessage: e.response?.data?.message || "Verification failed" },
          ],
        };
      }
    },
  };

  return {
    isLoaded: true,
    signUp,
    signUpState,
    setActive: async (params: any) => {
      // In our case, setActive is handled by setAccessToken and setUser in context
      // This is just to satisfy the API
      return;
    },
  };
}

/**
 * useSignIn - Shadow hook for standard login
 */
export function useSignIn() {
  const context = useContext(AuthContext);

  const signIn = {
    create: async (data: any) => {
      try {
        const response = await apiClient.post(
          "/api/auth/login",
          {
            email: data.identifier,
            password: data.password,
          },
          { _skipAuthRefresh: true } as any,
        );

        const token =
          response.data?.data?.accessToken || response.data?.accessToken;
        const userObj = response.data?.data?.user || response.data?.user;

        if (token) {
          context?.setAccessToken(token);
          context?.setUser(userObj);

          let targetUrl = "/";
          if (userObj?.role === "customer") targetUrl = "/customer";
          else if (userObj?.role === "driver") targetUrl = "/driver";
          else if (userObj?.role === "super_admin")
            targetUrl = "/admin/dashboard";

          return {
            status: "complete",
            createdSessionId: "local_session",
            targetUrl,
          };
        }
        return { status: "needs_upgrade", factor: "password" };
      } catch (e: any) {
        if (e.response?.data?.message === "LEGACY_USER_UPGRADE_REQUIRED") {
          return { status: "needs_upgrade", factor: "otp" };
        }
        throw {
          errors: [
            { longMessage: e.response?.data?.message || "Login failed" },
          ],
        };
      }
    },
  };

  return {
    isLoaded: true,
    signIn,
    setActive: async () => { },
  };
}