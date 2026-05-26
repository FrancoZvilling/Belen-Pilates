// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2HJu0MHGF7AnkLe0peZGwFIRchkgU_E4",
  authDomain: "belen-pilates.firebaseapp.com",
  projectId: "belen-pilates",
  storageBucket: "belen-pilates.firebasestorage.app",
  messagingSenderId: "984023521834",
  appId: "1:984023521834:web:e77c150c41f6d1a89b4153"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances
export { app, auth, db };
