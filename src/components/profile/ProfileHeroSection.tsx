'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/types/user';
import {
  User,
  Camera,
  Clock,
  CheckCircle2,
  Calendar,
  LogOut,
  Trash2,
} from 'lucide-react';
import { fmtFullWeekdayDateTimeMDT } from '@/lib/timezone';

interface ProfileHeroSectionProps {
  profile: UserProfile | null;
  authUser: any;
  currentStatusOption: any;
  roleBadge: any;
  customStatus: string;
  isSaving?: boolean;
  getAvatarUrl: (avatar?: string | null) => string | undefined;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
  onLogout: () => void;
  onStatusClick: () => void;
}

export function ProfileHeroSection({
  profile,
  authUser,
  currentStatusOption,
  roleBadge,
  customStatus,
  isSaving,
  getAvatarUrl,
  onChangePhoto,
  onRemovePhoto,
  onLogout,
  onStatusClick,
}: ProfileHeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-br from-green-600 via-emerald-500 to-teal-600 dark:from-green-700 dark:via-emerald-600 dark:to-teal-700 shadow-xl sm:shadow-2xl animate-gradient">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        <div className="absolute top-10 left-[10%] w-3 h-3 bg-white/20 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-20 left-[25%] w-2 h-2 bg-white/15 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-8 right-[20%] w-4 h-4 bg-white/10 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-16 right-[15%] w-2 h-2 bg-white/20 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-24 left-[40%] w-3 h-3 bg-white/15 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-emerald-300/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Truck SVG decoration */}
      <div className="absolute inset-0 overflow-hidden opacity-20 hidden sm:block">
        <svg viewBox="0 0 1200 400" className="absolute right-0 bottom-0 w-full h-full animate-truck-drive" preserveAspectRatio="xMaxYMax slice">
          <path d="M 100 250 L 200 250 L 200 200 L 250 200 L 280 150 L 400 150 L 450 200 L 800 200 L 850 250 L 1100 250 L 1100 300 L 950 300 Q 950 350 900 350 Q 850 350 850 300 L 350 300 Q 350 350 300 350 Q 250 350 250 300 L 100 300 Z" fill="rgba(255, 255, 255, 0.15)" />
          <circle cx="300" cy="310" r="35" fill="rgba(255, 255, 255, 0.2)" />
          <circle cx="900" cy="310" r="35" fill="rgba(255, 255, 255, 0.2)" />
          <line x1="0" y1="360" x2="1200" y2="360" stroke="rgba(255,255,255,0.12)" strokeWidth="3" strokeDasharray="30 20" className="animate-road-scroll" />
        </svg>
      </div>

      <div className="relative p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 md:gap-8">
          {/* Profile Picture */}
          <div className="relative group animate-slide-in-left">
            <div className="absolute -inset-1 bg-linear-to-r from-white/40 via-emerald-300 to-white/40 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
            <div
              className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full bg-linear-to-br from-white/20 to-white/5 backdrop-blur-2xl border-[5px] border-white/60 flex items-center justify-center shadow-2xl overflow-hidden cursor-pointer transition-all hover:scale-110 profile-picture-glow"
              onClick={onChangePhoto}
            >
              {(getAvatarUrl(profile?.avatar) || authUser?.imageUrl) ? (
                <img
                  src={getAvatarUrl(profile?.avatar) || authUser?.imageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="size-10 sm:size-14 md:size-20 text-white" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-fade-in-up">
                <Camera className="size-6 sm:size-8 text-white animate-subtle-scale" />
              </div>
            </div>
            <button
              onClick={onStatusClick}
              className={cn(
                "absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all hover:scale-125 z-20 animate-status-aura",
                currentStatusOption.color
              )}
              title={`Status: ${currentStatusOption.label}`}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left animate-slide-in-right">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mb-2 sm:mb-3">
              <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                {profile?.name || authUser?.fullName || 'User'}
              </h1>
              <Badge className={cn("text-xs sm:text-sm px-3 py-1 border transition-transform hover:scale-105", roleBadge.className)}>
                {roleBadge.label}
              </Badge>
            </div>
            <p className="text-white/90 text-sm sm:text-base mb-1">
              {profile?.email || authUser?.primaryEmailAddress?.emailAddress}
            </p>
            <p className="text-white/60 text-[11px] sm:text-xs mb-3">
              <Clock className="size-3 inline mr-1" />
              {fmtFullWeekdayDateTimeMDT(new Date())} MDT
            </p>
            {customStatus && (
              <p className="text-white/80 text-xs sm:text-sm italic mb-3 animate-fade-in-up">"{customStatus}"</p>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
              <Badge className="bg-white/20 text-white border border-white/30 backdrop-blur-sm px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/30">
                <div className={cn("w-2 h-2 rounded-full mr-2 animate-status-aura", currentStatusOption.color)} />
                {currentStatusOption.label}
              </Badge>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col gap-2">
            <Button onClick={onChangePhoto} variant="ghost" size="sm" className="bg-white/20 border border-white/30 text-white hover:bg-white/30 hover:text-white btn-hover-scale animate-button-entry" style={{ animationDelay: '0s' }}>
              <Camera className="size-4 mr-2" />
              <span className="hidden sm:inline">Change Photo</span>
            </Button>
            {profile?.avatar && (
              <Button onClick={onRemovePhoto} variant="ghost" size="sm" className="bg-white/20 border border-white/30 text-white hover:bg-red-500/30 hover:text-white btn-hover-scale animate-button-entry" style={{ animationDelay: '0.05s' }} disabled={isSaving}>
                <Trash2 className="size-4 mr-2" />
                <span className="hidden sm:inline">Remove Photo</span>
              </Button>
            )}
            <Button onClick={onLogout} variant="ghost" size="sm" className="bg-white/20 border border-white/30 text-white hover:bg-white/30 hover:text-white btn-hover-scale animate-button-entry" style={{ animationDelay: '0.1s' }}>
              <LogOut className="size-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
