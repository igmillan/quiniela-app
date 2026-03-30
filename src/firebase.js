import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyDi2PWl_N0rzIr1-BvjTmgZo4O_2KHmAUI",
  authDomain: "quiniela-app-31277.firebaseapp.com",
  projectId: "quiniela-app-31277",
  storageBucket: "quiniela-app-31277.firebasestorage.app",
  messagingSenderId: "411679005850",
  appId: "1:411679005850:web:b6392e9c10bf61e89fd323",
  measurementId: "G-HD9H0WT6ZF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);