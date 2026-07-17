import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Bell,
    BellRing,
    BellOff,
    Zap,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Loader2,
    SmartphoneNfc,
    ExternalLink
} from 'lucide-react';
import { useWebPush } from '@/hooks/useWebPush';
import { NotificationPreferences } from '@/types/notification';
import { UserProfile } from '@/types/user';
import { cn } from '@/lib/utils';
import { allNotificationCategories } from './profile-constants';
import { useRouter } from 'next/navigation';

interface NotificationsTabProps {
    preferences: NotificationPreferences | null;
    savingPreference: string | null;
    profile: UserProfile | null;
    handleEnableAllNotifications: () => void;
    handleDisableAllNotifications: () => void;
    handlePreferenceChange: (key: keyof NotificationPreferences, value: boolean) => void;
    getNotificationStats: () => { enabled: number; total: number };
}

const getNotificationCategoriesByRole = (role?: string) => {
    if (!role || role === 'super_admin' || role === 'admin') return allNotificationCategories;
    return allNotificationCategories.filter(category =>
        category.roles.includes(role) || category.roles.length === 0
    );
};

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
    preferences,
    savingPreference,
    profile,
    handleEnableAllNotifications,
    handleDisableAllNotifications,
    handlePreferenceChange,
    getNotificationStats,
}) => {
    const { isSupported, isSubscribed, subscribe, unsubscribe, isLoading: isPushLoading } = useWebPush();

    const router = useRouter();

    if (!preferences) return null;

    const getDashboardPath = () => {
        if (profile?.role === 'driver') return '/driver/notifications';
        if (profile?.role === 'customer') return '/customer/notifications';
        return '/notifications';
    };

    return (
        <Card className="p-0 shadow-lg border border-gray-200/80 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-green-500 to-teal-600 flex items-center justify-center shrink-0">
                        <Bell className="size-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">Notification Preferences</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">Control which notifications you receive</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            getNotificationStats().enabled > 0 ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
                        )} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {getNotificationStats().enabled}/{getNotificationStats().total}
                        </span>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => router.push(getDashboardPath())}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-sm"
                    >
                        <ExternalLink className="size-3.5" />
                        <span className="hidden sm:inline">View Notifications</span>
                    </Button>
                </div>
            </div>
            <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-3 mb-5 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Quick Actions:</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnableAllNotifications}
                        disabled={savingPreference !== null}
                        className="gap-2 text-sm border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/30"
                    >
                        <BellRing className="size-3.5 text-green-600 dark:text-green-400" />
                        Enable All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisableAllNotifications}
                        disabled={savingPreference !== null}
                        className="gap-2 text-sm border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                    >
                        <BellOff className="size-3.5 text-red-600 dark:text-red-400" />
                        Disable All
                    </Button>
                    <div className="hidden sm:block h-5 w-px bg-gray-200 dark:bg-gray-700" />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const importantKeys = ['passwordChanged', 'emailChanged', 'shipmentCreated', 'quoteCreated'];
                            importantKeys.forEach(key => {
                                if (!preferences[key as keyof NotificationPreferences]) {
                                    handlePreferenceChange(key as keyof NotificationPreferences, true);
                                }
                            });
                        }}
                        disabled={savingPreference !== null}
                        className="gap-2 text-sm border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/30"
                    >
                        <Zap className="size-3.5 text-amber-600 dark:text-amber-400" />
                        Important Only
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* --- WEB PUSH DEVICE SETTINGS --- */}
                    <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20 animate-slide-up">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                                    <SmartphoneNfc className="size-6 text-white" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                    <h3 className="font-bold text-base flex items-center gap-2 flex-wrap">
                                        Push Notifications
                                        {isSupported && (
                                            <Badge variant="outline" className={cn(
                                                "text-xs h-5 px-2 font-bold uppercase tracking-tight",
                                                isSubscribed
                                                    ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                                                    : "border-gray-300 text-gray-500 bg-gray-50 dark:bg-gray-800"
                                            )}>
                                                {isSubscribed ? "Active on this device" : "Inactive"}
                                            </Badge>
                                        )}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-full sm:max-w-110 leading-relaxed">
                                        {isSupported
                                            ? "Enable real-time alerts on this browser to receive instant updates even when the app is closed."
                                            : "Your browser does not support Web Push notifications. Please use a modern browser like Chrome, Safari, or Edge."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                                {isPushLoading && <Loader2 className="size-5 animate-spin text-emerald-600" />}
                                <Switch
                                    checked={isSubscribed}
                                    disabled={!isSupported || isPushLoading}
                                    onCheckedChange={(checked) => {
                                        if (checked) subscribe();
                                        else unsubscribe();
                                    }}
                                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:shadow-emerald-500/40"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 mx-1" />

                    {getNotificationCategoriesByRole(profile?.role).map((category) => {
                        const CategoryIcon = category.icon;
                        const categoryEnabled = category.items.filter(
                            item => preferences[item.key as keyof NotificationPreferences]
                        ).length;
                        const allEnabled = categoryEnabled === category.items.length;
                        const someEnabled = categoryEnabled > 0 && categoryEnabled < category.items.length;

                        return (
                            <div
                                key={category.title}
                                className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 p-3 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-linear-to-br shrink-0",
                                            category.color
                                        )}>
                                            <CategoryIcon className="size-4 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{category.title}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                {categoryEnabled}/{category.items.length} active
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                            allEnabled && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
                                            someEnabled && "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
                                            !categoryEnabled && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                        )}>
                                            {allEnabled ? <CheckCircle2 className="size-2.5" /> : someEnabled ? <AlertCircle className="size-2.5" /> : <XCircle className="size-2.5" />}
                                            {allEnabled ? 'All On' : someEnabled ? 'Partial' : 'Off'}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-3 text-sm"
                                            onClick={() => {
                                                const turnOn = categoryEnabled < category.items.length;
                                                category.items.forEach(item => {
                                                    if (preferences[item.key as keyof NotificationPreferences] !== turnOn) {
                                                        handlePreferenceChange(item.key as keyof NotificationPreferences, turnOn);
                                                    }
                                                });
                                            }}
                                        >
                                            {categoryEnabled === category.items.length ? 'Disable' : 'Enable'} All
                                        </Button>
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {category.items.map((item) => {
                                        const Icon = item.icon;
                                        const isEnabled = preferences[item.key as keyof NotificationPreferences];
                                        const isSaving = savingPreference === item.key;

                                        return (
                                            <div
                                                key={item.key}
                                                className={cn(
                                                    "flex items-center justify-between px-4 py-3 transition-all",
                                                    isEnabled ? "bg-green-50/50 dark:bg-green-950/10" : "bg-white dark:bg-gray-900",
                                                    isSaving && "opacity-60"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                        isEnabled
                                                            ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                                                            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                                    )}>
                                                        {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">{item.label}</p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={isEnabled}
                                                    onCheckedChange={(checked) => handlePreferenceChange(item.key as keyof NotificationPreferences, checked)}
                                                    disabled={isSaving}
                                                    className="data-[state=checked]:bg-green-500"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
