// Firebase configuration for both web and mobile
import { Platform } from 'react-native';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
} from '@env';

// NOTE: Firebase Phone Auth uses its own built-in reCAPTCHA
// No custom reCAPTCHA key needed - Firebase handles it automatically!

let auth, db, storage, app, appCheck;

try {
  // Check if we're on web and Firebase compat is available
  if (typeof window !== 'undefined' && window.firebase) {
    // Use Firebase compat version for better reCAPTCHA support
    auth = window.firebase.auth();
    db = window.firebase.firestore();
    
    // Check if storage is available
    if (window.firebase.storage) {
      storage = window.firebase.storage();
      console.log('✅ Firebase Storage initialized (compat)');
      console.log('🔍 Storage type:', typeof storage);
      console.log('🔍 Storage has ref?', typeof storage.ref);
    } else {
      console.error('❌ Firebase Storage not loaded! Check web/index.html');
      storage = null;
    }
    
    app = window.firebase.app();

    // App Check disabled for web - we don't actually need it if using compat
    // The modular SDK will handle App Check initialization
    
    /* DISABLED - CONFLICTS WITH PHONE AUTH RECAPTCHA
    // Initialize App Check for web with reCAPTCHA v3
    try {
      if (window.firebase.appCheck && RECAPTCHA_V3_SITE_KEY !== '6LdYOUR-SITE-KEY-HERE') {
        appCheck = window.firebase.appCheck();
        appCheck.activate(RECAPTCHA_V3_SITE_KEY, true); // true = enable token auto-refresh
        console.log('✅ Firebase App Check activated for web (reCAPTCHA v3)');
      } else if (RECAPTCHA_V3_SITE_KEY === '6LdYOUR-SITE-KEY-HERE') {
        console.warn('⚠️ App Check not activated - please add your reCAPTCHA v3 site key');
        console.warn('📖 See FIREBASE_APP_CHECK_SETUP.md for instructions');
      }
    } catch (appCheckError) {
      console.warn('⚠️ App Check initialization failed (optional):', appCheckError.message);
    }
    */
  } else {
    // Use modular version for mobile or when compat is not available
    const { initializeApp } = require('firebase/app');
    const { getAuth } = require('firebase/auth');
    const { getFirestore } = require('firebase/firestore');
    const { getStorage } = require('firebase/storage');

const firebaseConfig = {
      apiKey: FIREBASE_API_KEY,
      authDomain: FIREBASE_AUTH_DOMAIN,
      projectId: FIREBASE_PROJECT_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
      messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
      appId: FIREBASE_APP_ID,
      measurementId: FIREBASE_MEASUREMENT_ID
    };

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // App Check DISABLED - The reCAPTCHA v3 key (6LcMZR0UAAAAALgPMcgHwga7gY5p8QMg1Hj-bmUv) returns 401 errors
    // This is blocking SMS from being sent even though the phone auth reCAPTCHA v2 works fine
    // Phone auth will work perfectly without App Check
    
    /* TO RE-ENABLE APP CHECK LATER:
    try {
      const { initializeAppCheck, ReCaptchaV3Provider } = require('firebase/app-check');
      
      if (__DEV__) {
        console.log('📋 App Check Debug Mode - Check console for debug token');
        console.log('📖 Add the token to Firebase Console (see FIREBASE_APP_CHECK_SETUP.md)');
      }

      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });

      console.log(`✅ Firebase App Check activated for ${Platform.OS}`);
      if (Platform.OS === 'ios') {
        console.log('📱 Using Apple DeviceCheck/App Attest (invisible)');
      } else if (Platform.OS === 'android') {
        console.log('📱 Using Google Play Integrity API (invisible)');
      }
    } catch (appCheckError) {
      console.warn('⚠️ App Check initialization failed (optional):', appCheckError.message);
      console.warn('📖 This is normal if App Check is not set up yet. See FIREBASE_APP_CHECK_SETUP.md');
    }
    */
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  auth = null;
  db = null;
  storage = null;
  app = null;
  appCheck = null;
}

// Export reCAPTCHA verifier for web (backward compatibility)
export const getRecaptchaVerifier = () => {
  if (typeof window !== 'undefined' && window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }
  return null;
};

export { auth, db, storage, app, appCheck };
export default app;