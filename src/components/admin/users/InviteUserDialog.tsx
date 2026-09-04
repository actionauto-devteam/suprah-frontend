'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  { value: 'member', label: 'Member', hint: 'Standard dealership access' },
  { value: 'admin', label: 'Admin', hint: 'Manages the dealership and its team' },
  { value: 'customer', label: 'Customer', hint: 'Customer portal access only' },
];

interface Org { _id: string; name: string }

export function InviteUserDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { getToken } = useAuth();
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('member');
  const [orgId, setOrgId] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const { data: orgs } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: async () => {
      const res = await apiClient.get('/api/admin/organizations?limit=100');
      return (res.data?.data?.organizations || []) as Org[];
    },
    enabled: open,
  });

  const submit = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      const res = await apiClient.post(
        '/api/admin/users/invite',
        { email: email.trim(), role, organizationId: orgId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(res.data?.message || 'Invitation created');
      setEmail('');
      onOpenChange(false);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to send the invitation');
    } finally {
      setBusy(false);
    }
  };

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && Boolean(orgId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" /> Invite a user
          </DialogTitle>
          <DialogDescription>
            They receive an invitation link valid for 7 days. Drivers are invited from the Drivers page instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Email address</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@dealership.com"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Dealership</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a dealership" />
              </SelectTrigger>
              <SelectContent>
                {(orgs || []).map(org => (
                  <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col items-start">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.hint}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !valid}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
