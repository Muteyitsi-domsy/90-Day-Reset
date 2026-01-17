import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Set persistence to LOCAL - keeps user logged in across browser sessions
// Try indexedDB first (more reliable), fall back to localStorage
const initPersistence = async () => {
  try {
    await setPersistence(auth, indexedDBLocalPersistence);
    console.log('Auth persistence set to indexedDB');
  } catch (error) {
    console.warn('IndexedDB persistence failed, trying localStorage:', error);
    try {
      await setPersistence(auth, browserLocalPersistence);
      console.log('Auth persistence set to localStorage');
    } catch (localError) {
      console.error('Failed to set auth persistence:', localError);
    }
  }
};

// Initialize persistence (runs immediately)
initPersistence();

// Initialize Firestore
export const db = getFirestore(app);
