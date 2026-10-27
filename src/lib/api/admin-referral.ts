import { apiClient } from '../api-client';
import { Transaction } from './wallet';

export interface EnrichedWithdrawal extends Transaction {
    user: {
        name: string;
        email: string;
    };
}

export interface CreditLineageEntry {
    _id: string;
    amount: number;
    note: string;
    createdAt: string;
    referralId: string;
    referralInfo?: {
        name: string;
        email: string;
        dateJoined: string;
    };
    loadInfo?: {
        _id: string;
        status: string;
        origin?: string;
        destination?: string;
        trackingNumber?: string;
    };
    paymentInfo?: {
        amount: number;
        status: string;
        stripeChargeId?: string;
        receiptUrl?: string;
        invoiceNumber?: string;
        createdAt: string;
    };
}

export interface WithdrawalAuditData {
    request: Transaction;
    lineage: CreditLineageEntry[];
}

export const getPendingWithdrawals = async () => {
    const response = await apiClient.get<{ success: boolean; data: EnrichedWithdrawal[] }>('/api/admin/referrals/withdrawals');
    return response.data.data;
};

export const getWithdrawalAudit = async (transactionId: string) => {
    const response = await apiClient.get<{ success: boolean; data: WithdrawalAuditData }>(`/api/admin/referrals/withdrawals/${transactionId}/audit`);
    return response.data.data;
};

export const approveWithdrawal = async (transactionId: string) => {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/api/admin/referrals/withdrawals/${transactionId}/approve`);
    return response.data;
};

export const rejectWithdrawal = async (transactionId: string, reason: string) => {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/api/admin/referrals/withdrawals/${transactionId}/reject`, { reason });
    return response.data;
};
