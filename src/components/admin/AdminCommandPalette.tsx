'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Building2, Users, Truck, CreditCard, ClipboardList, Bell, Search, Moon, Sun,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const PAGES = [
  { label: 'Operations', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Review queue', href: '/admin/review-queue', icon: ClipboardList },
  { label: 'Drivers', href: '/admin/drivers', icon: Truck },
  { label: 'Dealerships', href: '/admin/organizations', icon: Building2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payouts', href: '/admin/payouts', icon: CreditCard },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
];

interface DriverHit { id: string; name: string; email: string }
interface OrgHit { _id: string; name: string; slug?: string }

export function AdminCommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const router = useRouter();
  const { getToken } = useAuth();
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const { data: drivers } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiClient.get('/api/admin/drivers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (res.data?.data?.drivers || []) as DriverHit[];
    },
    enabled: open,
    staleTime: 60000,
  });

  const { data: orgs } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: async () => {
      const res = await apiClient.get('/api/admin/organizations?limit=100');
      return (res.data?.data?.organizations || []) as OrgHit[];
    },
    enabled: open,
    staleTime: 60000,
  });

  const run = (fn: () => void) => {
    setOpen(false);
    setQuery('');
    fn();
  };

  const term = query.trim().toLowerCase();
  const driverHits = term
    ? (drivers || []).filter(d =>
        d.name?.toLowerCase().includes(term) || d.email?.toLowerCase().includes(term),
      ).slice(0, 6)
    : [];
  const orgHits = term
    ? (orgs || []).filter(o => o.name?.toLowerCase().includes(term)).slice(0, 5)
    : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted sm:flex"
      >
        <Search className="size-3.5" />
        <span>Search…</span>
        <kbd className="ml-2 rounded border border-border bg-background px-1 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Admin search"
        description="Jump to a page, driver, or dealership"
        className="sm:max-w-xl"
      >
        <CommandInput
          placeholder="Search drivers, dealerships, or pages…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>

          <CommandGroup heading="Go to">
            {PAGES.map(page => (
              <CommandItem
                key={page.href}
                value={`page ${page.label}`}
                onSelect={() => run(() => router.push(page.href))}
              >
                <page.icon className="text-muted-foreground" />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {driverHits.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Drivers">
                {driverHits.map(driver => (
                  <CommandItem
                    key={driver.id}
                    value={`driver ${driver.name} ${driver.email}`}
                    onSelect={() => run(() => router.push(`/admin/drivers/${driver.id}`))}
                  >
                    <Truck className="text-muted-foreground" />
                    <span className="flex-1 truncate">{driver.name || 'Unknown'}</span>
                    <span className="truncate text-xs text-muted-foreground">{driver.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {orgHits.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Dealerships">
                {orgHits.map(org => (
                  <CommandItem
                    key={org._id}
                    value={`org ${org.name}`}
                    onSelect={() => run(() => router.push('/admin/organizations'))}
                  >
                    <Building2 className="text-muted-foreground" />
                    <span className="flex-1 truncate">{org.name}</span>
                    {org.slug && <span className="text-xs text-muted-foreground">{org.slug}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              value="toggle theme dark light mode"
              onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun className="text-muted-foreground" /> : <Moon className="text-muted-foreground" />}
              Switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
