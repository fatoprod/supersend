import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../lib/firebase";
import { useAuthStore } from "../stores/authStore";
import type { User } from "../types";

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } =
    useAuthStore();

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser({
            ...userData,
            uid: firebaseUser.uid,
          });
        } else {
          // New user, create document
          const newUser: Partial<User> = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || undefined,
            photoURL: firebaseUser.photoURL || undefined,
            emailVerified: false,
          };
          
          await setDoc(doc(db, "users", firebaseUser.uid), {
            ...newUser,
            createdAt: serverTimestamp(),
          });
          
          setUser(newUser as User);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Sign up with email/password
  const signUp = async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document
      await setDoc(doc(db, "users", result.user.uid), {
        email,
        displayName: displayName || null,
        emailVerified: false,
        createdAt: serverTimestamp(),
      });
      
      // Verification email is sent by Firebase Function trigger
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Sign out
  const signOutUser = async () => {
    await signOut(auth);
    logout();
  };

  // Verify email code (dual verification)
  const verifyEmailCode = async (code: string) => {
    const verifyEmail = httpsCallable<{ code: string }, { success: boolean; error?: string }>(
      functions,
      "verifyEmail"
    );
    
    const result = await verifyEmail({ code });
    
    if (result.data.success) {
      // Refresh user data
      const userDoc = await getDoc(doc(db, "users", user!.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }
    }
    
    return result.data;
  };

  // Resend verification email
  const resendVerificationEmail = async () => {
    const resendVerification = httpsCallable<void, { success: boolean }>(
      functions,
      "resendVerification"
    );
    
    return resendVerification();
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut: signOutUser,
    verifyEmailCode,
    resendVerificationEmail,
  };
}
