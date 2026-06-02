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

export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // If it's already an absolute URL (Cloudflare R2, Google, Data URI, or local blob), return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Protocol-relative URLs occasionally show up in imported inventory feeds.
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // If it's a relative path (Legacy local uploads), prepend the Backend API URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
