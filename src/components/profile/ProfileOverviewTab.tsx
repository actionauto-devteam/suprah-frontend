import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    History,
    Globe,
    MapPin,
    TrendingUp,
    Users,
    Calendar,
    UserPlus,
    Link2,
    ExternalLink,
    Edit3,
    LayoutDashboard,
    UserCog,
    HelpCircle,
    AlertTriangle,
    Quote,
    Phone,
    Briefcase,
    Building2,
    User,
    Moon,
    Sun
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { UserProfile, RecentActivity } from '@/types/user';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { activityIcons, languageOptions } from './profile-constants';
import { useWalletDashboard } from '@/hooks/api/useWallet';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProfileOverviewTabProps {
    profile: UserProfile | null;
    authUser: any;
    activities: RecentActivity[];
    handleTabChange: (tab: string) => void;
}

export const ProfileOverviewTab: React.FC<ProfileOverviewTabProps> = ({
    profile,
    authUser,
    activities,
    handleTabChange,
}) => {
    const router = useRouter();
    const { data: walletData } = useWalletDashboard();
    const { theme, setTheme } = useTheme();
    const isCustomer = profile?.role === 'customer';
    const [pendingLink, setPendingLink] = useState<{ label: string; url: string } | null>(null);

    const handleCopyLink = () => {
        if (!walletData?.referralCode) return;
        const link = `${window.location.origin}/referral/${walletData.referralCode}`;
        navigator.clipboard.writeText(link);
        toast.success("Referral link copied!");
    };

    const getDashboardPath = () => {
        if (profile?.role === 'driver') return '/driver';
        if (profile?.role === 'customer') return '/customer';
        return '/';
    };

    const quickLinks = [
        { label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50', action: () => router.push(getDashboardPath()) },
        { label: 'Edit Profile', icon: UserCog, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50', action: () => handleTabChange('personal') },
        { label: theme === 'dark' ? 'Light Mode' : 'Dark Mode', icon: theme === 'dark' ? Sun : Moon, color: theme === 'dark' ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' : 'text-violet-500 bg-violet-50 dark:bg-violet-950/50', action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
        { label: 'Support', icon: HelpCircle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50', action: () => handleTabChange('support') },
    ];

    const successfulReferrals = walletData?.recentTransactions?.filter(
        t => t.type === 'deposit' && t.status === 'completed'
    ).length || 0;

    const rawLinks = profile?.socialLinks?.length ? profile.socialLinks : (profile?.personalInfo as any)?.socialLinks || [];
    const socialLinks = rawLinks.filter((l: any) => l.label?.trim() || l.url?.trim());

    const handleExternalLink = (link: { label: string; url: string }) => {
        setPendingLink(link);
    };

    const confirmExternalLink = () => {
        if (pendingLink?.url) {
            window.open(pendingLink.url, '_blank', 'noopener,noreferrer');
        }
        setPendingLink(null);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-tab-switch">
                <Card className="p-0 shadow-lg border border-gray-200/80 dark:border-gray-800 overflow-hidden hover-lift group">
                    <CardHeader className="py-4 px-5 bg-linear-to-br from-blue-50 to-indigo-50/50 dark:from-gray-900 dark:to-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                <LayoutDashboard className="size-4 text-white" />
                            </div>
                            <CardTitle className="text-base font-bold">Quick Access</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-2.5">
                            {quickLinks.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={item.action}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all group/item active:scale-95"
                                >
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center group-hover/item:scale-110 transition-transform", item.color)}>
                                        <item.icon className="size-5" />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg p-0 border border-gray-200/80 dark:border-gray-800 md:col-span-2 overflow-hidden hover-lift group">
                    <CardHeader className="bg-linear-to-br from-emerald-50 to-teal-50/50 dark:from-gray-900 dark:to-gray-800/80 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between py-4 px-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                <Globe className="size-4 text-white" />
                            </div>
                            <CardTitle className="text-base font-bold">About Me</CardTitle>
                        </div>
                        <button onClick={() => handleTabChange('personal')} className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-colors">
                            <Edit3 className="size-4" />
                        </button>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6">
                        {profile?.personalInfo?.bio ? (
                            <div className="relative pl-4 border-l-2 border-emerald-400/40">
                                <Quote className="absolute -left-2.5 -top-1 size-5 text-emerald-400/50 bg-white dark:bg-gray-950 rounded-full" />
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">{profile.personalInfo.bio}</p>
                            </div>
                        ) : (
                            <div className="text-center py-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                <p className="text-gray-400 dark:text-gray-500 text-sm">No bio yet</p>
                                <button onClick={() => handleTabChange('personal')} className="mt-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm hover:underline">
                                    Add bio &rarr;
                                </button>
                            </div>
                        )}

                        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
                            {[
                                { label: 'Phone', value: profile?.personalInfo?.phone ? `+1 ${profile.personalInfo.phone}` : null, icon: Phone, color: 'text-blue-500' },
                                { label: 'Location', value: profile?.personalInfo?.location || null, icon: MapPin, color: 'text-emerald-500' },
                                { label: 'Birthday', value: profile?.personalInfo?.dateOfBirth ? new Date(profile.personalInfo.dateOfBirth + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null, icon: Calendar, color: 'text-pink-500' },
                                { label: 'Gender', value: profile?.personalInfo?.gender ? profile.personalInfo.gender.charAt(0).toUpperCase() + profile.personalInfo.gender.slice(1).replace(/-/g, ' ') : null, icon: User, color: 'text-violet-500' },
                                { label: 'Job Title', value: profile?.personalInfo?.jobTitle || null, icon: Briefcase, color: 'text-amber-500' },
                                { label: 'Department', value: profile?.personalInfo?.department || null, icon: Building2, color: 'text-cyan-500' },
                                { label: 'Language', value: profile?.personalInfo?.language ? languageOptions.find(l => l.code === profile?.personalInfo?.language)?.name : null, icon: Globe, color: 'text-indigo-500' },
                                { label: 'Joined', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today', icon: Calendar, color: 'text-teal-500' },
                            ].filter(info => info.value).map((info, i) => (
                                <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                    <info.icon className={cn("size-4 shrink-0", info.color)} />
                                    <div className="min-w-0">
                                        <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">{info.label}</p>
                                        <p className="text-xs font-semibold truncate text-gray-800 dark:text-gray-200">{info.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {socialLinks.length > 0 && (
                            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400 mb-3">Links</p>
                                <div className="flex flex-wrap gap-2">
                                    {socialLinks.map((link: any, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => handleExternalLink(link)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all text-xs font-semibold group/link"
                                        >
                                            <Link2 className="size-3 text-emerald-500" />
                                            <span className="truncate max-w-32">{link.label || link.url}</span>
                                            <ExternalLink className="size-2.5 text-gray-400 group-hover/link:text-emerald-500 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className={cn("shadow-lg p-0 border border-gray-200/80 dark:border-gray-800 overflow-hidden hover-lift group", !isCustomer && "md:col-span-3")}>
                    <CardHeader className="bg-linear-to-br from-purple-50 to-pink-50/50 dark:from-gray-900 dark:to-gray-800/80 border-b border-gray-100 dark:border-gray-800 py-4 px-5">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                    <History className="size-4 text-white" />
                                </div>
                                <CardTitle className="text-base font-bold">Recent Feed</CardTitle>
                            </div>
                            <button onClick={() => handleTabChange('activity')} className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 hover:underline">
                                View All
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {activities.slice(0, 5).map((activity, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleTabChange('activity')}
                                    className="w-full p-3.5 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors group/act text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover/act:bg-purple-100 dark:group-hover/act:bg-purple-900/40 transition-colors">
                                            {activityIcons[activity.type] || <History className="size-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate group-hover/act:text-purple-600 dark:group-hover/act:text-purple-400 transition-colors">{activity.title}</p>
                                            <p className="text-[10px] font-medium text-gray-400 mt-0.5">{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {activities.length === 0 && (
                                <div className="p-10 text-center">
                                    <History className="size-8 text-gray-200 dark:text-gray-800 mx-auto mb-3" />
                                    <p className="text-gray-400 text-sm">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {isCustomer && (
                    <Card className="p-0 shadow-lg border-none md:col-span-2 overflow-hidden hover-lift group relative bg-gray-900 dark:bg-zinc-950 text-white">
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-500 via-amber-500 to-orange-600" />
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />

                        <CardContent className="p-5 sm:p-8 relative z-10">
                            <div className="flex flex-col lg:flex-row justify-between gap-6 sm:gap-10">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-orange-500/20 group-hover:scale-110 transition-transform">
                                            <UserPlus className="size-7 text-white" />
                                        </div>
                                        <div>
                                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                                                Exclusive Reward
                                            </Badge>
                                            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">Refer & Earn $100</h3>
                                        </div>
                                    </div>
                                    <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl">
                                        Share ActionAutoUtah with friends. For every vehicle purchase through your referral, earn a <span className="text-orange-400 font-bold">$100 bonus</span>.
                                    </p>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Your Referral Link</label>
                                        <div className="flex gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 max-w-lg">
                                            <input
                                                readOnly
                                                value={walletData?.referralCode ? `${window.location.origin}/referral/${walletData.referralCode}` : '...'}
                                                className="bg-transparent border-0 focus:ring-0 flex-1 px-3 font-mono text-xs font-semibold text-zinc-400 outline-none"
                                            />
                                            <button onClick={handleCopyLink} className="px-5 py-2.5 rounded-lg bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-orange-500/20">
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center lg:items-end gap-6">
                                    <div className="text-center lg:text-right">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Total Earned</p>
                                        <div className="text-3xl sm:text-4xl font-extrabold text-orange-500 tracking-tight">${walletData?.totalEarned?.toFixed(2) || '0.00'}</div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center min-w-24 hover:bg-emerald-500/10 transition-colors">
                                            <TrendingUp className="size-5 text-emerald-500 mb-2" />
                                            <span className="text-2xl font-extrabold text-white">{successfulReferrals}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 mt-0.5">Successful</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex flex-col items-center min-w-24 hover:bg-blue-500/10 transition-colors">
                                            <Users className="size-5 text-blue-500 mb-2" />
                                            <span className="text-2xl font-extrabold text-white">{walletData?.pendingLeads || 0}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500/70 mt-0.5">Signups</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <AlertDialog open={!!pendingLink} onOpenChange={(open) => !open && setPendingLink(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-amber-500" />
                            Open External Link?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <span className="block">You are about to visit an external website:</span>
                            <span className="block font-mono text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg break-all">{pendingLink?.url}</span>
                            <span className="block text-xs text-gray-500">Make sure you trust this link before proceeding.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmExternalLink} className="bg-emerald-600 hover:bg-emerald-700">
                            Visit Link
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
