'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { PopulatedUser } from '@/types/driver-profile';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2, ShieldCheck, ShieldAlert, ChevronRight, Search,
  UserCheck, AlertTriangle, Truck, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface OrgDriver {
  _id: string;
  userId: string | PopulatedUser;
  truckMake?: string;
  truckModel?: string;
  operationalStatus?: string;
  profileCompletionScore?: number;
  isComplianceExpired?: boolean;
  verificationStatus?: string;
}

const getUser = (u: string | PopulatedUser): PopulatedUser | null =>
  typeof u === 'object' && u !== null ? u : null;

const getInitials = (name?: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
};

export function DriverVerificationPanel() {
  const { getToken } = useAuth();
  const [drivers, setDrivers] = useState<OrgDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDrivers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get('/api/driver-profile/org', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDrivers(res.data?.data || []);
    } catch {
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const filtered = drivers.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const user = getUser(d.userId);
    return user?.name?.toLowerCase().includes(q) ||
      user?.email?.toLowerCase().includes(q) ||
      d.truckMake?.toLowerCase().includes(q) ||
      d.truckModel?.toLowerCase().includes(q) ||
      (typeof d.userId === 'string' && d.userId.toLowerCase().includes(q));
  });

  const activeCount = drivers.filter(d => d.operationalStatus === 'active').length;
  const expiredCount = drivers.filter(d => d.isComplianceExpired).length;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-black">Drivers</h3>
          <Badge variant="outline" className="text-[10px] h-5 font-bold">{drivers.length} total</Badge>
          {activeCount > 0 && <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{activeCount} active</Badge>}
          {expiredCount > 0 && <Badge variant="destructive" className="text-[10px] h-5 gap-0.5"><AlertTriangle className="size-2.5" />{expiredCount} expired</Badge>}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="h-10 sm:h-8 pl-8 text-base sm:text-xs" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ShieldCheck className="size-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">{search ? 'No drivers match your search' : 'No drivers found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((driver, idx) => {
            const user = getUser(driver.userId);
            const driverId = !driver.userId ? driver._id : typeof driver.userId === 'string' ? driver.userId : driver.userId._id;

            return (
              <motion.div key={driver._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                <Link href={`/settings/drivers/${driverId}`}
                  className={cn('flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all group',
                    driver.isComplianceExpired ? 'border-red-500/15 hover:border-red-500/30 hover:bg-red-500/3' :
                      'border-border/20 hover:border-primary/20 hover:bg-muted/10 hover:shadow-md')}>
                  <Avatar className="size-10 border border-border/20 shrink-0">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className={cn('font-bold text-xs',
                      driver.isComplianceExpired ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary')}>
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">{user?.name || 'Unknown Driver'}</span>
                      <Badge className={cn('text-[9px] h-4 px-1.5 border-0 capitalize shrink-0',
                        driver.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-600' :
                          driver.verificationStatus === 'under_review' ? 'bg-amber-500/10 text-amber-600' :
                            driver.verificationStatus === 'rejected' ? 'bg-red-500/10 text-red-600' :
                              'bg-muted/30 text-muted-foreground')}>
                        {(driver.verificationStatus || 'pending').replace(/_/g, ' ')}
                      </Badge>
                      {driver.isComplianceExpired && <Badge variant="destructive" className="text-[9px] h-4 gap-0.5 shrink-0"><AlertTriangle className="size-2.5" /> Expired</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {user?.email && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Mail className="size-2.5" />{user.email}</span>}
                      {(driver.truckMake || driver.truckModel) && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Truck className="size-2.5" />{[driver.truckMake, driver.truckModel].filter(Boolean).join(' ')}</span>
                      )}
                      <span className={cn('text-[10px] font-semibold capitalize',
                        driver.operationalStatus === 'active' ? 'text-emerald-500' :
                          driver.operationalStatus === 'maintenance' ? 'text-amber-500' : 'text-muted-foreground')}>
                        {driver.operationalStatus || 'unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:block text-right">
                      <span className={cn('text-lg font-black tabular-nums',
                        (driver.profileCompletionScore || 0) >= 80 ? 'text-emerald-500' :
                          (driver.profileCompletionScore || 0) >= 50 ? 'text-amber-500' : 'text-red-500')}>
                        {driver.profileCompletionScore || 0}%
                      </span>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase">Profile</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
