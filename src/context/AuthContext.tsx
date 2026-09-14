import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { auth, googleProvider } from '@/lib/firebase';
import { ensureUserDoc } from '@/lib/firestore';
import { toAppUser, type AppUser } from '@/types';

const GOOGLE_WEB_CLIENT_ID =
  '406687971030-tchi81q1nd9euqkci2df5t69sd8lkujd.apps.googleusercontent.com';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      SocialLogin.initialize({
        google: { webClientId: GOOGLE_WEB_CLIENT_ID },
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (fbUser) {
        const appUser = toAppUser(fbUser);
        try {
          await ensureUserDoc(appUser);
        } catch (e) {
          console.error('Failed to ensure user doc:', e);
        }
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(fbUser, { displayName: name });
    // Re-read so ensureUserDoc gets the updated displayName
    const appUser = toAppUser({ ...fbUser, displayName: name } as User);
    await ensureUserDoc(appUser);
    setUser(appUser);
  };

  const signInWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      const loginResult = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['profile', 'email'] },
      });
      const googleResult = loginResult.result;
      const idToken =
        googleResult.responseType === 'online' ? googleResult.idToken : null;
      if (!idToken) {
        throw new Error('Google Sign-In failed: no ID token returned. Make sure the webClientId matches a valid Web Client ID in Google Cloud Console.');
      }
      const credential = GoogleAuthProvider.credential(idToken, null);
      await signInWithCredential(auth, credential);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await SocialLogin.logout({ provider: 'google' });
      } catch {
        // Best-effort — Firebase sign-out is the critical part
      }
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, sendPasswordReset, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
