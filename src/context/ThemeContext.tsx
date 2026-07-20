"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";

type Theme = 'light' | 'dark';
const THEME_SWITCHING_CLASS = 'theme-switching';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const REPAINT_OVERLAY_ID = 'theme-repaint-overlay';

function getInitialTheme(): Theme {
  // Always 'dark' here so the first client render matches the server-rendered
  // markup (the blocking inline script in layout.tsx already applies the real
  // saved theme class to <html> before paint, so there's no visual flash —
  // this only governs React state used by theme-aware components).
  return 'dark';
}

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  document.body?.setAttribute('data-theme', theme);
  document.body?.style.setProperty('color-scheme', theme);
}

function persistTheme(theme: Theme) {
  localStorage.setItem('theme', theme);
  apiClient.patch('/api/profile/theme', { theme }).catch(() => { });
}

function flushThemePaint() {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;
  const existingOverlay = document.getElementById(REPAINT_OVERLAY_ID);
  existingOverlay?.remove();

  const overlay = document.createElement('div');
  overlay.id = REPAINT_OVERLAY_ID;
  overlay.setAttribute('aria-hidden', 'true');

  root.classList.add(THEME_SWITCHING_CLASS);
  body?.classList.add(THEME_SWITCHING_CLASS);
  body?.appendChild(overlay);

  // Force style recalculation so the new theme repaints in a single pass.
  void root.offsetHeight;
  void overlay.offsetHeight;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove(THEME_SWITCHING_CLASS);
      body?.classList.remove(THEME_SWITCHING_CLASS);
      overlay.remove();
    });
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const { user } = useUser();
  const hasLocalSave = typeof window !== 'undefined' && localStorage.getItem('theme') !== null;

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved !== 'light' && saved !== 'dark') return;

    const rafId = window.requestAnimationFrame(() => {
      setThemeState(saved);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (hasLocalSave) return;
    if (user?.theme === 'light' || user?.theme === 'dark') {
      const resolvedTheme = user.theme as Theme;
      const rafId = window.requestAnimationFrame(() => {
        setThemeState(resolvedTheme);
        applyThemeToDOM(resolvedTheme);
      });

      return () => window.cancelAnimationFrame(rafId);
    }
  }, [user?.theme, hasLocalSave]);

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    if (newTheme === theme) return;

    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
    persistTheme(newTheme);
    flushThemePaint();
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyThemeToDOM(next);
      persistTheme(next);
      flushThemePaint();
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
