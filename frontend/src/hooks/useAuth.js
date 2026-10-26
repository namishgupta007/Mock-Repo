import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase.js';
import {
  registerDemoUser,
  loginDemoUser,
  guestDemoLogin,
  getActiveDemoSession,
  clearDemoSession,
  initializeDemoDatabase,
} from '../services/demoAuthService.js';

const MESSAGES = {
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/user-not-found': 'No account found for this email.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a bit and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  'auth/unauthorized-domain':
    'This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed':
    'This sign-in method is not enabled in the Firebase console yet.',
};

export function friendlyError(err) {
  return MESSAGES[err?.code] || err?.message || 'Something went wrong. Please try again.';
}

export const isDemoMode = !isFirebaseConfigured;
export const authMode = isFirebaseConfigured ? 'firebase' : 'demo';

const AuthContext = createContext(null);

function useAuthState() {
  const [user, setUser] = useState(() => (isDemoMode ? getActiveDemoSession() : null));
  const [ready, setReady] = useState(isDemoMode);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      getRedirectResult(auth).catch(() => { });
      return onAuthStateChanged(auth, (u) => {
        if (u) {
          setUser(u);
        } else {
          const demoSession = getActiveDemoSession();
          setUser(demoSession);
        }
        setReady(true);
      });
    }

    // In Local Demo Mode, ensure seed user exists and load stored session
    initializeDemoDatabase()
      .catch((err) => console.warn('Demo DB init note:', err))
      .finally(() => {
        const stored = getActiveDemoSession();
        setUser(stored);
        setReady(true);
      });
    return undefined;
  }, []);

  const google = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      try {
        return await signInWithPopup(auth, googleProvider);
      } catch (err) {
        if (err?.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw err;
      }
    } else {
      // Demo mode fallback
      const guest = guestDemoLogin();
      setUser(guest);
      return guest;
    }
  }, []);

  const signUp = useCallback(
    async (email, password, name = '') => {
      if (isFirebaseConfigured && auth) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name && cred.user) {
          updateProfile(cred.user, { displayName: name }).catch(() => { });
        }
        sendEmailVerification(cred.user).catch(() => { });
        return cred;
      } else {
        const demoUser = await registerDemoUser({ name, email, password });
        setUser(demoUser);
        return demoUser;
      }
    },
    []
  );

  const signIn = useCallback(
    async (email, password) => {
      if (isFirebaseConfigured && auth) {
        return signInWithEmailAndPassword(auth, email, password);
      } else {
        const demoUser = await loginDemoUser({ email, password });
        setUser(demoUser);
        return demoUser;
      }
    },
    []
  );

  const guestSignIn = useCallback(() => {
    if (isFirebaseConfigured && auth) {
      return signInWithPopup(auth, googleProvider);
    } else {
      const guest = guestDemoLogin();
      setUser(guest);
      return guest;
    }
  }, []);

  const reset = useCallback(async (email) => {
    if (isFirebaseConfigured && auth) {
      return sendPasswordResetEmail(auth, email);
    }
    return Promise.resolve();
  }, []);

  const logout = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth).catch(() => { });
    } else {
      clearDemoSession();
    }
    setUser(null);
  }, []);

  // Fresh Firebase ID token or local token
  const getToken = useCallback(async () => {
    if (auth?.currentUser) {
      return auth.currentUser.getIdToken();
    }
    if (user?.getIdToken) {
      return user.getIdToken();
    }
    return 'demo_token_local';
  }, [user]);

  return {
    user,
    ready,
    authMode,
    isDemoMode,
    isFirebaseConfigured,
    google,
    signUp,
    signIn,
    guestSignIn,
    reset,
    logout,
    getToken,
  };
}

// One shared auth state for the whole app (wrap <App /> content with this).
export function AuthProvider({ children }) {
  const value = useAuthState();
  return createElement(AuthContext.Provider, { value }, children);
}

export default function useAuth() {
  return useContext(AuthContext);
}
