import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';

export function useOpenDm() {
    const { getToken } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);

    const openDm = React.useCallback(async (targetUserId: string) => {
        if (loading) return;
        setLoading(true);
        try {
            let crmToken: string | null = null;
            if (typeof window !== 'undefined') {
                crmToken = localStorage.getItem('crm_token');
            }

            if (!crmToken) {
                const mainToken = await getToken();
                if (!mainToken) throw new Error('Not authenticated');
                try {
                    const sso = await apiClient.post(
                        '/api/supraspace/session-token',
                        {},
                        { headers: { Authorization: `Bearer ${mainToken}` } }
                    );
                    crmToken = sso.data?.data?.token ?? null;
                    if (crmToken && typeof window !== 'undefined') {
                        localStorage.setItem('crm_token', crmToken);
                    }
                } catch {
                    try {
                        const sso = await apiClient.get(
                            '/api/auth/crm-sso',
                            { headers: { Authorization: `Bearer ${mainToken}` } }
                        );
                        crmToken = sso.data?.data?.token ?? null;
                        if (crmToken && typeof window !== 'undefined') {
                            localStorage.setItem('crm_token', crmToken);
                        }
                    } catch {}
                }
            }

            if (!crmToken) throw new Error('Messaging access unavailable');

            const dmRes = await apiClient.post(
                '/api/supraspace/conversations/direct',
                { targetUserId },
                { headers: { Authorization: `Bearer ${crmToken}` } }
            );

            const conv = dmRes.data?.data;
            if (!conv?._id) throw new Error('Failed to open conversation');

            router.push(`/crm/supra-space?convId=${conv._id}`);
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Could not open conversation';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [loading, getToken, router]);

    return { openDm, loading };
}
