import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth, googleProvider } from '@/lib/firebase';
import { ensureUserDoc } from '@/lib/firestore';
import { toAppUser, type AppUser } from '@/types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
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

  const signIn = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication?.idToken;
        console.log('[Auth] GoogleAuth.signIn() result:', {
          hasIdToken: !!idToken,
          idTokenType: typeof idToken,
          idTokenLength: idToken?.length ?? 0,
          email: googleUser.email ?? null,
        });
        if (!idToken) {
          throw new Error('Google Sign-In failed: no ID token returned. Make sure the serverClientId in capacitor.config.ts matches a valid Web Client ID in the Google Cloud Console.');
        }
        const credential = GoogleAuthProvider.credential(idToken, null);
        await signInWithCredential(auth, credential);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Auth] Native Google Sign-In failed:', msg, err);
        throw new Error(`Sign-in failed: ${msg}`);
      }
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  };

  const signOut = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleAuth.signOut();
      } catch {
        // Best-effort — Firebase sign-out is the critical part
      }
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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
