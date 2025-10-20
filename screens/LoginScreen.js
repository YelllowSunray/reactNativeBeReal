import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { RecaptchaVerifier } from 'firebase/auth';

export default function LoginScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+31');
  const [loading, setLoading] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const { sendVerificationCode, firebaseAvailable, isWeb } = useAuth();
  const recaptchaInitialized = useRef(false);

  const countryOptions = [
    { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
    { code: '+1', name: 'United States', flag: '🇺🇸' },
    { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
    { code: '+49', name: 'Germany', flag: '🇩🇪' },
    { code: '+33', name: 'France', flag: '🇫🇷' },
    { code: '+39', name: 'Italy', flag: '🇮🇹' },
    { code: '+34', name: 'Spain', flag: '🇪🇸' },
    { code: '+32', name: 'Belgium', flag: '🇧🇪' },
    { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
    { code: '+43', name: 'Austria', flag: '🇦🇹' },
  ];

  useEffect(() => {
    // Initialize reCAPTCHA for web using Firebase modular SDK
    if (isWeb && typeof window !== 'undefined' && !recaptchaInitialized.current) {
      const initRecaptcha = async () => {
        try {
          // Wait a bit for DOM to be ready
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if container exists
          const container = document.getElementById('recaptcha-container');
          console.log('📦 reCAPTCHA container found:', !!container);
          
          if (!container) {
            console.error('❌ reCAPTCHA container not found in DOM!');
            return;
          }
          
          if (!auth) {
            console.error('❌ Firebase auth not available!');
            return;
          }
          
          console.log('🔑 Using Firebase modular SDK for reCAPTCHA v2');
          
          // Create invisible reCAPTCHA verifier if it doesn't exist
          if (!window.recaptchaVerifier) {
            console.log('🔧 Setting up invisible reCAPTCHA v2 for phone auth');
            console.log('📝 Using your new reCAPTCHA v2 key: 6LesauYrAAAAAAFu_KVupeHDtKedv0Xcilir87FY');
            
            // Use modular RecaptchaVerifier - Firebase handles the key automatically
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              'size': 'invisible',  // Invisible - no checkbox for users!
              'callback': (response) => {
                console.log('✅ reCAPTCHA v2 verified automatically!');
                setRecaptchaReady(true);
              },
              'expired-callback': () => {
                console.log('⚠️ reCAPTCHA expired - please refresh');
                setRecaptchaReady(false);
              },
              'error-callback': (error) => {
                console.error('❌ reCAPTCHA error callback:', error);
                setRecaptchaReady(false);
              }
            });
            
            console.log('⏳ Rendering invisible reCAPTCHA widget...');
            // Render the reCAPTCHA
            try {
              const widgetId = await window.recaptchaVerifier.render();
              console.log('✅ Invisible reCAPTCHA widget rendered! Widget ID:', widgetId);
              console.log('🔐 reCAPTCHA ready to use!');
              recaptchaInitialized.current = true;
              setRecaptchaReady(true);
            } catch (renderError) {
              console.error('❌ reCAPTCHA render error:', renderError);
              // If it's already rendered, mark as initialized anyway
              if (renderError.message && renderError.message.includes('already been rendered')) {
                console.log('ℹ️ reCAPTCHA already rendered, continuing...');
                recaptchaInitialized.current = true;
                setRecaptchaReady(true);
              } else {
                console.error('🔧 Try refreshing the page');
                throw renderError;
              }
            }
          } else {
            console.log('✅ reCAPTCHA verifier already exists');
            recaptchaInitialized.current = true;
            setRecaptchaReady(true);
          }
        } catch (error) {
          console.error('❌ reCAPTCHA initialization error:', error);
          console.error('Error details:', error?.message);
        }
      };
      
      initRecaptcha();
      
      // Cleanup function
      return () => {
        try {
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
            recaptchaInitialized.current = false;
            console.log('🧹 reCAPTCHA verifier cleaned up');
          }
        } catch (error) {
          console.warn('⚠️ Error cleaning up reCAPTCHA:', error);
        }
      };
    }
  }, [isWeb]);

  const formatPhoneNumber = (text) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    return cleaned;
  };

  const getFullPhoneNumber = () => {
    const cleanedNumber = formatPhoneNumber(phoneNumber);
    return countryCode + cleanedNumber;
  };

  const handleSendCode = async () => {
    const cleanedNumber = formatPhoneNumber(phoneNumber);
    
    if (!cleanedNumber || cleanedNumber.length < 6) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    if (!firebaseAvailable) {
      Alert.alert('Service Unavailable', 'Firebase is not available. Please check your connection and try again.');
      return;
    }

    setLoading(true);
    const fullNumber = getFullPhoneNumber();
    
    console.log('Sending verification code to:', fullNumber);
    
    try {
      const result = await sendVerificationCode(fullNumber);
      
      if (result.success) {
        navigation.navigate('VerifyCode', { phoneNumber: fullNumber });
      } else {
        console.error('Verification error:', result.error);
        Alert.alert('Error', result.error || 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (code) => {
    setCountryCode(code);
  };

  const handleDemoLogin = async () => {
    console.log('🎬 Demo Login initiated');
    
    // Set demo credentials
    setPhoneNumber('611111111');
    setCountryCode('+31');
    
    setLoading(true);
    const demoPhoneNumber = '+31611111111';
    
    console.log('Sending verification code to demo number:', demoPhoneNumber);
    
    try {
      const result = await sendVerificationCode(demoPhoneNumber);
      
      if (result.success) {
        // Navigate with demo flag so VerifyCodeScreen knows to auto-verify
        navigation.navigate('VerifyCode', { 
          phoneNumber: demoPhoneNumber,
          isDemo: true 
        });
      } else {
        console.error('Demo verification error:', result.error);
        Alert.alert('Error', result.error || 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('Demo unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ContentWrapper = isWeb ? ScrollView : View;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ContentWrapper 
          style={[styles.content, !isWeb && styles.contentView, isWeb && styles.webContent]}
          contentContainerStyle={isWeb ? styles.webScrollContent : undefined}
          showsVerticalScrollIndicator={isWeb}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Live</Text>
            <Text style={styles.subtitle}>
              Enter your phone number to get started
            </Text>
          </View>

          <View style={styles.form}>
            {/* Country Code Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Country</Text>
              <View style={styles.countrySelector}>
                {countryOptions.slice(0, 5).map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryOption,
                      countryCode === country.code && styles.selectedCountry
                    ]}
                    onPress={() => handleCountryChange(country.code)}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={[
                      styles.countryCode,
                      countryCode === country.code && styles.selectedCountryText
                    ]}>
                      {country.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Phone Number Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={styles.countryCodeInput}
                  placeholder="+31"
                  value={countryCode}
                  onChangeText={setCountryCode}
                  keyboardType="phone-pad"
                  maxLength={4}
                />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="612345678"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  maxLength={15}
                />
              </View>
              <Text style={styles.helpText}>
                Enter your phone number without the country code
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || !firebaseAvailable || (isWeb && !recaptchaReady)) && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading || !firebaseAvailable || (isWeb && !recaptchaReady)}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#000" size="small" />
                  <Text style={styles.buttonText}>Sending...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  {isWeb && !recaptchaReady ? 'Loading Security Check...' : 'Send Verification Code'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Demo Login Button */}
            <TouchableOpacity
              style={styles.demoButton}
              onPress={handleDemoLogin}
              disabled={loading || !firebaseAvailable || (isWeb && !recaptchaReady)}
            >
              <Text style={styles.demoButtonText}>🎬 Demo Login</Text>
            </TouchableOpacity>
          </View>

          {/* reCAPTCHA container for Firebase Auth phone verification - hidden for invisible reCAPTCHA */}
          {isWeb && Platform.OS === 'web' && (
            <div id="recaptcha-container" style={{
              height: '0',
              width: '0',
              visibility: 'hidden',
              position: 'absolute'
            }}>
              {/* This container will be populated by Firebase invisible reCAPTCHA */}
            </div>
          )}

          <View style={[styles.footer, isWeb && styles.footerWithRecaptcha]}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ContentWrapper>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
  },
  contentView: {
    justifyContent: 'center',
  },
  webContent: {
    flex: 1,
  },
  webScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 150,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  statusText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 2,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '600',
  },
  countrySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
    justifyContent: 'center',
  },
  selectedCountry: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCode: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCountryText: {
    color: '#000',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryCodeDisplay: {
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  countryCodeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  countryCodeInput: {
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    borderRightWidth: 1,
    borderRightColor: '#333',
    minWidth: 70,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoButton: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#FF8C00',
  },
  demoButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerWithRecaptcha: {
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  webInfo: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
    lineHeight: 14,
    fontStyle: 'italic',
  },
  errorInfo: {
    fontSize: 11,
    color: '#ff6b6b',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 5,
  },
  recaptchaContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
});