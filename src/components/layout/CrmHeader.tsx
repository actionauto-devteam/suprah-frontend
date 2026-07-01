'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Car, ChevronDown, User, Fingerprint, Settings, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiClient } from '@/lib/api-client';
import { useCrmUser } from '@/hooks/useCrmUser';
import { CrmNotificationBell } from '@/components/notifications';
import { MessengerDropdown } from '@/components/supraspace/MessengerDropdown';

const MDT_OFFSET_MS = -6 * 60 * 60 * 1000;
const toMDT = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS);

function ini(n: string) {
  return n.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function LiveClock() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const mdtNow = toMDT(now);
  const timeStr = mdtNow.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group relative inline-flex items-center gap-2 sm:gap-2.5 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 cursor-default select-none overflow-hidden border border-emerald-200/80 dark:border-emerald-500/20 bg-linear-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 backdrop-blur-sm hover:border-emerald-300/80 dark:hover:border-emerald-400/30 transition-all duration-300">
          <div className="absolute inset-0 bg-linear-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          </span>
          <span className="font-mono text-xs font-bold tabular-nums tracking-wide text-emerald-700 dark:text-emerald-400">
            {timeStr}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
      >
        <p className="text-xs">
          {mdtNow.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

type CrmHeaderProps = {
  showMessenger?: boolean;
};

export function CrmHeader({ showMessenger = false }: CrmHeaderProps) {
  const router = useRouter();
  const { user, token } = useCrmUser();

  const handleExit = async () => {
    try {
      await apiClient.post('/api/crm/logout', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch { }
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/60 bg-zinc-100/85 dark:bg-zinc-950/80 backdrop-blur-xl transition-colors duration-300">
      <div className="flex items-center justify-between gap-2 h-14 sm:h-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <div className="relative h-9 w-9 shrink-0 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/20 dark:shadow-emerald-900/50">
            <Car className="h-4 w-4 text-white" />
            <div className="absolute inset-0 rounded-xl ring-1 ring-emerald-400/30" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-black text-zinc-900 dark:text-white leading-none tracking-tight">
              Action Auto
            </p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-500 mt-0.5 font-bold">
              Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LiveClock />

          <CrmNotificationBell />

          {showMessenger && <MessengerDropdown />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 pl-1.5 pr-3 rounded-full border border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-100/85 dark:bg-zinc-900/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 hover:border-zinc-300/60 dark:hover:border-zinc-600/60 backdrop-blur-sm transition-all duration-200"
              >
                <Avatar className="h-6 w-6 ring-1 ring-emerald-500/30">
                  <AvatarImage src={user?.avatarSrc} />
                  <AvatarFallback className="bg-linear-to-br from-emerald-600 to-emerald-800 text-white text-[9px] font-black">
                    {user ? ini(user.fullName) : 'AA'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-xs font-semibold text-zinc-700 dark:text-zinc-200 max-w-25 truncate">
                  {user?.fullName || ''}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 rounded-2xl p-0 overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/50 border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-100/95 dark:bg-zinc-900/95 backdrop-blur-xl"
            >
              <div className="p-4 bg-linear-to-br from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20">
                    <AvatarImage src={user?.avatarSrc} />
                    <AvatarFallback className="bg-linear-to-br from-emerald-600 to-emerald-800 text-white text-xs font-black">
                      {user ? ini(user.fullName) : 'AA'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator className="m-0 bg-zinc-100 dark:bg-zinc-800/60" />
              <div className="p-1.5">
                <DropdownMenuItem
                  onClick={() => router.push('/crm/profile')}
                  className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-800/60"
                >
                  <User className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/crm/biometrics')}
                  className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-800/60"
                >
                  <Fingerprint className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" /> Biometrics
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/crm/settings')}
                  className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-800/60"
                >
                  <Settings className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" /> Settings
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="m-0 bg-zinc-100 dark:bg-zinc-800/60" />
              <div className="p-1.5">
                <DropdownMenuItem
                  onClick={handleExit}
                  className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-red-500 dark:text-red-400 focus:text-red-600 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-500/10"
                >
                  <LogOut className="h-3.5 w-3.5" /> Exit CRM
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
