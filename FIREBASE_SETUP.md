# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter your project name (e.g., "myapp-auth")
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Phone" authentication
5. Add your app's domain for testing (for web: localhost, for mobile: your bundle ID)

## 3. Create a Web App

1. In your Firebase project, click the web icon (</>) to add a web app
2. Enter your app nickname
3. Copy the Firebase configuration object
4. Replace the config in `firebase.js` with your actual config

## 4. Update firebase.js

Replace the placeholder config in `firebase.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 5. Enable Firestore

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database

## 6. Test the App

1. Run your app: `npm start`
2. Try signing in with a phone number
3. Check the Firebase Console to see users being created

## Important Notes

- For production, you'll need to configure proper Firestore security rules
- Phone authentication requires a valid phone number for testing
- Make sure to add your app's bundle ID/domain to the authorized domains in Firebase Auth settings
