import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safetrack.app',
  appName: 'SafeTrack',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      googleClientId: '406687971030-tchi81q1nd9euqkci2df5t69sd8lkujd.apps.googleusercontent.com',
    },
  },
};

export default config;
