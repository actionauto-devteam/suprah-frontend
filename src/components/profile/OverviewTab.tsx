'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { UserProfile, PersonalInfo } from '@/types/user';
import {
  Award,
  Package,
  Truck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Crown,
  Edit3,
  Activity,
  MapPin,
  Briefcase,
  Building2,
  Phone,
  User,
  Globe,
  Moon,
  Sun,
  Sparkles,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fmtMonthYearMDT, fmtFullDateTimeMDT } from '@/lib/timezone';
import { useRouter } from 'next/navigation';

interface OverviewTabProps {
  profile: UserProfile | null;
  personalInfo: PersonalInfo;
  theme: 'light' | 'dark';
  phoneCountryCode: string;
  onToggleTheme: () => void;
  onEditPersonal: () => void;
  onConnectGoogleCalendar: () => void;
  onDisconnectGoogleCalendar: () => void;
}

export function OverviewTab({
  profile,
  personalInfo,
  theme,
  phoneCountryCode,
  onToggleTheme,
  onEditPersonal,
  onConnectGoogleCalendar,
  onDisconnectGoogleCalendar,
}: OverviewTabProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
      <div className="lg:col-span-2 space-y-6">
        {/* Account Status Card */}
        <Card className="shadow-xl border border-green-100 dark:border-green-900 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-green-500 via-emerald-500 to-teal-500 animate-gradient"></div>
          <CardHeader className="bg-linear-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-900 border-b border-green-100 dark:border-green-900 cursor-pointer hover:bg-linear-to-br hover:from-green-100 hover:to-white dark:hover:from-gray-800 dark:hover:to-gray-900 transition-all" onClick={() => router.push('/dashboard')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg animate-bounce-in">
                  <Award className="size-6 text-white" />
                </div>
                <div>
                  <CardTitle>Account Status</CardTitle>
                  <CardDescription>Your account overview and statistics</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  profile?.accountStatus?.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    profile?.accountStatus?.isActive ? "bg-green-500 animate-status-aura" : "bg-red-500"
                  )} />
                  {profile?.accountStatus?.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div onClick={() => router.push('/crm')} className="group p-4 rounded-xl bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 stat-card-clickable animate-slide-up stagger-1">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Package className="size-5 text-white" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Quotes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.accountStatus?.totalQuotes || 0}</p>
                <p className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View in CRM &rarr;</p>
              </div>
              <div onClick={() => router.push('/transportation')} className="group p-4 rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 stat-card-clickable animate-slide-up stagger-2">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Truck className="size-5 text-white" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shipments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.accountStatus?.totalShipments || 0}</p>
                <p className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View shipments &rarr;</p>
              </div>
              <div onClick={() => router.push('/')} className="group p-4 rounded-xl bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border border-purple-200 dark:border-purple-800 stat-card-clickable animate-slide-up stagger-3">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Calendar className="size-5 text-white" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Appointments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.accountStatus?.totalAppointments || 0}</p>
                <p className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View appointments &rarr;</p>
              </div>
              <div className="group p-4 rounded-xl bg-linear-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 border border-amber-200 dark:border-amber-800 transition-all hover:shadow-lg hover:-translate-y-1 animate-slide-up stagger-4">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Clock className="size-5 text-white" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Member Since</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {profile?.createdAt ? fmtMonthYearMDT(profile.createdAt) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <Badge className={cn(
                "px-4 py-2 text-sm gap-2 transition-all",
                profile?.accountStatus?.isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700"
                  : "bg-red-100 text-red-700 border-red-300"
              )}>
                {profile?.accountStatus?.isActive ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <XCircle className="size-4" />
                )}
                {profile?.accountStatus?.isActive ? 'Active Account' : 'Inactive Account'}
              </Badge>
              <Badge className={cn(
                "px-4 py-2 text-sm gap-2 transition-all",
                profile?.accountStatus?.isVerified
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              )}>
                <Shield className="size-4" />
                {profile?.accountStatus?.isVerified ? 'Email Verified' : 'Unverified'}
              </Badge>
              <Badge className="bg-linear-to-r from-purple-100 to-violet-100 text-purple-700 dark:from-purple-900 dark:to-violet-900 dark:text-purple-300 border-purple-300 dark:border-purple-700 px-4 py-2 text-sm gap-2">
                <Crown className="size-4" />
                {(profile?.subscription?.plan || 'free').replace(/^\w/, c => c.toUpperCase())} Plan
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Activity className="size-4" />
                <span>Last Activity</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium block">
                  {profile?.accountStatus?.lastActive
                    ? formatDistanceToNow(new Date(profile.accountStatus.lastActive), { addSuffix: true })
                    : 'Just now'}
                </span>
                {profile?.accountStatus?.lastActive && (
                  <span className="text-[11px] text-gray-400">
                    {fmtFullDateTimeMDT(profile.accountStatus.lastActive)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio Card */}
        <Card className="shadow-xl border border-green-100 dark:border-green-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Edit3 className="size-5 text-white" />
                </div>
                <CardTitle>About Me</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onEditPersonal}>
                <Edit3 className="size-4 mr-2" />Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {personalInfo.bio && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Bio</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap wrap-break-word">{personalInfo.bio}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {personalInfo.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="size-4 text-emerald-600" /><span className="font-medium">{personalInfo.location}</span></span>
                )}
                {personalInfo.jobTitle && (
                  <span className="flex items-center gap-1.5"><Briefcase className="size-4 text-emerald-600" /><span className="font-medium">{personalInfo.jobTitle}</span></span>
                )}
                {personalInfo.department && (
                  <span className="flex items-center gap-1.5"><Building2 className="size-4 text-emerald-600" /><span className="font-medium">{personalInfo.department}</span></span>
                )}
                {personalInfo.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="size-4 text-emerald-600" /><span className="font-medium">{phoneCountryCode} {personalInfo.phone}</span></span>
                )}
                {personalInfo.dateOfBirth && (
                  <span className="flex items-center gap-1.5"><Calendar className="size-4 text-emerald-600" /><span className="font-medium">{new Date((personalInfo.dateOfBirth as string).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span></span>
                )}
                {personalInfo.gender && (
                  <span className="flex items-center gap-1.5"><User className="size-4 text-emerald-600" /><span className="font-medium capitalize">{personalInfo.gender}</span></span>
                )}
                {personalInfo.timezone && (
                  <span className="flex items-center gap-1.5"><Clock className="size-4 text-emerald-600" /><span className="font-medium">{personalInfo.timezone}</span></span>
                )}
                {personalInfo.language && (
                  <span className="flex items-center gap-1.5"><Globe className="size-4 text-emerald-600" /><span className="font-medium capitalize">{personalInfo.language}</span></span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Theme Settings */}
        <Card className="shadow-xl border border-green-100 dark:border-green-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-gray-600 to-slate-700 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="size-5 text-white" /> : <Sun className="size-5 text-white" />}
              </div>
              <CardTitle>Display</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <Label className="text-sm font-semibold">Dark Mode</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Night mode active' : 'Day mode active'}
                </p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={onToggleTheme} className="data-[state=checked]:bg-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className="shadow-xl border border-green-100 dark:border-green-900">
          <CardHeader className="bg-linear-to-br from-amber-50 to-yellow-50 dark:from-gray-900 dark:to-amber-950 border-b border-amber-100 dark:border-amber-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                <Crown className="size-5 text-white" />
              </div>
              <div>
                <CardTitle>Membership</CardTitle>
                <CardDescription>Your plan details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Current Plan</span>
                <Badge className={cn("capitalize", profile?.subscription?.plan === 'enterprise' && 'bg-linear-to-r from-amber-500 to-yellow-500 text-white')}>
                  {profile?.subscription?.plan || 'Free'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge className={cn(profile?.subscription?.status === 'active' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300')}>
                  {profile?.subscription?.status || 'Active'}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Features</p>
                {profile?.subscription?.features?.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-4 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" disabled>
                <Sparkles className="size-4 mr-2" />
                Upgrade (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar */}
        <Card className="shadow-xl border border-green-100 dark:border-green-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-red-500 to-orange-600 flex items-center justify-center">
                <Calendar className="size-5 text-white" />
              </div>
              <div>
                <CardTitle>Google Calendar</CardTitle>
                <CardDescription>Sync appointments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {profile?.googleCalendar?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="size-5" />
                  <span className="font-medium">Connected</span>
                </div>
                {profile.googleCalendar.connectedAt && (
                  <p className="text-xs text-gray-500">
                    Connected {formatDistanceToNow(new Date(profile.googleCalendar.connectedAt), { addSuffix: true })}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={onDisconnectGoogleCalendar}
                >
                  <X className="size-4 mr-2" />Disconnect
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-linear-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                onClick={onConnectGoogleCalendar}
              >
                <Calendar className="size-4 mr-2" />Connect Google Calendar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
