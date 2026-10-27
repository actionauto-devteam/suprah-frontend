import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.suprah.app',
  appName: 'Suprah',
  webDir: 'dist',
  server: {
    url: 'https://suprah-app.com',
    cleartext: false
  }
};

export default config;