import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safetrack.app',
  appName: 'SafeTrack',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      // Replace with the Web Client ID from Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration
      googleClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    },
  },
};

export default config;
