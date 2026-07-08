'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    History,
    Globe,
    MapPin,
    Calendar,
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
    Sun,
    Package,
    CheckCircle2,
    Route,
    Award,
    Truck,
    TrendingUp,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { UserProfile, RecentActivity } from '@/types/user';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { activityIcons, languageOptions } from '@/components/profile/profile-constants';
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

interface DriverOverviewTabProps {
    profile: UserProfile | null;
    authUser: any;
    activities: RecentActivity[];
    handleTabChange: (tab: string) => void;
    driverStats: {
        deliveriesCompleted: number;
        onTimeRate: number;
        totalMiles: number;
        rating: number;
        activeDeliveries: number;
        totalAssigned: number;
    };
    organization?: { name: string } | null;
}

export const DriverOverviewTab: React.FC<DriverOverviewTabProps> = ({
    profile,
    authUser,
    activities,
    handleTabChange,
    driverStats,
    organization,
}) => {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [pendingLink, setPendingLink] = useState<{ label: string; url: string } | null>(null);

    const quickLinks = [
        { label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50', action: () => router.push('/driver') },
        { label: 'Edit Profile', icon: UserCog, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50', action: () => handleTabChange('personal') },
        { label: theme === 'dark' ? 'Light Mode' : 'Dark Mode', icon: theme === 'dark' ? Sun : Moon, color: theme === 'dark' ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' : 'text-violet-500 bg-violet-50 dark:bg-violet-950/50', action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
        { label: 'Support', icon: HelpCircle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50', action: () => handleTabChange('support') },
    ];

    const statCards = [
        { label: 'Deliveries', value: driverStats.deliveriesCompleted, icon: Package, gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950', border: 'border-emerald-200 dark:border-emerald-800', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'On-Time', value: `${driverStats.onTimeRate}%`, icon: CheckCircle2, gradient: 'from-green-50 to-lime-50 dark:from-green-950 dark:to-lime-950', border: 'border-green-200 dark:border-green-800', iconColor: 'text-green-600 dark:text-green-400' },
        { label: 'Miles', value: driverStats.totalMiles.toLocaleString(), icon: Route, gradient: 'from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950', border: 'border-blue-200 dark:border-blue-800', iconColor: 'text-blue-600 dark:text-blue-400' },
        { label: 'Rating', value: driverStats.rating, icon: Award, gradient: 'from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950', border: 'border-amber-200 dark:border-amber-800', iconColor: 'text-amber-600 dark:text-amber-400' },
        { label: 'Active', value: driverStats.activeDeliveries, icon: Truck, gradient: 'from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950', border: 'border-purple-200 dark:border-purple-800', iconColor: 'text-purple-600 dark:text-purple-400' },
    ];

    const rawLinks = profile?.socialLinks?.length ? profile.socialLinks : (profile?.personalInfo as any)?.socialLinks || [];
    const socialLinks = rawLinks.filter((l: any) => l.label?.trim() || l.url?.trim());

    const confirmExternalLink = () => {
        if (pendingLink?.url) window.open(pendingLink.url, '_blank', 'noopener,noreferrer');
        setPendingLink(null);
    };

    return (
        <>
            <div className="space-y-4 sm:space-y-6 animate-tab-switch">
                <Card className="p-0 shadow-lg border border-gray-200/80 dark:border-gray-800 overflow-hidden hover-lift group">
                    <CardHeader className="py-4 px-5 bg-linear-to-br from-emerald-50 to-teal-50/50 dark:from-gray-900 dark:to-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                <TrendingUp className="size-4 text-white" />
                            </div>
                            <CardTitle className="text-base font-bold">Driver Statistics</CardTitle>
                            {organization && (
                                <Badge variant="outline" className="ml-auto text-xs gap-1.5">
                                    <Building2 className="size-3" />{organization.name}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {statCards.map((stat, i) => (
                                <div key={i} className={cn("p-3.5 rounded-xl bg-linear-to-br border", stat.gradient, stat.border)}>
                                    <stat.icon className={cn("size-5 mb-2", stat.iconColor)} />
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-xl font-extrabold text-gray-900 dark:text-white">{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
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
                                    { label: 'Birthday', value: profile?.personalInfo?.dateOfBirth ? new Date(profile.personalInfo.dateOfBirth + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' }) : null, icon: Calendar, color: 'text-pink-500' },
                                    { label: 'Gender', value: profile?.personalInfo?.gender ? profile.personalInfo.gender.charAt(0).toUpperCase() + profile.personalInfo.gender.slice(1).replace(/-/g, ' ') : null, icon: User, color: 'text-violet-500' },
                                    { label: 'Job Title', value: profile?.personalInfo?.jobTitle || null, icon: Briefcase, color: 'text-amber-500' },
                                    { label: 'Department', value: profile?.personalInfo?.department || null, icon: Building2, color: 'text-cyan-500' },
                                    { label: 'Language', value: profile?.personalInfo?.language ? languageOptions.find(l => l.code === profile?.personalInfo?.language)?.name : null, icon: Globe, color: 'text-indigo-500' },
                                    { label: 'Joined', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'America/Denver' }) : 'Today', icon: Calendar, color: 'text-teal-500' },
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
                                                onClick={() => setPendingLink(link)}
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
                </div>

                <Card className="shadow-lg p-0 border border-gray-200/80 dark:border-gray-800 overflow-hidden hover-lift group">
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
