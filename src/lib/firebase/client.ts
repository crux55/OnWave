
'use client'; // This file is intended for client-side use

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics"; // Optional: if you want to use Analytics

// Your web app's Firebase configuration
// IMPORTANT: Replace these with your actual Firebase project config values
// It's best practice to store these in environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let firebaseApp: FirebaseApp;

export function initializeAppIfNeeded(): FirebaseApp {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
    // Optional: Initialize Analytics
    // if (typeof window !== 'undefined') {
    //   getAnalytics(firebaseApp);
    // }
    console.log('Firebase initialized');
  } else {
    firebaseApp = getApps()[0];
    console.log('Firebase already initialized');
  }
  return firebaseApp;
}

// Call initializeAppIfNeeded when this module is loaded if you want it to auto-initialize
// initializeAppIfNeeded();
// However, it's often better to call it explicitly where needed or once in a layout/provider.
// For this example, we'll call it in the LoginPage.

export { firebaseApp }; // Exporting the app instance might be useful
