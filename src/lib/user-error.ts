/**
 * Plain-English error text for toasts and inline errors.
 *
 * Prefers the server's message (the API writes user-facing messages that say
 * what happened and what to do). When there is none, explains the likely
 * cause in words instead of showing technical text such as
 * "Request failed with status code 409" or "Network Error".
 *
 * `action` completes the sentence "We couldn't …", e.g. "remove the driver
 * from this load".
 */
export function userErrorMessage(error: unknown, action: string): string {
  const err = error as any;
  const serverMessage = err?.response?.data?.message;
  if (typeof serverMessage === "string" && serverMessage.trim()) {
    return serverMessage.trim();
  }

  const status: number | undefined = err?.response?.status;
  const technical = (message: string) =>
    /network error|status code \d{3}|timeout of \d+ms|econn|failed to fetch|aborted/i.test(message);

  if (!status) {
    if (err?.code === "ECONNABORTED" || /timeout/i.test(String(err?.message ?? ""))) {
      return `We couldn't ${action} because the request took too long. Check your connection and try again.`;
    }
    if (err?.request || /network error|failed to fetch/i.test(String(err?.message ?? ""))) {
      return `We couldn't ${action} because the server couldn't be reached. Check your internet connection and try again.`;
    }
    // Messages we raised ourselves in the app are already written for users.
    if (typeof err?.message === "string" && err.message.trim() && !technical(err.message)) {
      return err.message.trim();
    }
    return `We couldn't ${action}. Please try again.`;
  }

  if (status === 401) return "Your session has ended. Please sign in again.";
  if (status === 403) return `You don't have permission to ${action}.`;
  if (status === 404) return `We couldn't ${action} because it's no longer available. Refresh the page and try again.`;
  if (status === 409) return `We couldn't ${action} because something changed in the meantime. Refresh the page and try again.`;
  if (status === 413) return `We couldn't ${action} because the file is too large. Choose a smaller file and try again.`;
  if (status === 429) return "You're doing that too quickly. Wait a moment, then try again.";
  if (status >= 500) return `We couldn't ${action} because of a problem on our side. Please try again in a moment.`;
  return `We couldn't ${action}. Please check the details and try again.`;
}
