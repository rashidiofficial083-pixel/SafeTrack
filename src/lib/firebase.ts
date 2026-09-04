// ============================================================
// PASTE YOUR FIREBASE CONFIG HERE
// Get this from Firebase Console > Project Settings
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBnFWolAfZPz2D0AxpkGFKJXAmphJ__lz4",
  authDomain: "safe-track-4d2e1.firebaseapp.com",
  projectId: "safe-track-4d2e1",
  storageBucket: "safe-track-4d2e1.firebasestorage.app",
  messagingSenderId: "406687971030",
  appId: "1:406687971030:web:b59c6ecb24319595d9fb77"
};

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
