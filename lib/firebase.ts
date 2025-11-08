import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import type { FirebaseConfig } from '../types';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export const initializeFirebase = (config: FirebaseConfig): { db: Firestore | null, auth: Auth | null } => {
  // Always tear down the previous app instance if it exists.
  // This is crucial for handling configuration changes (e.g., logging in with a new config, or logging out).
  if (app) {
    deleteApp(app).catch(error => console.error("Failed to delete previous Firebase app instance:", error));
    app = null;
    db = null;
    auth = null;
  }
  
  // If no new config is provided (e.g., on logout or initial load), just ensure cleanup and exit.
  if (!config || !config.projectId) {
    console.warn("Firebase config is missing or invalid. No app initialized.");
    return { db, auth };
  }
  
  try {
    // Initialize a new app instance with the provided config.
    app = initializeApp(config); 
    db = getFirestore(app);
    auth = getAuth(app);
    return { db, auth };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    alert("Không thể kết nối đến Firebase. Vui lòng kiểm tra lại cấu hình trong trang Cài đặt.");
    // Ensure everything is cleaned up on failure.
    if (app) {
        deleteApp(app).catch(e => console.error("Cleanup on failure failed:", e));
    }
    app = null;
    db = null;
    auth = null;
    return { db, auth };
  }
};

export { db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged };
export type { User };