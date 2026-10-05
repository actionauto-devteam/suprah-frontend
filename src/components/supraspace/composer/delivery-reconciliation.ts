import { isAxiosError, type AxiosRequestConfig } from 'axios';
import { apiClient } from '@/lib/api-client';
import type { SSMessage } from '@/hooks/useSupraSpaceSocket';

export type DeliveryReconciliation =
  | { status: 'found'; message: SSMessage }
  | { status: 'missing' }
  | { status: 'unknown' };

export async function reconcileSupraSpaceDelivery(
  token: string | null,
  conversationId: string,
  clientMessageId: string,
): Promise<DeliveryReconciliation> {
  if (!token) return { status: 'unknown' };

  try {
    const response = await apiClient.get(
      `/api/supraspace/conversations/${conversationId}/messages/${clientMessageId}`,
      { headers: { Authorization: `Bearer ${token}` }, _skipAuthRefresh: true } as AxiosRequestConfig & { _skipAuthRefresh?: boolean },
    );
    const message = response.data?.data as SSMessage | undefined;
    if (message?._id === clientMessageId && message.conversationId === conversationId) {
      return { status: 'found', message };
    }
    return { status: 'unknown' };
  } catch (error) {
    return isAxiosError(error) && error.response?.status === 404
      ? { status: 'missing' }
      : { status: 'unknown' };
  }
}
