import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function CompleteProfileScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUserProfile, firebaseAvailable } = useAuth();

  const validateInputs = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Full Name', 'Please enter your full name');
      return false;
    }

    if (!username.trim()) {
      Alert.alert('Missing Username', 'Please enter a username');
      return false;
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      Alert.alert(
        'Invalid Username',
        'Username must be 3-20 characters and can only contain letters, numbers, and underscores'
      );
      return false;
    }

    return true;
  };

  const handleComplete = async () => {
    if (!validateInputs()) {
      return;
    }

    if (!firebaseAvailable) {
      Alert.alert('Service Unavailable', 'Firebase is not available. Please check your connection and try again.');
      return;
    }

    setLoading(true);

    try {
      const result = await updateUserProfile({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        profileComplete: true
      });

      if (result.success) {
        console.log('✅ Profile completed successfully');
        // Auth state will update automatically, no need to navigate
      } else {
        Alert.alert('Profile Update Failed', result.error || 'Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile completion error:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving your profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Let's make your account more personal!
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor="#666"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
            <Text style={styles.helpText}>
              Your real name (e.g., John Doe)
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="johndoe"
              placeholderTextColor="#666"
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase())}
              autoCapitalize="none"
              autoComplete="username"
              returnKeyType="done"
              onSubmitEditing={handleComplete}
            />
            <Text style={styles.helpText}>
              3-20 characters, letters, numbers, and _ only
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || !firebaseAvailable) && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading || !firebaseAvailable}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#000" size="small" />
                <Text style={styles.buttonText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Complete Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can change this later in your profile settings
          </Text>
        </View>
      </KeyboardAvoidingView>
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
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
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
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

