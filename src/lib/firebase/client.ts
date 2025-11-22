/**
 * Firebase client initialization for client-side usage
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { config } from '@/lib/config';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

// Initialize Firebase only on client-side
if (typeof window !== 'undefined') {
  try {
    // Check if Firebase config is available
    if (!config.firebase.apiKey || !config.firebase.projectId) {
      console.warn('⚠️ Firebase configuration is missing. Please set Firebase environment variables in .env.local');
    } else {
      if (getApps().length === 0) {
        app = initializeApp(config.firebase);
      } else {
        app = getApps()[0];
      }
      db = getFirestore(app);
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    console.error('Please ensure:');
    console.error('1. Firebase project is created');
    console.error('2. Firestore Database is enabled in Firebase Console');
    console.error('3. All Firebase environment variables are set in .env.local');
  }
}

export { db, app };

