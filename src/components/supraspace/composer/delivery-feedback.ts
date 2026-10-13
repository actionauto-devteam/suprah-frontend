export const SUPRA_SPACE_DELIVERY_TIMEOUT_MS = 120_000;

type DeliveryError = {
  code?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    data?: unknown;
  };
};

function responseMessage(error: DeliveryError): string | null {
  const data = error.response?.data;
  const value = data && typeof data === 'object' && 'message' in data
    ? (data as { message?: unknown }).message
    : data;
  if (typeof value !== 'string') return null;
  const message = value.trim();
  if (!message || /timeout|timed out|\b\d{4,}\s*ms\b/i.test(message)) return null;
  return message;
}

export function getSupraSpaceDeliveryFailureMessage(error: unknown, item: 'message' | 'GIF' | 'attachment'): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return "You're offline. Reconnect to the internet, then retry safely.";
  }

  const deliveryError = (error && typeof error === 'object' ? error : {}) as DeliveryError;
  const status = Number(deliveryError.response?.status);
  const code = String(deliveryError.code || '').toUpperCase();
  const message = String(deliveryError.message || '');
  const timedOut = code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout|timed out/i.test(message);

  if (timedOut || status === 408 || status === 504) {
    return 'Sending took longer than expected. Your connection may be slow or SupraSpace may be busy. Retry safely; your draft is kept.';
  }
  if (status === 429) {
    return 'SupraSpace is busy right now. Please wait a moment, then retry safely.';
  }
  if (status >= 500) {
    return 'SupraSpace is temporarily unavailable. Please retry in a moment; your draft is kept.';
  }
  if (/delivery was not confirmed/i.test(message)) {
    return `SupraSpace did not confirm this ${item}. Retry safely; your draft is kept.`;
  }
  if (!deliveryError.response) {
    return "We couldn't reach SupraSpace. Check your connection, then retry safely.";
  }

  return responseMessage(deliveryError) || `We couldn't send this ${item}. Please retry safely.`;
}
