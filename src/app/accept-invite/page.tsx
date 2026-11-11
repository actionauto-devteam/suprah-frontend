"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, LogOut, UserPlus, LogIn, Info, AlertTriangle } from "lucide-react"
import { useAuth, useUser } from "@/providers/AuthProvider"
import { userErrorMessage } from "@/lib/user-error"
import {
    inviteRoleLabel,
    staffInviteGuide,
    staffInvitePath,
    staffInviteVisitor,
    staffSignInHref,
    staffSignUpHref,
    type StaffInvite,
} from "@/lib/staff-invite"

// Staff invitation (2026-11-11): someone without an account creates their
// staff account for the invited email; someone signed in as another account
// (or as a driver) is never attached to the invitation by mistake. Every case
// says what the button will do before it's pressed (lib/staff-invite).
function AcceptInviteContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const router = useRouter()
    const { getToken, isLoaded, isSignedIn, signOut } = useAuth()
    const { user } = useUser()

    const [isLoading, setIsLoading] = useState(true)
    const [isAccepting, setIsAccepting] = useState(false)
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [invitation, setInvitation] = useState<StaffInvite | null>(null)

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setError("This invitation link is incomplete. Open it again from the invitation email.")
                setIsLoading(false)
                return
            }

            try {
                const response = await apiClient.validateInvite(token)
                const data = response.data?.data || response.data
                setInvitation(data)

                // Already accepted and signed in: the dashboard takes it from here,
                // loaded fresh so the session matches the account (2026-11-11).
                if (data.isAlreadyAccepted && isSignedIn) {
                    window.location.assign("/")
                }
            } catch (err: unknown) {
                setError(userErrorMessage(err, "open this invitation"))
            } finally {
                setIsLoading(false)
            }
        }

        if (isLoaded) {
            validateToken()
        }
    }, [token, isLoaded])

    const signedInEmail = user?.primaryEmailAddress?.emailAddress ?? ""
    const visitor = invitation
        ? staffInviteVisitor({
            isSignedIn,
            inviteEmail: invitation.email,
            signedInEmail,
            signedInRole: user?.role,
        })
        : "signed-out"
    const guide = invitation ? staffInviteGuide({ visitor, invite: invitation, signedInEmail }) : null

    const handleAccept = async () => {
        setIsAccepting(true)
        try {
            const authToken = await getToken()
            await apiClient.acceptInvite(token!, {
                headers: { Authorization: `Bearer ${authToken}` }
            })
            // The account is now staff at this dealership, but the sign-in in
            // this browser still describes the old account (dealership
            // features refused it until signing in again). Clear the old CRM
            // session and load the dashboard fresh, which signs the session in
            // again as the new staff account (2026-11-11).
            try {
                localStorage.removeItem("crm_token")
            } catch {
                // Storage can be unavailable; the dashboard gets a new CRM session either way.
            }
            window.dispatchEvent(new Event("supraspace:refresh-crm-token"))
            window.location.assign("/")
        } catch (err: unknown) {
            setError(userErrorMessage(err, "accept this invitation"))
            setIsAccepting(false)
        }
    }

    // Sign out and come back to this invitation, to continue with the invited email.
    const signOutAndContinue = async () => {
        setIsSigningOut(true)
        try {
            await signOut({ redirectUrl: staffInvitePath(token!) })
        } catch {
            setIsSigningOut(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const actions = !error && guide ? guide.actions : []

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {error ? <XCircle className="text-destructive" /> : <CheckCircle2 className="text-green-500" />}
                        {error ? "Invitation problem" : "You're invited!"}
                    </CardTitle>
                    <CardDescription>
                        {error
                            ? "We couldn't continue with this invitation."
                            : `You've been invited to join ${invitation?.organizationName ?? "a dealership"} on Suprah AI as staff.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {invitation && (
                        <div className="space-y-4">
                            <dl className="p-4 bg-muted rounded-lg space-y-2">
                                <div>
                                    <dt className="text-sm font-medium">Dealership</dt>
                                    <dd className="text-lg font-bold break-words">{invitation.organizationName}</dd>
                                </div>
                                <div className="border-t border-border pt-2">
                                    <dt className="text-sm font-medium">Invited by</dt>
                                    <dd className="break-words">{invitation.inviterName}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium">Role</dt>
                                    <dd>{inviteRoleLabel(invitation.role)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium">For</dt>
                                    <dd className="break-all">{invitation.email}</dd>
                                </div>
                            </dl>
                            {!error && guide && (
                                <p
                                    role={guide.tone === "warning" ? "alert" : "status"}
                                    className={
                                        guide.tone === "warning"
                                            ? "flex gap-2 text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200 break-words"
                                            : "flex gap-2 text-sm rounded-lg border border-border bg-muted/40 p-3 text-muted-foreground break-words"
                                    }
                                >
                                    {guide.tone === "warning"
                                        ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                                        : <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />}
                                    <span>{guide.note}</span>
                                </p>
                            )}
                        </div>
                    )}
                    {error && (
                        <div role="alert" className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                            {error}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    {invitation && actions.includes("create") && (
                        <Button className="w-full h-11 gap-2" onClick={() => router.push(staffSignUpHref(token!))}>
                            <UserPlus className="h-4 w-4" aria-hidden="true" />
                            Create my account
                        </Button>
                    )}
                    {invitation && actions.includes("sign-in") && guide && (
                        <Button
                            variant={actions.includes("create") ? "outline" : "default"}
                            className="w-full h-11 gap-2"
                            onClick={() => router.push(staffSignInHref(token!, invitation.email))}
                        >
                            <LogIn className="h-4 w-4" aria-hidden="true" />
                            {guide.signInLabel}
                        </Button>
                    )}
                    {invitation && actions.includes("accept") && guide && (
                        <Button className="w-full h-11" onClick={handleAccept} disabled={isAccepting}>
                            {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {guide.acceptLabel}
                        </Button>
                    )}
                    {invitation && actions.includes("sign-out") && (
                        <Button variant="outline" className="w-full h-11 gap-2" onClick={signOutAndContinue} disabled={isSigningOut}>
                            {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
                            Sign out and continue
                        </Button>
                    )}
                    {(error || (invitation && actions.length === 0)) && (
                        <Button variant="outline" className="w-full h-11" onClick={() => router.push("/")}>
                            Go to Suprah AI
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <AcceptInviteContent />
        </Suspense>
    )
}
