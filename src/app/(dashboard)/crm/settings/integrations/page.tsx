"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Loader2, ArrowLeft,
    Users, ShieldCheck, ChevronRight, Lock, Mail, Link as LinkIcon, Replace, CheckCircle2,

    AlertTriangle, Copy, Key, RefreshCw, HeartHandshake, Building2, Star, Plus, X, MapPin, MessageCircle

} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { useAlert } from "@/components/AlertDialog";

interface CrmUserData {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  organizationId?: string;
}

interface ReviewLinkRow {
  location: string;
  url: string;
}

interface OrgLeadConfig {
  gmailConnected: boolean;
  calendarConnected: boolean;
  gmailAddress?: string;
  leadSourceEmail?: string;
  webhookSecret?: string;
  hasWebhookSecret?: boolean;
  webhookUrl?: string;
  lastSyncAt?: string;
}

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = React.useRef(getToken);
  React.useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const [user, setUser] = React.useState<CrmUserData | null>(null);
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  const [config, setConfig] = React.useState<OrgLeadConfig | null>(null);
  const [sourceEmailInput, setSourceEmailInput] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [copiedField, setCopiedField] = React.useState<"webhook" | "secret" | null>(null);
  const [reviewLinkInput, setReviewLinkInput] = React.useState("");
  const [savedReviewLink, setSavedReviewLink] = React.useState("");
  const [reviewLinksInput, setReviewLinksInput] = React.useState<ReviewLinkRow[]>([]);
  const [savedReviewLinksSnapshot, setSavedReviewLinksSnapshot] = React.useState("[]");
  const [isSavingReviewLink, setIsSavingReviewLink] = React.useState(false);
  const [vehicleLocations, setVehicleLocations] = React.useState<string[]>([]);
  const [webchatEnabled, setWebchatEnabled] = React.useState(true);
  const [savedWebchatEnabled, setSavedWebchatEnabled] = React.useState(true);
  const [webchatGreeting, setWebchatGreeting] = React.useState("");
  const [savedWebchatGreeting, setSavedWebchatGreeting] = React.useState("");
  const [isSavingWebchat, setIsSavingWebchat] = React.useState(false);
  const { confirm, AlertComponent } = useAlert();

  React.useEffect(() => {
    const init = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) {
        router.replace("/crm");
        return;
      }
      try {
        const res = await apiClient.get("/api/crm/me", {
          headers: { Authorization: `Bearer ${t}` },
        });
        const data = res.data?.data || res.data;
        setUser(data);
        setToken(t);

        const confRes = await apiClient.get("/api/org-lead/config", {
          headers: { Authorization: `Bearer ${t}` },
        });
        const configData = confRes.data?.data || confRes.data;
        setConfig(configData);
        if (configData.leadSourceEmail) {
          setSourceEmailInput(configData.leadSourceEmail);
        }

        try {
          const settingsRes = await apiClient.get("/api/crm/org-settings", {
            headers: { Authorization: `Bearer ${t}` },
          });
          const settingsData = settingsRes.data?.data || settingsRes.data;
          const link = settingsData?.reviewLink || "";
          const links: ReviewLinkRow[] = Array.isArray(settingsData?.reviewLinks)
            ? settingsData.reviewLinks
            : [];
          setReviewLinkInput(link);
          setSavedReviewLink(link);
          setReviewLinksInput(links);
          setSavedReviewLinksSnapshot(JSON.stringify(links));
          const enabled = settingsData?.webchatEnabled !== false;
          const greeting = settingsData?.webchatGreeting || "";
          setWebchatEnabled(enabled);
          setSavedWebchatEnabled(enabled);
          setWebchatGreeting(greeting);
          setSavedWebchatGreeting(greeting);
        } catch (settingsError) {
          console.error("Failed to fetch organization settings:", settingsError);
        }

        try {
          const mainToken = await getTokenRef.current();
          const filtersRes = await apiClient.get("/api/vehicles/filters", {
            headers: { Authorization: `Bearer ${mainToken}` },
          });
          const filtersData = filtersRes.data?.data || filtersRes.data;
          setVehicleLocations(Array.isArray(filtersData?.locations) ? filtersData.locations : []);
        } catch (filtersError) {
          console.error("Failed to fetch vehicle locations:", filtersError);
        }
      } catch (error) {
        console.error("Initialization failed:", error);
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        router.replace("/crm");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router]);

  const handleConnectGmail = async () => {
    try {
      const res = await apiClient.get("/api/org-lead/auth", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { authUrl } = res.data?.data || res.data;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast.error("Connection Failed", {
          description:
            "Failed to generate authorization URL. Please try again later.",
        });
      }
    } catch (error) {
      console.error("OAuth init failed:", error);
      toast.error("Connection Failed", {
        description:
          "Could not connect to Google. Please check your internet connection and try again.",
      });
    }
  };

  const fetchConfig = async () => {
    try {
      const t = await getToken();
      const confRes = await apiClient.get("/api/org-lead/config", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const configData = confRes.data?.data || confRes.data;
      setConfig(configData);
      if (configData.leadSourceEmail) {
        setSourceEmailInput(configData.leadSourceEmail);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

  const handleManualSync = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient.post(
        "/api/org-lead/sync",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.data?.data;
      toast.success("Synchronization Complete", {
        description: `Leads pulled: ${data?.leads?.synced || 0}. Calendar events: ${data?.calendar?.processed || 0}.`,
      });
    } catch (error: any) {
      console.error("Manual sync failed:", error);
      toast.error("Synchronization Failed", {
        description:
          error.response?.data?.message ||
          "Please check your organization connection and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

    const handleDisconnectGmail = async () => {
        if (!isAdmin) return
        await confirm(
            "Disconnect Google?",
            "Are you sure you want to disconnect Google? This will stop all automated lead and calendar synchronization for the workspace.",
            async () => {
                setIsSaving(true)
                try {
                    const t = await getToken()
                    await apiClient.post("/api/org-lead/disconnect", {}, { headers: { Authorization: `Bearer ${t}` } })
                    toast.success("Disconnected successfully", {
                        description: "Google Gmail and Calendar have been disconnected from this workspace."
                    })
                    fetchConfig()
                } catch (error: any) {
                    console.error("Disconnect failed:", error)
                    toast.error("Failed to disconnect", {
                        description: error.response?.data?.message || "An error occurred while trying to disconnect. Please try again."
                    })
                } finally {
                    setIsSaving(false)
                }
            },
            "Disconnect",
        )
    }

    const handleSaveSourceEmail = async () => {
        if (!isAdmin) return
        setIsSaving(true)
        try {
            await apiClient.patch("/api/org-lead/config", { leadSourceEmail: sourceEmailInput }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success("Lead source updated", {
                description: `Leads will now be filtered from: ${sourceEmailInput}`
            })
            fetchConfig()
        } catch (error: any) {
            console.error("Update failed:", error)
            toast.error("Update failed", {
                description: error.response?.data?.message || "Could not update the lead source email. Please try again."
            })
        } finally {
            setIsSaving(false)
        }
    }

    const addReviewLinkRow = () => {
        setReviewLinksInput(prev => [...prev, { location: "", url: "" }])
    }

    const updateReviewLinkRow = (index: number, field: keyof ReviewLinkRow, value: string) => {
        setReviewLinksInput(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
    }

    const removeReviewLinkRow = (index: number) => {
        setReviewLinksInput(prev => prev.filter((_, i) => i !== index))
    }

    const reviewSettingsDirty =
        reviewLinkInput.trim() !== savedReviewLink ||
        JSON.stringify(reviewLinksInput) !== savedReviewLinksSnapshot

    const handleSaveReviewLink = async () => {
        if (!isAdmin) return
        setIsSavingReviewLink(true)
        try {
            const t = await getToken()
            const cleanedRows = reviewLinksInput
                .map(row => ({ location: row.location.trim(), url: row.url.trim() }))
                .filter(row => row.location && row.url)
            const res = await apiClient.patch(
                "/api/crm/org-settings",
                { reviewLink: reviewLinkInput.trim(), reviewLinks: cleanedRows },
                { headers: { Authorization: `Bearer ${t}` } },
            )
            const saved = res.data?.data || res.data
            const savedLinks: ReviewLinkRow[] = Array.isArray(saved?.reviewLinks) ? saved.reviewLinks : cleanedRows
            setSavedReviewLink(reviewLinkInput.trim())
            setReviewLinksInput(savedLinks)
            setSavedReviewLinksSnapshot(JSON.stringify(savedLinks))
            toast.success("Review settings saved", {
                description: savedLinks.length > 0
                    ? `Using ${savedLinks.length} location-specific link${savedLinks.length > 1 ? "s" : ""}, plus the default.`
                    : reviewLinkInput.trim()
                        ? "Completed-appointment texts will now include the default link."
                        : "Review request texts will no longer include a link."
            })
        } catch (error) {
            console.error("Failed to save review settings:", error)
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error("Save failed", {
                description: message || "Could not save the review settings. Please try again."
            })
        } finally {
            setIsSavingReviewLink(false)
        }
    }

    const webchatSettingsDirty =
        webchatEnabled !== savedWebchatEnabled || webchatGreeting.trim() !== savedWebchatGreeting

    const handleSaveWebchatSettings = async () => {
        if (!isAdmin) return
        setIsSavingWebchat(true)
        try {
            const t = await getToken()
            await apiClient.patch(
                "/api/crm/org-settings",
                { webchatEnabled, webchatGreeting: webchatGreeting.trim() },
                { headers: { Authorization: `Bearer ${t}` } },
            )
            setSavedWebchatEnabled(webchatEnabled)
            setSavedWebchatGreeting(webchatGreeting.trim())
            toast.success("Webchat settings saved", {
                description: webchatEnabled
                    ? "The chat widget is live on your public vehicle pages."
                    : "The chat widget is now hidden from visitors."
            })
        } catch (error) {
            console.error("Failed to save webchat settings:", error)
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error("Save failed", {
                description: message || "Could not save the webchat settings. Please try again."
            })
        } finally {
            setIsSavingWebchat(false)
        }
    }

    const handleGenerateSecret = async () => {
        if (!isAdmin) return
        try {
            const res = await apiClient.post("/api/org-lead/config/secret", {}, { headers: { Authorization: `Bearer ${token}` } })
            const { webhookSecret } = res.data?.data || res.data
            setConfig(prev => prev ? { ...prev, webhookSecret, hasWebhookSecret: true } : null)
            toast.success("New secret generated", {
                description: "Your webhook HMAC secret has been updated. Copy it now."
            })
        } catch (error: any) {
            console.error("Secret generation failed:", error)
            toast.error("Generation failed", {
                description: "Could not generate a new webhook secret. Please try again."
            })
        }
    }

    const copyToClipboard = async (value: string | undefined, field: "webhook" | "secret", label: string) => {
        const text = value?.trim()
        if (!text) {
            toast.error(`${label} is empty`, {
                description: "Generate or load the value first, then try copying again."
            })
            return
        }

        try {
            if (navigator.clipboard?.writeText && window.isSecureContext) {
                await navigator.clipboard.writeText(text)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = text
                textArea.setAttribute("readonly", "")
                textArea.style.position = "fixed"
                textArea.style.left = "-9999px"
                textArea.style.top = "0"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                const copied = document.execCommand("copy")
                document.body.removeChild(textArea)
                if (!copied) throw new Error("Copy command failed")
            }

            setCopiedField(field)
            window.setTimeout(() => setCopiedField(null), 2000)
            toast.success("Copied to clipboard", {
                description: `${label} is ready to paste.`
            })
        } catch (error) {
            console.error(`Failed to copy ${label}:`, error)
            toast.error("Copy failed", {
                description: `Could not copy the ${label}. Please select and copy it manually.`
            })
        }
    }

    const isAdmin = user?.role === "admin"

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground/40 tracking-widest uppercase">Loading</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="min-h-screen w-full bg-background">
            { }
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/crm/dashboard")} className="h-9 w-9 p-0 rounded-xl border border-border/40 hover:bg-muted/50 shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Settings</h1>
                        <p className="text-xs text-muted-foreground/40 mt-0.5 truncate">Manage your CRM workspace</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 px-2 rounded-full capitalize font-semibold ml-auto hidden sm:inline-flex shrink-0">
                        {user.role}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    { }
                    <div className="lg:col-span-3">
                        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                            <div className="px-4 py-3 border-b border-border/30">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Navigation</p>
                            </div>
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => router.push("/crm/settings")}
                                    className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Users className="h-3.5 w-3.5" />
                                        User Management
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                                </button>
                                <button
                                    onClick={() => router.push("/crm/settings/departments")}
                                    className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Building2 className="h-3.5 w-3.5" />
                                        Departments
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                                </button>
                                <button
                                    onClick={() => router.push("/crm/settings/integrations")}
                                    className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold bg-emerald-500/10 text-emerald-600"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Lock className="h-3.5 w-3.5" />
                                        Lead Integrations
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ShieldCheck className="h-3 w-3 text-emerald-500/40" />
                                        <ChevronRight className="h-3 w-3 text-emerald-500/40" />
                                    </div>
                                </button>
                                <button
                                    onClick={() => router.push("/crm/hr")}
                                    className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <HeartHandshake className="h-3.5 w-3.5" />
                                        Team Engagement
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                                </button>
                            </div>
                        </div>
                    </div>

                    { }
                    <div className="lg:col-span-9 space-y-4">

                        { }
                        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/10">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Mail className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-base font-bold truncate">Sync Leads via Email</p>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5">Connect a Google Workspace account to parse leads automatically.</p>
                                    </div>
                                </div>
                                {config?.gmailConnected && (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none pointer-events-none gap-1.5 shrink-0">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                    </Badge>
                                )}
                            </div>

                            <div className="p-4 sm:p-6 space-y-6">
                                {!isAdmin && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                        <p className="text-sm text-amber-500/90 leading-relaxed">Only workspace admins can modify lead integrations. Please contact administration for access to connect.</p>
                                    </div>
                                )}

                                <div className="space-y-4 max-w-xl">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">Lead Source Email</label>
                                        <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-md">What email address do your leads come from? The system will only read emails from this exactly matched sender.</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <input
                                                disabled={!isAdmin || config?.gmailConnected || isSaving}
                                                className="flex-1 h-10 rounded-xl border border-border/50 bg-background px-4 text-sm outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
                                                value={sourceEmailInput}
                                                onChange={e => setSourceEmailInput(e.target.value)}
                                                placeholder="e.g. leads@dealerscloud.com"
                                            />
                                            {isAdmin && !config?.gmailConnected && (
                                                <Button
                                                    onClick={handleSaveSourceEmail}
                                                    disabled={isSaving || sourceEmailInput === config?.leadSourceEmail}
                                                    className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                                                >
                                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {config?.gmailConnected ? (
                                        <div className="space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-emerald-600 truncate">{config.gmailAddress || 'account@gmail.com'} Connected</p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${config.calendarConnected ? 'border-emerald-500/30 text-emerald-600' : 'border-amber-500/30 text-amber-600'}`}>
                                                            Calendar {config.calendarConnected ? 'Connected' : 'Not Connected'}
                                                        </Badge>
                                                        <p className="text-[11px] text-emerald-600/70">Last synced: {config.lastSyncAt || 'Just now'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        onClick={handleManualSync}
                                                        disabled={isSaving}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-xs font-semibold border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700"
                                                    >
                                                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
                                                        Sync Now
                                                    </Button>
                                                    <Button
                                                        onClick={handleDisconnectGmail}
                                                        disabled={isSaving || !isAdmin}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-xs font-semibold border-border/50 bg-background hover:bg-muted/50 text-foreground"
                                                    >
                                                        Disconnect
                                                    </Button>
                                                </div>
                                            </div>
                                            {!config.calendarConnected && (
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-500/20 italic">
                                                    Note: Calendar sync requires re-connecting your Google account to grant new permissions.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <Button
                                            disabled={!isAdmin}
                                            onClick={handleConnectGmail}
                                            className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm gap-2 shadow-sm shadow-blue-600/20 w-fit"
                                        >
                                            <LinkIcon className="h-4 w-4" />
                                            Connect Google Workspace
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        { }
                        <div className="rounded-2xl border border-border/30 bg-muted/20 overflow-hidden mt-6">
                            <div className="px-4 sm:px-6 py-4 border-b border-border/30 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Replace className="h-4 w-4 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold opacity-80">Advanced: Real-Time Webhooks (ADF)</p>
                                    <p className="text-[11px] text-muted-foreground/50 mt-0.5">Receive leads instantly from compatible CRMs without waiting for email sync.</p>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                {!config?.hasWebhookSecret && !config?.webhookSecret ? (
                                    <div className="text-center py-6">
                                        <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto mb-4 leading-relaxed">Webhooks allow providers to POST leads directly to your workspace. Generate a secret key to secure your endpoint.</p>
                                        <Button
                                            disabled={!isAdmin}
                                            onClick={handleGenerateSecret}
                                            className="h-9 rounded-xl bg-foreground text-background font-semibold text-xs shadow-sm"
                                        >
                                            Generate Webhook Secret
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-5 max-w-xl">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-foreground opacity-70">Webhook URL</label>
                                            <div className="flex items-start gap-2">
                                                <code className="flex-1 text-[11px] bg-background border border-border/40 rounded-lg px-3 py-2.5 text-orange-400 font-mono break-all">
                                                    POST {config.webhookUrl || `https://api.actionauto.com/api/leads/adf?orgId=${user.username}`}
                                                </code>
                                                <Button
                                                    type="button"
                                                    onClick={() => copyToClipboard(config.webhookUrl || `https://api.actionauto.com/api/leads/adf?orgId=${user.username}`, "webhook", "Webhook URL")}
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-10 w-10 shrink-0 rounded-lg border-border/40 hover:bg-muted/50"
                                                    title="Copy Webhook URL"
                                                    aria-label="Copy Webhook URL"
                                                >
                                                    {copiedField === "webhook" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-foreground opacity-70">HMAC Secret Key</label>
                                            <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-sm mb-2">Provide this secret to your lead vendor. They must sign every request with this key.</p>

                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-[11px] bg-background border border-border/40 rounded-lg px-3 py-2.5 text-emerald-400 font-mono truncate">
                                                    {config.webhookSecret}
                                                </code>
                                                <Button
                                                    type="button"
                                                    onClick={() => copyToClipboard(config.webhookSecret, "secret", "HMAC Secret Key")}
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-10 w-10 shrink-0 rounded-lg border-border/40 hover:bg-muted/50"
                                                    title="Copy HMAC Secret Key"
                                                    aria-label="Copy HMAC Secret Key"
                                                >
                                                    {copiedField === "secret" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <Button
                                            disabled={!isAdmin}
                                            onClick={handleGenerateSecret}
                                            variant="outline"
                                            size="sm"
                                            className="h-8 rounded-lg mt-2 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border-border/40 border-dashed transition-colors gap-2"
                                        >
                                            <Key className="h-3 w-3" />
                                            Regenerate Key
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        { }
                        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden mt-6">
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/10">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                        <Star className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-base font-bold truncate">Review Requests</p>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5">After a completed appointment, we text and email the customer asking for a review.</p>
                                    </div>
                                </div>
                                {savedReviewLink && (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none pointer-events-none gap-1.5 shrink-0">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Link set
                                    </Badge>
                                )}
                            </div>

                            <div className="p-4 sm:p-6 space-y-4">
                                {!isAdmin && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                        <p className="text-sm text-amber-500/90 leading-relaxed">Only workspace admins can modify the review link.</p>
                                    </div>
                                )}
                                <div className="space-y-1.5 max-w-xl">
                                    <label className="text-sm font-semibold text-foreground">Default review link</label>
                                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-md">Paste your dealership&apos;s Google Business review link. Leaving this blank still sends a text asking how it went, just without a direct link.</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <input
                                            disabled={!isAdmin || isSavingReviewLink}
                                            className="flex-1 h-10 rounded-xl border border-border/50 bg-background px-4 text-sm outline-none focus:border-amber-500/50 transition-colors disabled:opacity-50"
                                            value={reviewLinkInput}
                                            onChange={e => setReviewLinkInput(e.target.value)}
                                            placeholder="https://g.page/r/your-dealership/review"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 max-w-xl pt-2 border-t border-border/30">
                                    <div className="flex items-center gap-1.5 pt-3">
                                        <MapPin className="h-3.5 w-3.5 text-amber-500" />
                                        <label className="text-sm font-semibold text-foreground">Location-specific links (optional)</label>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-md">
                                        Route the review link by which lot the vehicle came from — matched against the location already on each vehicle&apos;s listing. Falls back to the default link above when there&apos;s no match.
                                    </p>

                                    <datalist id="vehicle-location-options">
                                        {vehicleLocations.map(loc => <option key={loc} value={loc} />)}
                                    </datalist>

                                    <div className="space-y-2 mt-2">
                                        {reviewLinksInput.map((row, index) => (
                                            <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                <input
                                                    disabled={!isAdmin || isSavingReviewLink}
                                                    className="w-full sm:w-40 h-10 rounded-xl border border-border/50 bg-background px-3 text-sm outline-none focus:border-amber-500/50 transition-colors disabled:opacity-50"
                                                    value={row.location}
                                                    onChange={e => updateReviewLinkRow(index, "location", e.target.value)}
                                                    placeholder="e.g. Lehi"
                                                    list="vehicle-location-options"
                                                />
                                                <input
                                                    disabled={!isAdmin || isSavingReviewLink}
                                                    className="flex-1 h-10 rounded-xl border border-border/50 bg-background px-4 text-sm outline-none focus:border-amber-500/50 transition-colors disabled:opacity-50"
                                                    value={row.url}
                                                    onChange={e => updateReviewLinkRow(index, "url", e.target.value)}
                                                    placeholder="https://g.page/r/lehi-location/review"
                                                />
                                                {isAdmin && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={isSavingReviewLink}
                                                        onClick={() => removeReviewLinkRow(index)}
                                                        className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                        aria-label="Remove this location"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {isAdmin && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isSavingReviewLink}
                                            onClick={addReviewLinkRow}
                                            className="h-8 rounded-lg text-xs font-semibold border-dashed gap-1.5 mt-1"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add location
                                        </Button>
                                    )}
                                </div>

                                {isAdmin && (
                                    <div className="pt-2">
                                        <Button
                                            onClick={handleSaveReviewLink}
                                            disabled={isSavingReviewLink || !reviewSettingsDirty}
                                            className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                                        >
                                            {isSavingReviewLink ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save review settings"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        { }
                        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden mt-6">
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/10">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                                        <MessageCircle className="h-5 w-5 text-cyan-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-base font-bold truncate">Website Chat</p>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5">The chat bubble on your public vehicle pages.</p>
                                    </div>
                                </div>
                                <Badge className={webchatEnabled ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none pointer-events-none gap-1.5 shrink-0" : "bg-muted text-muted-foreground shadow-none border-none pointer-events-none shrink-0"}>
                                    {webchatEnabled ? "Live" : "Hidden"}
                                </Badge>
                            </div>

                            <div className="p-4 sm:p-6 space-y-4">
                                {!isAdmin && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                        <p className="text-sm text-amber-500/90 leading-relaxed">Only workspace admins can modify webchat settings.</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-3 max-w-xl">
                                    <div className="min-w-0">
                                        <label className="text-sm font-semibold text-foreground">Show the chat bubble</label>
                                        <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-md mt-0.5">Turn this off to hide the chat widget from every visitor, without changing anything else.</p>
                                    </div>
                                    <Switch
                                        checked={webchatEnabled}
                                        onCheckedChange={setWebchatEnabled}
                                        disabled={!isAdmin || isSavingWebchat}
                                    />
                                </div>

                                <div className="space-y-1.5 max-w-xl">
                                    <label className="text-sm font-semibold text-foreground">Greeting message</label>
                                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-md">Shown to visitors before your team replies. Leave blank to use the default greeting.</p>
                                    <Textarea
                                        disabled={!isAdmin || isSavingWebchat}
                                        value={webchatGreeting}
                                        onChange={e => setWebchatGreeting(e.target.value)}
                                        rows={2}
                                        maxLength={300}
                                        placeholder="Thanks for reaching out! A team member will reply here soon."
                                        className="resize-none"
                                    />
                                </div>

                                {isAdmin && (
                                    <div className="pt-2">
                                        <Button
                                            onClick={handleSaveWebchatSettings}
                                            disabled={isSavingWebchat || !webchatSettingsDirty}
                                            className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                                        >
                                            {isSavingWebchat ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save webchat settings"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
            <AlertComponent />
        </div>
    )
}
