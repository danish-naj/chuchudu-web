/**
 * Firebase Configuration for ChuChudu
 * 
 * Only Firebase Auth is used (free tier).
 * File storage is handled locally by the desktop agent.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project called "chuchudu"
 * 3. Enable Authentication → Sign-in methods → Email/Password + Google
 * 4. Go to Project Settings → General → Your apps → Add Web App
 * 5. Copy the config object and replace the placeholder values below
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth instance
export const auth = getAuth(app);

// Storage instance
export const storage = getStorage(app);

import { getFirestore } from 'firebase/firestore';

// Database instance for signaling
export const db = getDatabase(app);

// Firestore instance for metadata
export const firestore = getFirestore(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app;
