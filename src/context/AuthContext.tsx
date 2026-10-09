import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getAuth,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirebaseAppInstance } from '../services/fcmService';
import { CustomerProfile } from '../types/supabase';
import { fetchCustomerProfile, updateCustomerProfile as updateProfileApi } from '../services/profileService';

export interface AuthenticatedCustomerUser {
  id: string;
  firebase_uid?: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: {
    full_name?: string;
    mobile_number?: string;
    phone?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: AuthenticatedCustomerUser | null;
  profile: CustomerProfile | null;
  loading: boolean;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => Promise<{ error: Error | null; user?: AuthenticatedCustomerUser | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<{ error: Error | null }>;
}

const STORAGE_KEY_LOCAL_PROFILE = 'doorbly_firebase_customer_profile_v1';

/**
 * Deterministically converts a Firebase UID into a valid RFC-4122 UUID
 * so PostgreSQL uuid columns (bookings, profiles, reviews) accept it without syntax errors.
 */
export function firebaseUidToUuid(uid: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(uid)) {
    return uid.toLowerCase();
  }

  // Generate 4 deterministic 32-bit hashes from the Firebase UID string
  const hashes = [0x12345678, 0x9abcdef0, 0x13579bdf, 0x2468ace0];
  for (let i = 0; i < uid.length; i++) {
    const ch = uid.charCodeAt(i);
    for (let j = 0; j < 4; j++) {
      hashes[j] = Math.imul(hashes[j] ^ (ch + j * 31), 0x5bd1e995);
      hashes[j] ^= hashes[j] >>> 15;
    }
  }

  const hex = hashes.map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function getLocalCachedProfile(userId: string): Partial<CustomerProfile> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_LOCAL_PROFILE}_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalCachedProfile(userId: string, profile: Partial<CustomerProfile>) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalCachedProfile(userId) || {};
    localStorage.setItem(
      `${STORAGE_KEY_LOCAL_PROFILE}_${userId}`,
      JSON.stringify({ ...existing, ...profile })
    );
  } catch {}
}

function mapFirebaseUser(fbUser: FirebaseUser): AuthenticatedCustomerUser {
  const canonicalId = firebaseUidToUuid(fbUser.uid);
  const localMeta = getLocalCachedProfile(canonicalId);
  return {
    id: canonicalId,
    firebase_uid: fbUser.uid,
    email: fbUser.email,
    phone: fbUser.phoneNumber || localMeta?.mobile_number || null,
    user_metadata: {
      full_name: fbUser.displayName || localMeta?.full_name || undefined,
      mobile_number: fbUser.phoneNumber || localMeta?.mobile_number || undefined,
      phone: fbUser.phoneNumber || localMeta?.mobile_number || undefined,
      avatar_url: fbUser.photoURL || localMeta?.profile_photo || undefined
    }
  };
}

function formatFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials or register a new account.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In popup was closed before completing.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedCustomerUser | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const fbApp = getFirebaseAppInstance();
  const [isReady] = useState<boolean>(!!fbApp);

  const loadOrSyncProfile = useCallback(async (authUser: AuthenticatedCustomerUser) => {
    try {
      const localCached = getLocalCachedProfile(authUser.id);
      const existing = await fetchCustomerProfile(authUser.id, authUser.email || undefined);

      if (existing) {
        const merged: CustomerProfile = {
          ...existing,
          full_name: existing.full_name || localCached?.full_name || authUser.user_metadata?.full_name || null,
          mobile_number:
            existing.mobile_number ||
            localCached?.mobile_number ||
            authUser.user_metadata?.mobile_number ||
            authUser.phone ||
            null,
          profile_photo: existing.profile_photo || authUser.user_metadata?.avatar_url || null,
          address: existing.address || localCached?.address || null,
          city: existing.city || localCached?.city || null,
          district: existing.district || localCached?.district || null,
          pincode: existing.pincode || localCached?.pincode || null
        };
        setProfile(merged);
        saveLocalCachedProfile(authUser.id, merged);
        return;
      }

      const referralCode = `DBLY-${(authUser.firebase_uid || authUser.id)
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 6)
        .toUpperCase()}`;

      const newProfile: CustomerProfile = {
        id: authUser.id,
        email: authUser.email || null,
        full_name: localCached?.full_name || authUser.user_metadata?.full_name || null,
        mobile_number:
          localCached?.mobile_number ||
          authUser.user_metadata?.mobile_number ||
          authUser.user_metadata?.phone ||
          authUser.phone ||
          null,
        profile_photo: authUser.user_metadata?.avatar_url || null,
        address: localCached?.address || null,
        city: localCached?.city || null,
        district: localCached?.district || null,
        pincode: localCached?.pincode || null,
        latitude: localCached?.latitude ?? null,
        longitude: localCached?.longitude ?? null,
        wallet_balance: 0,
        referral_code: referralCode
      };

      setProfile(newProfile);
      saveLocalCachedProfile(authUser.id, newProfile);

      if (newProfile.full_name || newProfile.email) {
        await updateProfileApi(authUser.id, {
          email: newProfile.email,
          full_name: newProfile.full_name,
          mobile_number: newProfile.mobile_number,
          referral_code: referralCode
        });
      }
    } catch (err) {
      console.error('Failed to load customer profile:', err);
    }
  }, []);

  useEffect(() => {
    const app = getFirebaseAppInstance();
    if (!app) {
      setLoading(false);
      return;
    }

    const fbAuth = getAuth(app);
    const unsubscribe = onFirebaseAuthStateChanged(fbAuth, async (fbUser) => {
      if (fbUser) {
        const mappedUser = mapFirebaseUser(fbUser);
        setUser(mappedUser);
        await loadOrSyncProfile(mappedUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [loadOrSyncProfile]);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const cleanEmail = email.trim();
    const app = getFirebaseAppInstance();
    if (!app) {
      return { error: new Error('Firebase Authentication is not initialized.') };
    }

    try {
      const fbAuth = getAuth(app);
      const cred = await signInWithEmailAndPassword(fbAuth, cleanEmail, password);
      const mappedUser = mapFirebaseUser(cred.user);
      setUser(mappedUser);
      await loadOrSyncProfile(mappedUser);
      return { error: null };
    } catch (fbErr: any) {
      // If this is the authorized device admin logging in for the first time in Firebase Auth, auto-provision the account
      if (
        cleanEmail.toLowerCase() === 'debabrata.tribune@gmail.com' &&
        password.trim() === 'Devraj@1122' &&
        (fbErr?.code === 'auth/user-not-found' || fbErr?.code === 'auth/invalid-credential')
      ) {
        try {
          const fbAuth = getAuth(app);
          const created = await createUserWithEmailAndPassword(fbAuth, cleanEmail, password);
          await updateFirebaseProfile(created.user, { displayName: 'Doorbly Admin' });
          const mappedUser = mapFirebaseUser(created.user);
          setUser(mappedUser);
          await loadOrSyncProfile(mappedUser);
          return { error: null };
        } catch {}
      }
      return { error: new Error(formatFirebaseAuthError(fbErr)) };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ): Promise<{ error: Error | null; user?: AuthenticatedCustomerUser | null }> => {
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    const app = getFirebaseAppInstance();
    if (!app) {
      return { error: new Error('Firebase Authentication is not initialized.') };
    }

    try {
      const fbAuth = getAuth(app);
      const cred = await createUserWithEmailAndPassword(fbAuth, cleanEmail, password);
      await updateFirebaseProfile(cred.user, { displayName: cleanName });

      const canonicalId = firebaseUidToUuid(cred.user.uid);
      saveLocalCachedProfile(canonicalId, {
        id: canonicalId,
        full_name: cleanName,
        email: cleanEmail,
        mobile_number: cleanPhone
      });

      const mappedUser: AuthenticatedCustomerUser = {
        id: canonicalId,
        firebase_uid: cred.user.uid,
        email: cred.user.email || cleanEmail,
        phone: cleanPhone,
        user_metadata: {
          full_name: cleanName,
          mobile_number: cleanPhone,
          phone: cleanPhone
        }
      };

      setUser(mappedUser);
      await updateProfileApi(mappedUser.id, {
        full_name: cleanName,
        email: cleanEmail,
        mobile_number: cleanPhone
      });
      await loadOrSyncProfile(mappedUser);
      return { error: null, user: mappedUser };
    } catch (fbErr: any) {
      return { error: new Error(formatFirebaseAuthError(fbErr)) };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    const app = getFirebaseAppInstance();
    if (!app) {
      return { error: new Error('Firebase Authentication is not initialized.') };
    }

    try {
      const fbAuth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(fbAuth, provider);
      const mappedUser = mapFirebaseUser(cred.user);
      setUser(mappedUser);
      await loadOrSyncProfile(mappedUser);
      return { error: null };
    } catch (fbErr: any) {
      return { error: new Error(formatFirebaseAuthError(fbErr)) };
    }
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    const cleanEmail = email.trim();
    const app = getFirebaseAppInstance();
    if (!app) {
      return { error: new Error('Firebase Authentication is not initialized.') };
    }

    try {
      const fbAuth = getAuth(app);
      await sendPasswordResetEmail(fbAuth, cleanEmail);
      return { error: null };
    } catch (fbErr: any) {
      return { error: new Error(formatFirebaseAuthError(fbErr)) };
    }
  };

  const signOut = async () => {
    const app = getFirebaseAppInstance();
    if (app) {
      try {
        await firebaseSignOut(getAuth(app));
      } catch {}
    }
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadOrSyncProfile(user);
    }
  };

  const updateProfile = async (updates: Partial<CustomerProfile>): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Please sign in to update your profile.') };
    }

    try {
      saveLocalCachedProfile(user.id, updates);
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));

      const app = getFirebaseAppInstance();
      if (app && updates.full_name) {
        const fbAuth = getAuth(app);
        if (fbAuth.currentUser) {
          await updateFirebaseProfile(fbAuth.currentUser, { displayName: updates.full_name });
        }
      }

      await updateProfileApi(user.id, updates);
      await loadOrSyncProfile(user);
      return { error: null };
    } catch {
      return { error: null };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isReady,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshProfile,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
