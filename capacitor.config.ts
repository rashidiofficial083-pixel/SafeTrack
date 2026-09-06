import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safetrack.app',
  appName: 'SafeTrack',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      // Replace with the Web Client ID from Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration
      googleClientId: '406687971030-tchi81q1nd9euqkci2df5t69sd8lkujd.apps.googleusercontent.com',
    },
  },
};

export default config;
