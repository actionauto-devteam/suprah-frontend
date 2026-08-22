import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    ShieldCheck,
    Mail,
    CheckCircle2,
    KeyRound,
    Fingerprint,
    Timer,
    Lock,
    AlertCircle,
    Settings
} from 'lucide-react';
import { UserProfile } from '@/types/user';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fmtLongDateTimeMDT } from '@/lib/timezone';

interface SecurityTabProps {
    profile: UserProfile | null;
    openUserProfile: () => void;
    handleVerifyEmail: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
    profile,
    openUserProfile,
    handleVerifyEmail,
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-0 shadow-xl border border-emerald-100 dark:border-emerald-900 overflow-hidden hover-lift">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-500 to-green-500 animate-gradient"></div>
                <CardHeader className="py-4 bg-linear-to-br from-emerald-50 to-green-50/50 dark:from-gray-900 dark:to-gray-800 border-b border-emerald-100 dark:border-emerald-900">
                    <div className="flex items-center gap-3 animate-slide-in-left">
                        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <ShieldCheck className="size-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Security Status</CardTitle>
                            <CardDescription>Overview of your account security</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors animate-slide-up stagger-1">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shadow-md", profile?.securityStatus?.emailVerified ? "bg-emerald-100 dark:bg-emerald-900" : "bg-amber-100 dark:bg-amber-900")}>
                                <Mail className={cn("size-5", profile?.securityStatus?.emailVerified ? "text-emerald-600" : "text-amber-600")} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Email Verification</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
                            </div>
                        </div>
                        {profile?.securityStatus?.emailVerified ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 font-medium">
                                <CheckCircle2 className="size-3 mr-1.5" />Verified
                            </Badge>
                        ) : (
                            <Button size="sm" variant="outline" onClick={handleVerifyEmail} className="hover-lift">Verify Now</Button>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors animate-slide-up stagger-2">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shadow-md", profile?.securityStatus?.hasPassword ? "bg-emerald-100 dark:bg-emerald-900" : "bg-gray-100 dark:bg-gray-800")}>
                                <KeyRound className={cn("size-5", profile?.securityStatus?.hasPassword ? "text-emerald-600" : "text-gray-600")} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Password</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {profile?.securityStatus?.lastPasswordChange ? `Last changed ${formatDistanceToNow(new Date(profile.securityStatus.lastPasswordChange), { addSuffix: true })}` : 'Native Account'}
                                </p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openUserProfile()} className="hover-lift">Change</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 opacity-70 animate-slide-up stagger-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shadow-md">
                                <Fingerprint className="size-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Extra layer of security</p>
                            </div>
                        </div>
                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700 font-medium">Coming Soon</Badge>
                    </div>

                    {profile?.securityStatus?.lastLogin && (
                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors animate-slide-up stagger-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center shadow-md">
                                    <Timer className="size-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">Last Login</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{fmtLongDateTimeMDT(new Date(profile.securityStatus.lastLogin))}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="p-0 shadow-xl border border-blue-100 dark:border-blue-900 overflow-hidden hover-lift">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-indigo-500 animate-gradient"></div>
                <CardHeader className="py-4 bg-linear-to-br from-blue-50 to-indigo-50/50 dark:from-gray-900 dark:to-gray-800 border-b border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-3 animate-slide-in-right">
                        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <Lock className="size-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Account Security</CardTitle>
                            <CardDescription>Managed via Profile Settings</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4 animate-fade-in-up">
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors animate-slide-up stagger-2">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Account Control</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1.5 leading-relaxed">
                                        Email changes, password updates, and account recovery are handled natively through your Suprah.AI account.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button onClick={() => openUserProfile()} className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                            <Settings className="size-4 mr-2" />Open Security Settings
                        </Button>

                        <Separator />

                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Quick Actions</p>
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" size="sm" onClick={() => openUserProfile()}>
                                    <Mail className="size-4 mr-2" />Change Email
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openUserProfile()}>
                                    <Lock className="size-4 mr-2" />Change Password
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
