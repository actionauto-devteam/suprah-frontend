import { useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from "@/providers/AuthProvider";

interface UseAppointmentPollingOptions {
  appointmentId: string | null;
  onUpdate: (appointment: any) => void;
  onNotFound?: () => void;
  enabled: boolean;
  intervalMs?: number;
}

/**
 * Hook to poll for appointment updates in real-time.
 * Detects guest RSVP changes from Google Calendar.
 *
 * Important lifecycle behavior:
 * - only one request is allowed in flight at a time;
 * - the active request is aborted as soon as polling is disabled/unmounted;
 * - a 404 is treated as a terminal "appointment no longer exists" result;
 * - expected polling 404s are marked for apiClient so dev mode does not
 *   surface them as application crashes.
 */
export function useAppointmentPolling({
  appointmentId,
  onUpdate,
  onNotFound,
  enabled,
  intervalMs = 10000, // Poll every 10 seconds
}: UseAppointmentPollingOptions) {
  const { getToken, isSignedIn } = useAuth();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);
  const stoppedForNotFoundRef = useRef(false);
  const lastFetchRef = useRef<string>('');

  const stopPolling = useCallback((abortActiveRequest = true) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (abortActiveRequest && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchAppointment = useCallback(async () => {
    if (
      !appointmentId ||
      !isSignedIn ||
      !enabled ||
      stoppedForNotFoundRef.current ||
      isFetchingRef.current
    ) {
      return;
    }

    isFetchingRef.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await getToken();
      if (!token || controller.signal.aborted) return;

      // `_appointmentPolling` is an internal diagnostic marker consumed only
      // by apiClient. The request still rejects normally on non-2xx responses.
      const requestConfig: any = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        _appointmentPolling: true,
      };

      const response = await apiClient.get(
        `/api/appointments/${appointmentId}`,
        requestConfig
      );

      if (controller.signal.aborted) return;

      const appointment = response.data?.data || response.data;

      // Compare with last fetch to detect changes.
      const currentData = JSON.stringify(appointment.guestEmails);
      if (lastFetchRef.current && lastFetchRef.current !== currentData) {
        console.log('[useAppointmentPolling] Guest status changed, updating UI');
        onUpdate(appointment);
      }
      lastFetchRef.current = currentData;
    } catch (error: any) {
      const isCanceled =
        controller.signal.aborted ||
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError' ||
        error?.message === 'canceled';

      if (isCanceled) return;

      if (error?.response?.status === 404) {
        // The record is gone. Continuing the interval would only generate
        // repeated 404s, so make this a terminal polling state.
        stoppedForNotFoundRef.current = true;
        stopPolling(false);
        lastFetchRef.current = '';
        onNotFound?.();
        return;
      }

      // Unexpected failures remain visible to developers, but polling itself
      // is fail-soft and does not throw into the component tree.
      console.error('[useAppointmentPolling] Error fetching appointment:', error);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      isFetchingRef.current = false;
    }
  }, [
    appointmentId,
    isSignedIn,
    enabled,
    getToken,
    onUpdate,
    onNotFound,
    stopPolling,
  ]);

  useEffect(() => {
    // A new appointment/open cycle gets a fresh polling state.
    stoppedForNotFoundRef.current = false;
    lastFetchRef.current = '';

    if (!enabled || !appointmentId) {
      stopPolling();
      return;
    }

    void fetchAppointment();
    pollIntervalRef.current = setInterval(() => {
      void fetchAppointment();
    }, intervalMs);

    return () => {
      stopPolling();
      isFetchingRef.current = false;
    };
  }, [enabled, appointmentId, fetchAppointment, intervalMs, stopPolling]);

  const refresh = useCallback(() => {
    void fetchAppointment();
  }, [fetchAppointment]);

  return { refresh };
}