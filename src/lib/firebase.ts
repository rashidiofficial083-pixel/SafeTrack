// ============================================================
// PASTE YOUR FIREBASE CONFIG HERE
// Get this from Firebase Console > Project Settings
// ============================================================
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
