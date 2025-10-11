import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithPhoneNumber, 
  PhoneAuthProvider, 
  signInWithCredential,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start as true while checking auth state
  const [verificationId, setVerificationId] = useState(null);
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);
  const [isWeb, setIsWeb] = useState(false);

  useEffect(() => {
    // Check if we're on web
    setIsWeb(typeof window !== 'undefined');
    
    // Check if Firebase is available
    const checkFirebase = async () => {
      try {
        if (auth && db) {
          setFirebaseAvailable(true);
          
          // Set up auth state listener using modular SDK
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log('🔐 Auth state changed:', user ? 'User logged in' : 'User logged out');
            if (user) {
              try {
                console.log('📖 Fetching user document from Firestore for:', user.uid);
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  console.log('✅ User document found with data:', {
                    phoneNumber: userData.phoneNumber,
                    username: userData.username,
                    fullName: userData.fullName,
                    profileComplete: userData.profileComplete,
                    hasFriends: userData.friends?.length || 0
                  });
                  setUser({ ...user, ...userData });
                } else {
                  console.log('📝 User document does not exist, creating new one...');
                  await setDoc(doc(db, 'users', user.uid), {
                    phoneNumber: user.phoneNumber,
                    createdAt: new Date(),
                    friends: [],
                    profileComplete: false
                  });
                  console.log('✅ New user document created');
                  setUser({ ...user, friends: [], profileComplete: false });
                }
              } catch (firestoreError) {
                console.warn('⚠️ Firestore permission error (rules need to be updated):', firestoreError.message);
                console.warn('📖 Update Firestore rules in Firebase Console to allow authenticated users');
                // Set user without Firestore data - auth still works!
                setUser({ ...user, friends: [], profileComplete: false });
              }
            } else {
              setUser(null);
            }
            setLoading(false);
          });
          
          return unsubscribe;
        } else {
          console.error('Firebase not available');
          setFirebaseAvailable(false);
          setLoading(false);
        }
      } catch (error) {
        console.error('Firebase check error:', error);
        setFirebaseAvailable(false);
        setLoading(false);
      }
    };

    const cleanup = checkFirebase();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(unsubscribe => unsubscribe && unsubscribe());
      }
    };
  }, [isWeb]);

  const validatePhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    if (!cleaned.startsWith('+')) {
      return { valid: false, error: 'Phone number must start with country code (e.g., +31)' };
    }
    
    if (cleaned.length < 8) {
      return { valid: false, error: 'Phone number is too short' };
    }
    
    if (cleaned.length > 16) {
      return { valid: false, error: 'Phone number is too long' };
    }
    
    return { valid: true };
  };

  const sendVerificationCode = async (phoneNumber) => {
    try {
      console.log('Attempting to send verification code to:', phoneNumber);
      
      const validation = validatePhoneNumber(phoneNumber);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (!firebaseAvailable) {
        throw new Error('Firebase is not available. Please check your connection and try again.');
      }

      // Use appropriate SDK based on platform
      if (isWeb) {
        // Web: Use Firebase modular SDK with reCAPTCHA verifier
        if (!window.recaptchaVerifier) {
          throw new Error('reCAPTCHA is not ready yet. Please wait a moment and try again.');
        }
        
        console.log('Using Firebase modular SDK for web SMS with reCAPTCHA verifier');
        console.log('📞 Sending SMS to:', phoneNumber);
        console.log('🔐 reCAPTCHA verifier ready:', !!window.recaptchaVerifier);
        
        try {
          const confirmation = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            window.recaptchaVerifier
          );
          setVerificationId(confirmation.verificationId);
          
          console.log('✅ SMS sent successfully! Confirmation ID:', confirmation.verificationId);
          Alert.alert('SMS Sent! 📱', 'Check your phone for the verification code.');
          return { success: true };
        } catch (smsError) {
          console.error('❌ SMS sending failed:', smsError);
          console.error('Error code:', smsError.code);
          console.error('Error message:', smsError.message);
          throw new Error(`Failed to send SMS: ${smsError.message}`);
        }
      } else {
        // Mobile: No reCAPTCHA needed (App Check handles verification)
        console.log('Using Firebase modular SDK for mobile SMS');
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber);
        setVerificationId(confirmation.verificationId);
        console.log('✅ Verification code sent successfully via Firebase mobile');
        return { success: true };
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      
      let errorMessage = 'Failed to send verification code. ';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage += 'Invalid phone number format. Please use E.164 format (e.g., +31612345678).';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage += 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/argument-error') {
        errorMessage += 'Invalid phone number format or reCAPTCHA not completed. Please ensure the phone number is valid and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage += 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const verifyCode = async (code) => {
    try {
      if (!verificationId) {
        throw new Error('No verification ID found. Please request a new code.');
      }

      if (!firebaseAvailable) {
        throw new Error('Firebase is not available. Please check your connection and try again.');
      }

      // Use Firebase modular SDK for all platforms
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const result = await signInWithCredential(auth, credential);
      
      await setDoc(doc(db, 'users', result.user.uid), {
        phoneNumber: result.user.phoneNumber,
        createdAt: new Date(),
        friends: []
      }, { merge: true });

      console.log('User verified successfully via Firebase');
      return { success: true };
    } catch (error) {
      console.error('Error verifying code:', error);
      
      let errorMessage = 'Failed to verify code. ';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage += 'Invalid verification code. Please try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage += 'Verification code has expired. Please request a new one.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage += 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const updateUserProfile = async (profileData) => {
    try {
      if (!user) {
        throw new Error('No user is logged in');
      }

      if (!firebaseAvailable) {
        throw new Error('Firebase is not available');
      }

      console.log('📝 Updating user profile with:', profileData);

      await setDoc(doc(db, 'users', user.uid), {
        ...profileData,
        updatedAt: new Date()
      }, { merge: true });

      // Update local user state
      setUser({ ...user, ...profileData });

      console.log('✅ Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      if (firebaseAvailable) {
        await signOut(auth);
        setVerificationId(null);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    verificationId,
    firebaseAvailable,
    isWeb,
    sendVerificationCode,
    verifyCode,
    updateUserProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};