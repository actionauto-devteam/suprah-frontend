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
    return "You're offline. Reconnect, then tap Retry.";
  }

  const deliveryError = (error && typeof error === 'object' ? error : {}) as DeliveryError;
  const status = Number(deliveryError.response?.status);
  const code = String(deliveryError.code || '').toUpperCase();
  const message = String(deliveryError.message || '');
  const timedOut = code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout|timed out/i.test(message);

  if (timedOut || status === 408 || status === 504) {
    return "Didn't send yet. Check your connection, then tap Retry.";
  }
  if (status === 429) {
    return 'SupraSpace is busy. Tap Retry in a moment.';
  }
  if (status >= 500) {
    return 'SupraSpace is unavailable. Tap Retry in a moment.';
  }
  if (/delivery was not confirmed/i.test(message)) {
    return `Couldn't confirm this ${item} was sent. Tap Retry.`;
  }
  if (!deliveryError.response) {
    return "Couldn't reach SupraSpace. Check your connection, then tap Retry.";
  }

  return responseMessage(deliveryError) || `Couldn't send this ${item}. Tap Retry.`;
}
