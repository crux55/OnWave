
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
  // Developer-friendly check: Log a warning if critical Firebase config keys seem to be missing or are common placeholders.
  // This helps catch common configuration errors before Firebase throws its own, sometimes less direct, error.
  if (!firebaseConfig.apiKey || 
      firebaseConfig.apiKey === 'AIzaSyYOUR_REAL_API_KEY' || 
      firebaseConfig.apiKey === 'YOUR_ACTUAL_API_KEY' || 
      firebaseConfig.apiKey === 'YOUR_API_KEY_HERE' ||
      firebaseConfig.apiKey.includes('YOUR_API_KEY') || // General placeholder check
      firebaseConfig.apiKey.startsWith('AIzaSyYOUR_')) { // Common start of placeholder
    console.warn(
      `Firebase Warning: NEXT_PUBLIC_FIREBASE_API_KEY appears to be missing or is a placeholder ('${firebaseConfig.apiKey}'). 
      Please ensure it's correctly set with your actual Firebase project's API key.
      - For local development, set this in your .env.local file.
      - For deployment, set this in your hosting environment variables.
      You can find your API key in the Firebase Console: Project settings > General > Your apps > Web app > SDK setup and configuration.`
    );
  }
  if (!firebaseConfig.authDomain || firebaseConfig.authDomain.includes('your-project-id')) {
    console.warn(
      `Firebase Warning: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN appears to be missing or is a placeholder ('${firebaseConfig.authDomain}'). Check your environment variables.`
    );
  }
  if (!firebaseConfig.projectId || firebaseConfig.projectId.includes('your-project-id')) {
    console.warn(
      `Firebase Warning: NEXT_PUBLIC_FIREBASE_PROJECT_ID appears to be missing or is a placeholder ('${firebaseConfig.projectId}'). Check your environment variables.`
    );
  }

  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      // Optional: Initialize Analytics
      // if (typeof window !== 'undefined') {
      //   getAnalytics(firebaseApp);
      // }
      console.log('Firebase initialized with Project ID:', firebaseConfig.projectId);
    } catch (error) {
      console.error(
        "Firebase Initialization Error: Failed to initialize Firebase. This is often due to incorrect or missing Firebase configuration values (apiKey, authDomain, projectId, etc.) in your environment variables. Please double-check them against your Firebase project settings in the Firebase Console.",
        error
      );
      // Re-throw the error to ensure the application knows initialization failed.
      throw error;
    }
  } else {
    firebaseApp = getApps()[0];
    // console.log('Firebase already initialized'); // Can be a bit noisy, enable if needed
  }
  return firebaseApp;
}

export { firebaseApp }; // Exporting the app instance might be useful
