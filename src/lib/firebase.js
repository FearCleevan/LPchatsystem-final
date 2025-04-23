import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// ======================
// Firebase Configuration
// ======================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// =================
// App Check Setup
// =================
if (!import.meta.env.DEV) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
    console.log('App Check initialized with reCAPTCHA v3');
  } catch (error) {
    console.error('Failed to initialize App Check:', error);
  }
} else {
  // Debug mode for development
  window.self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.log('App Check debug mode enabled - tokens will be logged to console');
}

// ======================
// Service Initialization
// ======================
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// ========================
// Security Configurations
// ========================
(async () => {
  try {
    // Set session persistence for auth
    await setPersistence(auth, browserSessionPersistence);
    console.log('Auth persistence set to session-only');
    
    // Enable Firestore offline persistence
    await enableIndexedDbPersistence(db)
      .then(() => console.log('Offline persistence enabled'))
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Offline persistence already enabled in another tab');
        } else if (err.code === 'unimplemented') {
          console.warn('Offline persistence not supported in this browser');
        } else {
          console.error('Persistence error:', err);
        }
      });
  } catch (error) {
    console.error('Security initialization failed:', error);
  }
})();

// =====================
// Development Setup
// =====================
if (import.meta.env.DEV) {
  // Connect to Firebase Emulator Suite
  connectFunctionsEmulator(functions, "localhost", 5001);
  
  // Optional: Add emulator connections for other services if needed
  // connectAuthEmulator(auth, "http://localhost:9099");
  // connectFirestoreEmulator(db, 'localhost', 8080);
  
  console.log('Firebase emulators enabled for development');
}

// =====================
// Export Analytics (if needed)
// =====================
export { analytics };