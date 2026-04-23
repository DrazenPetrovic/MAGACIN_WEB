import type { CapacitorConfig } from '@capacitor/cli';

// Za APK produkciju: postavi VITE_API_URL u .env na stvarnu IP servera
// npr: VITE_API_URL=http://192.168.1.100:3005
// zatim: npm run build && npx cap sync android

const config: CapacitorConfig = {
  appId: 'com.karpas.magacin',
  appName: 'Magacin Karpas',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
