import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from "dompurify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes input string to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof window === 'undefined') return input;
  return DOMPurify.sanitize(input);
}

/**
 * Keeps a promise's loading state visible for at least `minMs`, even if it resolves
 * instantly — used for quick-action buttons (pause/resume/stop toggles) where an
 * instant flip reads as "did that even do anything?" rather than a real confirmed action.
 */
export function withMinDuration<T>(promise: Promise<T>, minMs = 500): Promise<T> {
  const delay = new Promise<void>((resolve) => setTimeout(resolve, minMs));
  return Promise.all([promise, delay]).then(([result]) => result);
}

export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const databaseAvatar = trimmed.match(/^db:([a-f\d]{24})(\?[^\s#]*)?$/i);
  if (databaseAvatar) return `${API_BASE_URL}/api/crm/avatars/db-${databaseAvatar[1]}${databaseAvatar[2] || ''}`;
  const avatarFileName = (value: string): string | null => {
    const match = value.match(/^avatars\/(\d{13}-\d{1,10}\.(?:jpe?g|png|webp|gif))$/i);
    return match?.[1] || null;
  };
  const avatarKey = avatarFileName(trimmed);
  if (avatarKey) return `${API_BASE_URL}/api/crm/avatars/${encodeURIComponent(avatarKey)}`;

  // If it's already an absolute URL (Cloudflare R2, Google, Data URI, or local blob), return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    try {
      const parsed = new URL(trimmed);
      const legacyAvatar = parsed.hostname.endsWith('.r2.dev')
        ? avatarFileName(parsed.pathname.slice(1))
        : null;
      if (legacyAvatar) return `${API_BASE_URL}/api/crm/avatars/${encodeURIComponent(legacyAvatar)}`;
    } catch {
      return undefined;
    }
    return trimmed;
  }

  // Protocol-relative URLs occasionally show up in imported inventory feeds.
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // If it's a relative path (Legacy local uploads), prepend the Backend API URL
  // Ensure we don't double slash
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Extracts initials from a name string.
 * Example: "John Doe" -> "JD", "Jane" -> "J", "John M. Doe" -> "JD"
 */
export function getInitials(name?: string | null): string {
  if (!name) return 'AA'; // Default fallback

  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 0) return 'AA';
  
  if (parts.length === 1) {
    return parts[0].substring(0, 1).toUpperCase();
  }

  // Get first letter of first and last parts
  const firstInitial = parts[0].substring(0, 1).toUpperCase();
  const lastInitial = parts[parts.length - 1].substring(0, 1).toUpperCase();
  
  return `${firstInitial}${lastInitial}`;
}
