import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.renew90.journal',
  appName: 'Renew90',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for debugging
  },
  plugins: {
    // RevenueCat configuration will use API keys from environment
  },
  server: {
    // For development, you can set the URL to your dev server
    // url: 'http://localhost:5173',
    // cleartext: true,
  }
};

export default config;
