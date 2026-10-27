// src/hooks/useIsNativeApp.ts
import { Capacitor } from '@capacitor/core';

export const useIsNativeApp = () => Capacitor.isNativePlatform();