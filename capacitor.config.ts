import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.suprah.app',
  appName: 'Suprah',
  webDir: 'dist',
  appendUserAgent: 'SuprahiOSApp',
  ios: {
    appendUserAgent: 'SuprahiOSApp',
  },
  server: {
    url: 'https://www.suprah-app.com',
    cleartext: false,
  },
};

export default config;