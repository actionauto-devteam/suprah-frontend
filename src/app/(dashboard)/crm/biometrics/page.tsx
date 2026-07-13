"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Fingerprint,
  ScanFace,
  Shield,
  ShieldCheck,
  Key,
  Trash2,
  Plus,
  Loader2,
  ArrowLeft,
  Pencil,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  Clock,
  Smartphone,
  Monitor,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api-client"
import {
  isWebAuthnSupported,
  startRegistration,
  detectBiometricType,
} from "@/lib/webauthn"


interface BiometricCredential {
  credentialId: string
  deviceType: string
  deviceName: string
  lastUsedAt: string | null
  createdAt: string
}

interface SshKeyEntry {
  _id: string
  title: string
  fingerprint: string
  keyType: string
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}


export default function BiometricSettingsPage() {
  const router = useRouter()
  const [token, setToken] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [supported, setSupported] = React.useState(false)

  const [credentials, setCredentials] = React.useState<BiometricCredential[]>([])
  const [enrolling, setEnrolling] = React.useState(false)
  const [enrollDeviceName, setEnrollDeviceName] = React.useState("")
  const [enrollError, setEnrollError] = React.useState("")
  const [enrollSuccess, setEnrollSuccess] = React.useState("")
  const [showEnrollForm, setShowEnrollForm] = React.useState(false)

  const [sshKeys, setSshKeys] = React.useState<SshKeyEntry[]>([])
  const [showSshForm, setShowSshForm] = React.useState(false)
  const [sshTitle, setSshTitle] = React.useState("")
  const [sshPublicKey, setSshPublicKey] = React.useState("")
  const [sshExpiry, setSshExpiry] = React.useState("")
  const [sshError, setSshError] = React.useState("")
  const [sshAdding, setSshAdding] = React.useState(false)
  const [copiedFp, setCopiedFp] = React.useState<string | null>(null)

  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState("")

  const headers = React.useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  )

  /* ── Init ────────────────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const t = localStorage.getItem("crm_token")
    if (!t) {
      router.replace("/crm")
      return
    }
    setToken(t)
    isWebAuthnSupported().then(setSupported)
  }, [router])

  React.useEffect(() => {
    if (!token) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadAll() {
    setLoading(true)
    try {
      const [credRes, sshRes] = await Promise.all([
        apiClient.get("/api/crm/biometric/credentials", { headers }),
        apiClient.get("/api/crm/biometric/ssh-keys", { headers }),
      ])
      setCredentials(credRes.data?.data || [])
      setSshKeys(sshRes.data?.data || [])
    } catch {
      // Silently handle – user might have no credentials yet
    } finally {
      setLoading(false)
    }
  }

  /* ── Biometric Enrollment ────────────────────────────────────────────────── */

  async function handleEnroll() {
    setEnrollError("")
    setEnrollSuccess("")
    setEnrolling(true)

    try {
      // 1. Get registration options from server
      const optRes = await apiClient.post(
        "/api/crm/biometric/register/options",
        {},
        { headers }
      )
      const serverOptions = optRes.data?.data

      // 2. Create credential via browser WebAuthn API
      const credential = await startRegistration(serverOptions)

      // 3. Send credential back for verification
      const verifyRes = await apiClient.post(
        "/api/crm/biometric/register/verify",
        {
          credential,
          deviceName: enrollDeviceName.trim() || guessDeviceName(),
          deviceType: detectBiometricType(),
        },
        { headers }
      )

      setEnrollSuccess(
        `Enrolled "${verifyRes.data?.data?.deviceName}" successfully!`
      )
      setShowEnrollForm(false)
      setEnrollDeviceName("")
      loadAll()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Enrollment failed. Please try again."
      setEnrollError(msg)
    } finally {
      setEnrolling(false)
    }
  }

  async function handleRevoke(credentialId: string) {
    if (!confirm("Revoke this biometric credential? This cannot be undone.")) return
    try {
      await apiClient.delete(`/api/crm/biometric/credentials/${credentialId}`, {
        headers,
      })
      loadAll()
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to revoke credential.")
    }
  }

  async function handleRename(credentialId: string) {
    if (!renameValue.trim()) return
    try {
      await apiClient.patch(
        `/api/crm/biometric/credentials/${credentialId}`,
        { deviceName: renameValue.trim() },
        { headers }
      )
      setRenamingId(null)
      setRenameValue("")
      loadAll()
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to rename credential.")
    }
  }

  /* ── SSH Key Management ──────────────────────────────────────────────────── */

  async function handleAddSshKey() {
    setSshError("")
    if (!sshPublicKey.trim()) {
      setSshError("Please paste your SSH public key.")
      return
    }
    setSshAdding(true)
    try {
      await apiClient.post(
        "/api/crm/biometric/ssh-keys",
        {
          title: sshTitle.trim() || "SSH Key",
          publicKey: sshPublicKey.trim(),
          expiresAt: sshExpiry || undefined,
        },
        { headers }
      )
      setShowSshForm(false)
      setSshTitle("")
      setSshPublicKey("")
      setSshExpiry("")
      loadAll()
    } catch (err: any) {
      setSshError(err?.response?.data?.message || "Failed to add SSH key.")
    } finally {
      setSshAdding(false)
    }
  }

  async function handleRevokeSshKey(keyId: string) {
    if (!confirm("Revoke this SSH key? This cannot be undone.")) return
    try {
      await apiClient.delete(`/api/crm/biometric/ssh-keys/${keyId}`, { headers })
      loadAll()
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to revoke key.")
    }
  }

  function copyFingerprint(fp: string) {
    navigator.clipboard.writeText(fp)
    setCopiedFp(fp)
    setTimeout(() => setCopiedFp(null), 2000)
  }

  /* ── Helpers ─────────────────────────────────────────────────────────────── */

  function guessDeviceName() {
    const ua = navigator.userAgent
    if (/macintosh/i.test(ua)) return "MacBook Touch ID"
    if (/iphone/i.test(ua)) return "iPhone Face ID"
    if (/ipad/i.test(ua)) return "iPad Touch ID"
    if (/android/i.test(ua)) return "Android Biometric"
    if (/windows/i.test(ua)) return "Windows Hello"
    return "Biometric Device"
  }

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return "Never"
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  function deviceIcon(type: string) {
    if (type === "fingerprint") return <Fingerprint className="h-5 w-5" />
    if (type === "face") return <ScanFace className="h-5 w-5" />
    if (type === "security_key") return <Key className="h-5 w-5" />
    return <Smartphone className="h-5 w-5" />
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background pb-12">
      {/* ── Header ── */}
      <div className="border-b border-border/40 bg-card/50">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3">
          <button
            onClick={() => router.push("/crm/dashboard")}
            className="h-9 w-9 rounded-xl border border-border/50 flex items-center justify-center hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600/10 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Biometric Security</h1>
              <p className="text-[10px] text-muted-foreground/50">
                Manage fingerprint, face recognition &amp; SSH keys
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* ── WebAuthn Support Banner ── */}
        {!supported && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Biometrics Not Available
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your browser or device doesn&apos;t support platform biometrics (Touch ID, Face ID,
                Windows Hello). You can still manage SSH keys below.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/*  BIOMETRIC CREDENTIALS + SSH KEYS                                   */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold">Biometric Credentials</h2>
              <span className="text-[10px] text-muted-foreground/50 bg-muted/50 rounded-full px-2 py-0.5">
                {credentials.length} enrolled
              </span>
            </div>
            {supported && (
              <Button
                size="sm"
                onClick={() => {
                  setShowEnrollForm(true)
                  setEnrollError("")
                  setEnrollSuccess("")
                }}
                className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Enroll
              </Button>
            )}
          </div>

          {/* Enroll form */}
          {showEnrollForm && (
            <div className="px-5 py-4 border-b border-border/20 bg-emerald-600/2 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  Device Name (optional)
                </Label>
                <Input
                  value={enrollDeviceName}
                  onChange={(e) => setEnrollDeviceName(e.target.value)}
                  placeholder={guessDeviceName()}
                  className="h-9 rounded-lg border-border/40 bg-background text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2"
                >
                  {enrolling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Fingerprint className="h-3.5 w-3.5" />
                  )}
                  {enrolling ? "Waiting for biometric…" : "Start Enrollment"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEnrollForm(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
              </div>
              {enrollError && (
                <p className="text-xs text-rose-500">{enrollError}</p>
              )}
            </div>
          )}

          {/* Success message */}
          {enrollSuccess && (
            <div className="px-5 py-3 border-b border-border/20 bg-emerald-600/5 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">{enrollSuccess}</p>
            </div>
          )}

          {/* Credential list */}
          {credentials.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 text-center">
              <Fingerprint className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/40">
                No biometric credentials enrolled yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {credentials.map((cred) => (
                <div
                  key={cred.credentialId}
                  className="px-5 py-3.5 flex items-center gap-3 group hover:bg-muted/20 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 shrink-0">
                    {deviceIcon(cred.deviceType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {renamingId === cred.credentialId ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-7 text-xs rounded-md"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(cred.credentialId)
                            if (e.key === "Escape") setRenamingId(null)
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleRename(cred.credentialId)}
                          className="h-7 text-[10px] rounded-md"
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium truncate">{cred.deviceName}</p>
                        <p className="text-[10px] text-muted-foreground/50">
                          <span className="capitalize">{cred.deviceType}</span>
                          {" · "}
                          <Clock className="h-2.5 w-2.5 inline mb-0.5" /> Last used{" "}
                          {timeAgo(cred.lastUsedAt)}
                          {" · "}Added {new Date(cred.createdAt).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setRenamingId(cred.credentialId)
                        setRenameValue(cred.deviceName)
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleRevoke(cred.credentialId)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-rose-500/10 text-muted-foreground/50 hover:text-rose-500 transition-colors"
                      title="Revoke"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/*  SSH KEYS                                                          */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <section className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold">SSH Keys</h2>
              <span className="text-[10px] text-muted-foreground/50 bg-muted/50 rounded-full px-2 py-0.5">
                {sshKeys.length} active
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowSshForm(true)
                setSshError("")
              }}
              className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Key
            </Button>
          </div>

          {/* Add SSH key form */}
          {showSshForm && (
            <div className="px-5 py-4 border-b border-border/20 bg-emerald-600/2 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  Key Title
                </Label>
                <Input
                  value={sshTitle}
                  onChange={(e) => setSshTitle(e.target.value)}
                  placeholder="e.g. Work Laptop"
                  className="h-9 rounded-lg border-border/40 bg-background text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  Public Key
                </Label>
                <textarea
                  value={sshPublicKey}
                  onChange={(e) => setSshPublicKey(e.target.value)}
                  placeholder="ssh-ed25519 AAAA... user@host"
                  rows={3}
                  className="w-full rounded-lg border border-border/40 bg-background text-xs font-mono p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  Expiry Date (optional)
                </Label>
                <Input
                  type="date"
                  value={sshExpiry}
                  onChange={(e) => setSshExpiry(e.target.value)}
                  className="h-9 rounded-lg border-border/40 bg-background text-sm w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddSshKey}
                  disabled={sshAdding}
                  className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2"
                >
                  {sshAdding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Key className="h-3.5 w-3.5" />
                  )}
                  Add SSH Key
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSshForm(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
              </div>
              {sshError && <p className="text-xs text-rose-500">{sshError}</p>}
            </div>
          )}

          {/* SSH key list */}
          {sshKeys.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 text-center">
              <Terminal className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/40">No SSH keys added yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {sshKeys.map((key) => (
                <div
                  key={key._id}
                  className="px-5 py-3.5 flex items-center gap-3 group hover:bg-muted/20 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <Key className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{key.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <code className="text-[10px] text-muted-foreground/50 font-mono truncate max-w-50">
                        {key.fingerprint}
                      </code>
                      <button
                        onClick={() => copyFingerprint(key.fingerprint)}
                        className="text-muted-foreground/30 hover:text-foreground transition-colors"
                        title="Copy fingerprint"
                      >
                        {copiedFp === key.fingerprint ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      {key.keyType}
                      {key.expiresAt
                        ? ` · Expires ${new Date(key.expiresAt).toLocaleDateString()}`
                        : " · No expiry"}
                      {" · "}Last used {timeAgo(key.lastUsedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevokeSshKey(key._id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-muted-foreground/50 hover:text-rose-500 transition-all"
                    title="Revoke"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        </div>

        {/* ── Security Tips ── */}
        <div className="rounded-2xl border border-border/30 bg-card/50 px-5 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold">Security Recommendations</h3>
          </div>
          <ul className="text-[11px] text-muted-foreground/60 space-y-1 pl-6 list-disc">
            <li>Enroll at least two biometric devices for backup access.</li>
            <li>Use Ed25519 SSH keys for best security and performance.</li>
            <li>Set expiry dates on SSH keys and rotate them every 90 days.</li>
            <li>Review and revoke unused credentials regularly.</li>
            <li>Enable IP restrictions on SSH keys for production servers.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
