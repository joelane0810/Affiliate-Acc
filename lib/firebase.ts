import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import type { FirebaseConfig } from '../types';

let db: Firestore | null = null;

export const initializeFirebase = (config: FirebaseConfig): Firestore | null => {
  if (!config || !config.projectId) {
    console.warn("Firebase config is missing or invalid.");
    db = null;
    return null;
  }
  
  try {
    let app: FirebaseApp;
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    db = getFirestore(app);
    return db;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    alert("Không thể kết nối đến Firebase. Vui lòng kiểm tra lại cấu hình trong trang Cài đặt.");
    db = null;
    return null;
  }
};

export { db };
