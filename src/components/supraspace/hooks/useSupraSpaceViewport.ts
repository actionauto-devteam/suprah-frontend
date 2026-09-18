'use client';

import { useEffect, useState } from 'react';

export function useSupraSpaceViewport(enabled: boolean) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const properties = ['--ss4-vvh', '--ss4-vv-top', '--ss4-safe-bottom', '--ss4-ios-keyboard-accessory-height'];
    const previous = properties.map(property => root.style.getPropertyValue(property));
    const hadKeyboardClass = root.classList.contains('ss4-ios-keyboard-open');
    let frame = 0;
    let baselineHeight = window.innerHeight;
    let baselineWidth = window.innerWidth;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = viewport?.height || window.innerHeight;
        const top = viewport?.offsetTop || 0;
        const active = document.activeElement;
        const focused = active instanceof HTMLElement && active.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), [contenteditable="true"]');
        if (Math.abs(window.innerWidth - baselineWidth) > 80) {
          baselineWidth = window.innerWidth;
          baselineHeight = window.innerHeight;
        }
        if (!focused) baselineHeight = window.innerHeight;
        const keyboard = focused && (viewport?.scale ?? 1) === 1 && Math.max(baselineHeight, window.innerHeight) - height - top > 100;
        root.style.setProperty('--ss4-vvh', `${height}px`);
        root.style.setProperty('--ss4-vv-top', `${top}px`);
        root.style.setProperty('--ss4-safe-bottom', keyboard ? '0px' : 'env(safe-area-inset-bottom, 0px)');
        root.style.setProperty('--ss4-ios-keyboard-accessory-height', '0px');
        root.classList.toggle('ss4-ios-keyboard-open', keyboard);
        setKeyboardOpen(current => current === keyboard ? current : keyboard);
      });
    };
    const settle = () => {
      update();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(update, 300);
    };
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('pageshow', settle);
    document.addEventListener('focusin', settle);
    document.addEventListener('focusout', settle);
    document.addEventListener('visibilitychange', settle);
    update();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('pageshow', settle);
      document.removeEventListener('focusin', settle);
      document.removeEventListener('focusout', settle);
      document.removeEventListener('visibilitychange', settle);
      properties.forEach((property, index) => {
        if (previous[index]) root.style.setProperty(property, previous[index]);
        else root.style.removeProperty(property);
      });
      root.classList.toggle('ss4-ios-keyboard-open', hadKeyboardClass);
    };
  }, [enabled]);

  return keyboardOpen;
}
