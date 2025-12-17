import { useState, useEffect } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for Firebase authentication
 * Manages auth state and provides auth operations
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError('Authentication error occurred');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Set display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }

      setUser(userCredential.user);
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(getAuthErrorMessage(error.code));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(getAuthErrorMessage(error.code));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async (): Promise<void> => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
      throw error;
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(getAuthErrorMessage(error.code));
      throw error;
    }
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setError(null);
  };

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    clearError,
  };
}

/**
 * Convert Firebase auth error codes to user-friendly messages
 */
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'An error occurred. Please try again.';
  }
}
