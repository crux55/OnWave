
'use client'; // This file is intended for client-side use

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics"; // Optional: if you want to use Analytics

// Your web app's Firebase configuration
// IMPORTANT: These values MUST come from your Firebase project settings in the Firebase Console.
// For LOCAL DEVELOPMENT: Set these in a .env.local file in your project root.
// For DEPLOYMENT (e.g., Firebase App Hosting): Set these as environment variables in your hosting provider's settings.
//
// Example .env.local content:
// NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyYOUR_REAL_API_KEY
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
// NEXT_PUBLIC_FIREBASE_APP_ID=1:your-app-id:web:your-web-app-id
// NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-YOUR_MEASUREMENT_ID (Optional)
//
// Crucially, ensure these NEXT_PUBLIC_ environment variables are set in your
// Firebase App Hosting (or other deployment) environment settings.
// The "Publish" process in Firebase Studio will build your app, and if these
// variables are undefined or incorrect in the build/deployment environment,
// Firebase initialization will fail.

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
  // Check for missing or placeholder Firebase config
  const missingOrPlaceholder = (value: string | undefined, placeholders: string[]) => 
    !value || placeholders.some(p => value.includes(p));

  const apiKeyIssue = missingOrPlaceholder(firebaseConfig.apiKey, ['YOUR_API_KEY', 'YOUR_REAL_API_KEY', 'YOUR_ACTUAL_API_KEY']);
  const authDomainIssue = missingOrPlaceholder(firebaseConfig.authDomain, ['your-project-id']);
  const projectIdIssue = missingOrPlaceholder(firebaseConfig.projectId, ['your-project-id']);

  if (apiKeyIssue || authDomainIssue || projectIdIssue) {
    throw new Error('Firebase configuration is missing or contains placeholder values. Check your environment variables.');
  }

  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (error) {
      throw new Error('Firebase initialization failed. Please check your configuration.');
    }
  } else {
    firebaseApp = getApps()[0];
  }
  return firebaseApp;
}

export { firebaseApp }; // Exporting the app instance might be useful
