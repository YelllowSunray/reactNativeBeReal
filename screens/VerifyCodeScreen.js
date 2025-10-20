import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyCodeScreen({ route, navigation }) {
  const { phoneNumber, isDemo = false } = route.params || {};
  const [code, setCode] = useState(isDemo ? '111111' : '');
  const [loading, setLoading] = useState(false);
  const { verifyCode, firebaseAvailable, isWeb } = useAuth();

  // Auto-verify for demo login
  React.useEffect(() => {
    if (isDemo && code === '111111' && !loading) {
      console.log('🎬 Demo mode detected - auto-verifying with code 111111');
      // Small delay to show the screen briefly
      const timer = setTimeout(() => {
        handleVerifyCode();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDemo]);

  const handleVerifyCode = async () => {
    if (!code || code.length < 4) {
      Alert.alert('Invalid Code', 'Please enter the verification code');
      return;
    }

    if (!firebaseAvailable) {
      Alert.alert('Service Unavailable', 'Firebase is not available. Please check your connection and try again.');
      return;
    }

    setLoading(true);
    
    try {
      const result = await verifyCode(code);
      
      if (result.success) {
        console.log('Verification successful');
        // Navigation will be handled by the auth state change
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'An unexpected error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    Alert.alert(
      'Resend Code',
      'This will send a new verification code to your phone number.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resend', 
          onPress: () => {
            // Navigate back to login to resend
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Phone Number</Text>
          <Text style={styles.subtitle}>
            Enter the verification code sent to
          </Text>
          <Text style={styles.phoneNumber}>{phoneNumber}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="123456"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <Text style={styles.helpText}>
              Enter the 6-digit code from your SMS
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || !firebaseAvailable) && styles.buttonDisabled]}
            onPress={handleVerifyCode}
            disabled={loading || !firebaseAvailable}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#000" size="small" />
                <Text style={styles.buttonText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={loading}
          >
            <Text style={styles.resendButtonText}>Resend Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>← Edit Phone Number</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  phoneNumber: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
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
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '600',
  },
  codeInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 15,
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
  resendButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
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
});