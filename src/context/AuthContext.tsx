import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
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
        const result = await FirebaseAuthentication.signInWithGoogle();
        console.log('[Auth] Native sign-in result:', {
          userUid: result.user?.uid ?? null,
          userEmail: result.user?.email ?? null,
          hasCredential: !!result.credential,
          credentialProviderId: result.credential?.providerId ?? null,
          hasIdToken: !!result.credential?.idToken,
          idTokenType: typeof result.credential?.idToken,
        });
        if (!result.user?.uid) {
          throw new Error('Google Sign-In failed: no user returned from native sign-in');
        }
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
        await FirebaseAuthentication.signOut();
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
