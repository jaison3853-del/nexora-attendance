// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB7xSLFwAEj1Vi6MYWy-y0Liuu6OFI9ydg",
  authDomain: "nexora-sm-attendance-new.firebaseapp.com",
  projectId: "nexora-sm-attendance-new",
  storageBucket: "nexora-sm-attendance-new.firebasestorage.app",
  messagingSenderId: "712655420607",
  appId: "1:712655420607:web:6a032f0b39f4d3ab61da0a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
