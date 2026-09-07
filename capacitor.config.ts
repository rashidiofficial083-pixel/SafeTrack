import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safetrack.app',
  appName: 'SafeTrack',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '406687971030-tchi81q1nd9euqkci2df5t69sd8lkujd.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
