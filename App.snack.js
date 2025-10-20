import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Camera } from 'expo-camera';
import { VideoView } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FriendsProvider, useFriends } from './contexts/FriendsContext';
import LoginScreen from './screens/LoginScreen';
import VerifyCodeScreen from './screens/VerifyCodeScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import FriendsScreen from './screens/FriendsScreen';
import Webcam from 'react-webcam';
import { storage, db } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

const { width, height } = Dimensions.get('window');
const Stack = createStackNavigator();

// Helper function to convert any date format to readable string
const formatDate = (dateValue) => {
  try {
    if (!dateValue) return 'Unknown date';
    
    // If it's a Firestore Timestamp (has .seconds property)
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    
    // If it's already a Date object or timestamp number
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
    
    return 'Unknown date';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown date';
  }
};

// 🎯 NEW: Subtle time hints (not too unique, just helpful)
const getTimeHint = (dateValue) => {
  try {
    if (!dateValue) return '';
    
    let date;
    if (dateValue.seconds) {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return '✨ Just now';
    if (diffHours < 6) return `${diffHours}h ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return ''; // Don't show for older videos
  } catch (error) {
    return '';
  }
};

// 🎯 NEW: Encouraging upload messages (subtle positivity)
const getUploadMessage = (progress) => {
  if (progress < 25) return 'Starting upload...';
  if (progress < 50) return 'Making progress...';
  if (progress < 75) return 'Almost there...';
  if (progress < 95) return 'Finishing up...';
  return 'Complete!';
};

// AuthStack Component
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000' }
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}

// Bottom Tab Navigator Component
function BottomTabNavigator() {
  const [activeTab, setActiveTab] = useState('forYou');
  const [currentScreen, setCurrentScreen] = useState('main'); // 'main', 'camera', 'preview', 'friendsManage'
  const [previewData, setPreviewData] = useState(null);
  const [previousTab, setPreviousTab] = useState('forYou'); // Track previous tab for going back
  const { receivedRequests } = useFriends();
  const focusListenersRef = useRef(new Map());

  // Trigger focus events when screen or tab changes
  useEffect(() => {
    const screenName = currentScreen === 'main' ? activeTab : currentScreen;
    console.log('📢 Screen changed to:', screenName);
    
    // Call all focus listeners for this screen
    const listeners = focusListenersRef.current.get(screenName) || [];
    listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in focus listener:', error);
      }
    });
  }, [currentScreen, activeTab]);

  // Create navigation object factory for screens
  const createNavigation = (screenName) => ({
    navigate: (screen, params) => {
      console.log('🚀 Navigation.navigate called with screen:', screen, 'params:', params);
      if (screen === 'Camera') {
        console.log('➡️ Navigating to Camera');
        setCurrentScreen('camera');
      } else if (screen === 'Preview') {
        console.log('➡️ Navigating to Preview');
        setCurrentScreen('preview');
        setPreviewData(params);
      } else if (screen === 'Friends' || screen === 'FriendsManage') {
        console.log('➡️ Navigating to Friends Management');
        // Save current tab before navigating away
        setPreviousTab(activeTab);
        setCurrentScreen('friendsManage');
      } else {
        console.log('➡️ Navigating to main with tab:', screen);
        setCurrentScreen('main');
        if (screen === 'ForYou') setActiveTab('forYou');
        else if (screen === 'FriendsFeed') setActiveTab('friends');
        else if (screen === 'YourVideos') setActiveTab('yourVideos');
        else if (screen === 'Profile') setActiveTab('profile');
      }
    },
    goBack: () => {
      console.log('⬅️ Go back from:', currentScreen);
      // Restore the previous tab when going back
      if (currentScreen === 'friendsManage') {
        setActiveTab(previousTab);
      }
      setCurrentScreen('main');
    },
    addListener: (event, callback) => {
      if (event !== 'focus') return () => {};
      
      console.log(`📝 Registering focus listener for screen: ${screenName}`);
      
      // Add listener for this specific screen
      if (!focusListenersRef.current.has(screenName)) {
        focusListenersRef.current.set(screenName, []);
      }
      focusListenersRef.current.get(screenName).push(callback);
      
      // Return unsubscribe function
      return () => {
        const listeners = focusListenersRef.current.get(screenName);
        if (listeners) {
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      };
    }
  });

  return (
    <View style={styles.mainContainer}>
      {/* Main content area */}
      <View style={styles.contentArea}>
        {currentScreen === 'main' && <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} createNavigation={createNavigation} />}
        {currentScreen === 'camera' && <CameraScreen navigation={createNavigation('camera')} />}
        {currentScreen === 'preview' && previewData && <PreviewScreen navigation={createNavigation('preview')} route={{ params: previewData }} />}
        {currentScreen === 'friendsManage' && <FriendsScreen navigation={createNavigation('friendsManage')} />}
      </View>

      {/* Always-visible bottom navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => {
            setCurrentScreen('main');
            setActiveTab('forYou');
          }}
        >
          <Text style={[styles.tabIcon, currentScreen === 'main' && activeTab === 'forYou' && styles.activeTabIcon]}>⌂</Text>
          <Text style={[styles.tabLabel, currentScreen === 'main' && activeTab === 'forYou' && styles.activeTabLabel]}>For You</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => {
            setCurrentScreen('main');
            setActiveTab('yourVideos');
          }}
        >
          <Text style={[styles.tabIcon, currentScreen === 'main' && activeTab === 'yourVideos' && styles.activeTabIcon]}>▶</Text>
          <Text style={[styles.tabLabel, currentScreen === 'main' && activeTab === 'yourVideos' && styles.activeTabLabel]}>My Videos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cameraTabButton}
          onPress={() => setCurrentScreen('camera')}
        >
          <Text style={styles.cameraTabIcon}>REC</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => {
            setCurrentScreen('main');
            setActiveTab('friends');
          }}
        >
          <View style={styles.tabIconContainer}>
            <Text style={[styles.tabIcon, currentScreen === 'main' && activeTab === 'friends' && styles.activeTabIcon]}>♥</Text>
            {receivedRequests && receivedRequests.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{receivedRequests.length}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, currentScreen === 'main' && activeTab === 'friends' && styles.activeTabLabel]}>Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => {
            setCurrentScreen('main');
            setActiveTab('profile');
          }}
        >
          <Text style={[styles.tabIcon, currentScreen === 'main' && activeTab === 'profile' && styles.activeTabIcon]}>◉</Text>
          <Text style={[styles.tabLabel, currentScreen === 'main' && activeTab === 'profile' && styles.activeTabLabel]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Main Tabs with Bottom Navigation
function MainTabs({ activeTab, setActiveTab, createNavigation }) {
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'forYou':
        return <ForYouFeedScreen navigation={createNavigation('forYou')} />;
      case 'friends':
        return <FriendsScreen navigation={createNavigation('friends')} />;
      case 'yourVideos':
        return <YourVideosFeedScreen navigation={createNavigation('yourVideos')} />;
      case 'profile':
        return <ProfileScreen navigation={createNavigation('profile')} />;
      default:
        return <ForYouFeedScreen navigation={createNavigation('forYou')} />;
    }
  };

  return (
    <View style={styles.screenContainer}>
      {renderActiveScreen()}
    </View>
  );
}

// MainAppStack Component
function MainAppStack() {
  return <BottomTabNavigator />;
}

// AppNavigator Component
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check if profile is complete
  if (user) {
    const isProfileIncomplete = !user.profileComplete || !user.fullName || !user.username;
    console.log('🔍 Profile check:', {
      hasUser: !!user,
      profileComplete: user.profileComplete,
      fullName: user.fullName,
      username: user.username,
      isProfileIncomplete: isProfileIncomplete
    });
    
    // If user is logged in but profile is incomplete, show profile setup
    if (isProfileIncomplete) {
      console.log('⚠️ Profile incomplete, showing CompleteProfile screen');
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        </Stack.Navigator>
      );
    }
    
    console.log('✅ Profile complete, showing main app');
  }

  return user ? <MainAppStack /> : <AuthStack />;
}

// CameraScreen Component
function CameraScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [frontCamera, setFrontCamera] = useState(true);
  const [backCamera, setBackCamera] = useState(true);
  const [webcamDevices, setWebcamDevices] = useState([]);
  const [frontCameraId, setFrontCameraId] = useState(null);
  const [backCameraId, setBackCameraId] = useState(null);
  const [isDualCameraMode, setIsDualCameraMode] = useState(true); // New: dual camera toggle
  
  const frontCameraRef = useRef(null);
  const backCameraRef = useRef(null);
  const frontWebcamRef = useRef(null); // Separate refs for dual camera
  const backWebcamRef = useRef(null);
  const recordingTimer = useRef(null);
  const frontMediaRecorderRef = useRef(null); // Separate recorders for dual camera
  const backMediaRecorderRef = useRef(null);
  const frontRecordedChunksRef = useRef([]);
  const backRecordedChunksRef = useRef([]);

  useEffect(() => {
    getPermissions();
    if (Platform.OS === 'web') {
      getWebcamDevices();
    }
  }, []);

  const getWebcamDevices = async () => {
    try {
      console.log('🎥 Requesting camera permission...');
      
      // First, request camera permission by calling getUserMedia
      // This is required before enumerateDevices will return actual device labels
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log('✅ Camera permission granted, stream obtained');
      
      // Now enumerate devices - they will have proper labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('📹 Found video devices:', videoDevices.length);
      
      setWebcamDevices(videoDevices);
      
      // 🎯 NEW: Auto-detect front and back cameras for dual camera mode
      if (videoDevices.length >= 2) {
        // Try to identify front and back cameras based on labels
        const frontCam = videoDevices.find(device => 
          device.label.toLowerCase().includes('front') || 
          device.label.toLowerCase().includes('user') ||
          device.label.toLowerCase().includes('facetime')
        ) || videoDevices[0]; // Fallback to first camera
        
        const backCam = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('rear')
        ) || videoDevices[1]; // Fallback to second camera
        
        setFrontCameraId(frontCam.deviceId);
        setBackCameraId(backCam.deviceId);
        
        console.log('🎯 Dual camera setup:');
        console.log('📱 Front camera:', frontCam.label || frontCam.deviceId);
        console.log('📷 Back camera:', backCam.label || backCam.deviceId);
      } else if (videoDevices.length === 1) {
        // Only one camera available - disable dual camera mode
        setFrontCameraId(videoDevices[0].deviceId);
        setBackCameraId(null);
        setIsDualCameraMode(false);
        console.log('⚠️ Only one camera found - dual camera mode disabled');
      } else {
        console.warn('⚠️ No video devices found');
      }
      
      // Stop the temporary stream - Webcam components will create their own
      stream.getTracks().forEach(track => track.stop());
      console.log('🛑 Temporary stream stopped');
      
    } catch (error) {
      console.error('❌ Error getting webcam access:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        Alert.alert('Camera Permission Denied', 'Please allow camera access in your browser settings and refresh the page.');
      } else {
        Alert.alert('Camera Error', 'Could not access camera. Please check browser permissions.');
      }
      setHasPermission(false);
    }
  };

  const getPermissions = async () => {
    try {
      console.log('Getting permissions...', Platform.OS);
      
      // Check if we're on web
      if (Platform.OS === 'web') {
        console.log('Web detected, setting demo mode');
        // For web, we'll show a demo mode since camera permissions work differently
        setHasPermission('web-demo');
        return;
      }

      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync();
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      
      if (cameraStatus === 'granted' && audioStatus === 'granted' && mediaStatus === 'granted') {
        setHasPermission(true);
      } else {
        Alert.alert('Permissions needed', 'Camera, microphone, and media library permissions are required');
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Permission error:', error);
      setHasPermission(false);
    }
  };

  const flipCamera = async () => {
    if (webcamDevices.length <= 1) {
      Alert.alert('No other camera available', 'Only one camera detected on this device');
      return;
    }

    // Cycle to next camera
    const nextIndex = (currentCameraIndex + 1) % webcamDevices.length;
    const nextCamera = webcamDevices[nextIndex];
    
    console.log('🔄 Flipping to camera:', nextCamera.label || nextCamera.deviceId);

    if (isRecording) {
      // 🎬 FLIP WHILE RECORDING - Advanced feature!
      console.log('🔄 Flipping camera DURING recording...');
      
      try {
        // Set flag to prevent navigation to preview
        isFlippingCamera.current = true;
        
        // Stop current MediaRecorder (but keep the chunks!)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('⏸️ Pausing current recorder...');
          mediaRecorderRef.current.stop();
          
          // Wait a tiny bit for the chunks to be saved
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Switch camera
        setCurrentCameraIndex(nextIndex);
        setSelectedDeviceId(nextCamera.deviceId);
        
        // Wait for webcam to switch
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get new stream and start new MediaRecorder
        const stream = webcamRef.current?.video?.srcObject;
        if (stream) {
          console.log('▶️ Starting new recorder with new camera...');
          
          const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 1000000
          };
          
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
              options.mimeType = 'video/webm';
            }
          }
          
          mediaRecorderRef.current = new MediaRecorder(stream, options);
          
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
              console.log('📦 New chunk from new camera:', event.data.size, 'bytes');
            }
          };
          
          mediaRecorderRef.current.onstop = () => {
            console.log('🎬 Recorder stopped (camera flip or final stop)');
            // Only navigate to preview if we're NOT flipping cameras
            if (!isFlippingCamera.current) {
              if (recordedChunksRef.current.length > 0) {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(blob);
                console.log('✅ Video blob created, size:', blob.size, 'bytes');
                
                // Reset recording state
                setIsRecording(false);
                
                // Navigate to preview with recorded video
                navigation.navigate('Preview', {
                  frontVideo: videoUrl,
                  backVideo: videoUrl,
                  duration: recordingTime
                });
              } else {
                console.error('❌ No recorded chunks available');
                setIsRecording(false);
                Alert.alert('Error', 'No video data recorded. Please try again.');
              }
            }
          };
          
          mediaRecorderRef.current.start();
          console.log('✅ Recording resumed with new camera!');
          
          // Clear the flipping flag after recorder is started
          isFlippingCamera.current = false;
        }
      } catch (error) {
        console.error('❌ Error flipping camera during recording:', error);
        Alert.alert('Camera Flip Failed', 'Could not switch camera. Recording stopped.');
        setIsRecording(false);
        isFlippingCamera.current = false;
      }
    } else {
      // Normal flip when not recording
      setCurrentCameraIndex(nextIndex);
      setSelectedDeviceId(nextCamera.deviceId);
    }
  };

  const startRecording = async () => {
    if (isRecording) return;

    try {
      setIsRecording(true);
      setRecordingTime(0);
      frontRecordedChunksRef.current = [];
      backRecordedChunksRef.current = [];

      if (Platform.OS === 'web') {
        // 🎯 NEW: Dual camera recording for web!
        if (isDualCameraMode && frontCameraId && backCameraId) {
          console.log('🎬 Starting DUAL CAMERA recording...');
          
          // Get streams from both cameras
          const frontStream = frontWebcamRef.current?.video?.srcObject;
          const backStream = backWebcamRef.current?.video?.srcObject;
          
          if (frontStream && backStream) {
            const options = {
              mimeType: 'video/webm;codecs=vp9',
              videoBitsPerSecond: 1000000  // 1 Mbps per camera
            };
            
            // Fallback for browsers that don't support vp9
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
              options.mimeType = 'video/webm;codecs=vp8';
              if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
              }
            }
            
            console.log('🎥 Recording both cameras with compression:', options);
            
            // Create separate recorders for each camera
            frontMediaRecorderRef.current = new MediaRecorder(frontStream, options);
            backMediaRecorderRef.current = new MediaRecorder(backStream, options);

            // Front camera recorder
            frontMediaRecorderRef.current.ondataavailable = (event) => {
              if (event.data.size > 0) {
                frontRecordedChunksRef.current.push(event.data);
              }
            };

            // Back camera recorder
            backMediaRecorderRef.current.ondataavailable = (event) => {
              if (event.data.size > 0) {
                backRecordedChunksRef.current.push(event.data);
              }
            };

            // Handle when both recordings stop
            let stoppedCount = 0;
            const handleRecordingStop = () => {
              stoppedCount++;
              if (stoppedCount === 2) {
                console.log('🎬 Both cameras stopped, processing videos...');
                
                if (frontRecordedChunksRef.current.length > 0 && backRecordedChunksRef.current.length > 0) {
                  const frontBlob = new Blob(frontRecordedChunksRef.current, { type: 'video/webm' });
                  const backBlob = new Blob(backRecordedChunksRef.current, { type: 'video/webm' });
                  const frontVideoUrl = URL.createObjectURL(frontBlob);
                  const backVideoUrl = URL.createObjectURL(backBlob);
                  
                  console.log('✅ Dual videos created:');
                  console.log('📱 Front video size:', frontBlob.size, 'bytes');
                  console.log('📷 Back video size:', backBlob.size, 'bytes');
                  
                  // Reset recording state
                  setIsRecording(false);
                  
                  // Navigate to preview with both videos
                  navigation.navigate('Preview', {
                    frontVideo: frontVideoUrl,
                    backVideo: backVideoUrl,
                    duration: recordingTime
                  });
                } else {
                  console.error('❌ Missing video data from one or both cameras');
                  setIsRecording(false);
                  Alert.alert('Error', 'Failed to record from both cameras. Please try again.');
                }
              }
            };

            frontMediaRecorderRef.current.onstop = handleRecordingStop;
            backMediaRecorderRef.current.onstop = handleRecordingStop;

            // Start both recorders
            frontMediaRecorderRef.current.start();
            backMediaRecorderRef.current.start();
            
            console.log('✅ Dual camera recording started!');
          } else {
            throw new Error('Could not access both camera streams');
          }
        } else {
          // Single camera fallback
          console.log('🎥 Starting single camera recording...');
          const stream = frontWebcamRef.current?.video?.srcObject;
          if (stream) {
            const options = {
              mimeType: 'video/webm;codecs=vp9',
              videoBitsPerSecond: 1000000
            };
            
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
              options.mimeType = 'video/webm;codecs=vp8';
              if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
              }
            }
            
            frontMediaRecorderRef.current = new MediaRecorder(stream, options);

            frontMediaRecorderRef.current.ondataavailable = (event) => {
              if (event.data.size > 0) {
                frontRecordedChunksRef.current.push(event.data);
              }
            };

            frontMediaRecorderRef.current.onstop = () => {
              if (frontRecordedChunksRef.current.length > 0) {
                const blob = new Blob(frontRecordedChunksRef.current, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(blob);
                
                setIsRecording(false);
                
                navigation.navigate('Preview', {
                  frontVideo: videoUrl,
                  backVideo: videoUrl, // Same video for both
                  duration: recordingTime
                });
              } else {
                console.error('❌ No recorded chunks available');
                setIsRecording(false);
                Alert.alert('Error', 'No video data recorded. Please try again.');
              }
            };

            frontMediaRecorderRef.current.start();
          }
        }
      } else {
        // Mobile recording using Expo Camera (unchanged)
        const frontRecording = await frontCameraRef.current?.recordAsync({
          quality: Camera.Constants.VideoQuality['720p'],
          maxDuration: 180, // 3 minutes
        });

        const backRecording = await backCameraRef.current?.recordAsync({
          quality: Camera.Constants.VideoQuality['720p'],
          maxDuration: 180, // 3 minutes
        });
      }

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) {
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      Alert.alert('Recording Error', 'Could not start recording. Please check camera permissions.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) {
      console.log('⚠️ Already not recording, ignoring stop request');
      return;
    }

    try {
      console.log('⏹️ Stopping recording...');
      clearInterval(recordingTimer.current);

      if (Platform.OS === 'web') {
        // Stop web recording - handle both dual and single camera
        if (isDualCameraMode && frontMediaRecorderRef.current && backMediaRecorderRef.current) {
          console.log('🛑 Stopping DUAL camera recording...');
          
          // Stop both recorders
          if (frontMediaRecorderRef.current.state === 'recording') {
            frontMediaRecorderRef.current.stop();
          }
          if (backMediaRecorderRef.current.state === 'recording') {
            backMediaRecorderRef.current.stop();
          }
          // The onstop handlers will navigate to preview when both are done
        } else if (frontMediaRecorderRef.current) {
          console.log('🛑 Stopping single camera recording...');
          if (frontMediaRecorderRef.current.state === 'recording') {
            frontMediaRecorderRef.current.stop();
            // The onstop handler will navigate to preview
          } else {
            console.warn('⚠️ MediaRecorder not in recording state');
            setIsRecording(false);
          }
        } else {
          console.warn('⚠️ No MediaRecorder found');
          setIsRecording(false);
        }
      } else {
        // Stop mobile recording (unchanged)
        setIsRecording(false);
        const frontVideo = await frontCameraRef.current?.stopRecording();
        const backVideo = await backCameraRef.current?.stopRecording();

        // Navigate to preview with both videos
        navigation.navigate('Preview', {
          frontVideo: frontVideo?.uri,
          backVideo: backVideo?.uri,
          duration: recordingTime
        });
      }

    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  console.log('CameraScreen render - hasPermission:', hasPermission, 'Platform:', Platform.OS);

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={getPermissions}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Web camera mode
  if (hasPermission === 'web-demo') {
    console.log('Rendering web camera mode, selectedDeviceId:', selectedDeviceId);
    return (
      <SafeAreaView style={styles.container}>
        {/* Back button - top left */}
        <TouchableOpacity
          style={styles.feedButtonTopLeft}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.feedButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.cameraContainer}>
          {/* 🎯 NEW: Dual Camera UI for Web */}
          {isDualCameraMode && frontCameraId && backCameraId ? (
            <View style={styles.dualCameraContainer}>
              {/* Main camera (back) - full screen */}
              <View style={styles.mainCameraContainer}>
                <Webcam
                  ref={backWebcamRef}
                  audio={true}
                  videoConstraints={{
                    deviceId: backCameraId,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                  }}
                  style={styles.mainCamera}
                  onUserMedia={(stream) => {
                    console.log('📷 Back camera stream active:', stream);
                  }}
                  onUserMediaError={(error) => {
                    console.error('❌ Back camera error:', error);
                  }}
                />
                
                {/* Front camera overlay - top right corner */}
                <View style={styles.frontCameraOverlay}>
                  <Webcam
                    ref={frontWebcamRef}
                    audio={false} // Only main camera has audio to avoid conflicts
                    videoConstraints={{
                      deviceId: frontCameraId,
                      width: { ideal: 320 },
                      height: { ideal: 240 }
                    }}
                    style={styles.frontCamera}
                    onUserMedia={(stream) => {
                      console.log('📱 Front camera stream active:', stream);
                    }}
                    onUserMediaError={(error) => {
                      console.error('❌ Front camera error:', error);
                    }}
                  />
                </View>
                
                {/* Camera labels */}
                <View style={styles.cameraLabel}>
                  <Text style={styles.cameraLabelText}>Back Camera</Text>
                </View>
                <View style={styles.frontCameraLabel}>
                  <Text style={styles.frontCameraLabelText}>Front Camera</Text>
                </View>
              </View>
              
              {/* 🎯 NEW: Smart Recording Indicator */}
              {isRecording && (
                <View style={[
                  styles.recordingIndicator,
                  recordingTime >= 15 && recordingTime < 60 && styles.recordingIndicatorGood,
                  recordingTime >= 60 && styles.recordingIndicatorWarning
                ]}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>
                    🎬 DUAL REC {formatTime(recordingTime)}
                    {recordingTime >= 15 && recordingTime < 30 && " ✨"}
                    {recordingTime >= 30 && recordingTime < 60 && " 👌"}
                    {recordingTime >= 60 && " ⏰"}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* Single camera fallback */
            <View style={styles.webCameraContainer}>
              {!frontCameraId ? (
                <View style={styles.cameraLoading}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.cameraLoadingText}>Initializing camera...</Text>
                </View>
              ) : (
                <Webcam
                  ref={frontWebcamRef}
                  audio={true}
                  videoConstraints={{
                    deviceId: frontCameraId,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                  }}
                  style={styles.webCamera}
                  onUserMedia={(stream) => {
                    console.log('📹 Single camera stream active:', stream);
                  }}
                  onUserMediaError={(error) => {
                    console.error('❌ Camera error:', error);
                    Alert.alert('Camera Error', 'Failed to access camera. Please check permissions.');
                  }}
                />
              )}
              
              {/* Recording indicator */}
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>{formatTime(recordingTime)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Camera controls - center bottom */}
          {/* FLIP BUTTON TEMPORARILY HIDDEN - Code kept for future use */}
          {/* 
          <View style={styles.cameraControlsRow}>
            <TouchableOpacity
              style={[
                styles.flipCameraButton,
                (webcamDevices.length <= 1 || !selectedDeviceId) && styles.disabledButton
              ]}
              onPress={flipCamera}
              disabled={!selectedDeviceId || webcamDevices.length <= 1}
            >
              <Text style={styles.flipCameraIcon}>🔄</Text>
              <Text style={styles.flipCameraText}>
                {isRecording ? 'Flip!' : 'Flip'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.recordButtonCenter, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={!selectedDeviceId}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stop' : 'Record'}
              </Text>
            </TouchableOpacity>

            <View style={styles.flipCameraButton} />
          </View>
          */}

          {/* Camera mode toggle and record button */}
          <View style={styles.cameraControlsRow}>
            {/* Dual camera toggle */}
            {webcamDevices.length >= 2 && (
              <TouchableOpacity
                style={[styles.dualCameraToggle, isDualCameraMode && styles.dualCameraToggleActive]}
                onPress={() => setIsDualCameraMode(!isDualCameraMode)}
                disabled={isRecording}
              >
                <Text style={styles.dualCameraToggleIcon}>
                  {isDualCameraMode ? '📱📷' : '📷'}
                </Text>
                <Text style={styles.dualCameraToggleText}>
                  {isDualCameraMode ? 'Dual' : 'Single'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Record button */}
            <TouchableOpacity
              style={[styles.recordButtonCenter, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={!frontCameraId}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stop' : 'Record'}
              </Text>
            </TouchableOpacity>

            {/* Spacer for balance */}
            {webcamDevices.length >= 2 && <View style={styles.dualCameraToggle} />}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button - top left */}
      <TouchableOpacity
        style={styles.feedButtonTopLeft}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.feedButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.cameraContainer}>
        {/* Back Camera - Main view */}
        {backCamera && (
          <Camera
            ref={backCameraRef}
            style={styles.backCamera}
            type={Camera.Constants.Type.back}
            ratio="16:9"
          />
        )}

        {/* Front Camera - Small overlay (BeReal style) */}
        {frontCamera && (
          <View style={styles.frontCameraContainer}>
            <Camera
              ref={frontCameraRef}
              style={styles.frontCamera}
              type={Camera.Constants.Type.front}
              ratio="16:9"
            />
          </View>
        )}

        {/* No camera placeholder */}
        {!backCamera && !frontCamera && (
          <View style={styles.noCameraPlaceholder}>
            <Text style={styles.noCameraText}>No camera selected</Text>
            <Text style={styles.noCameraSubtext}>Enable at least one camera to record</Text>
          </View>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>{formatTime(recordingTime)}</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, !backCamera && styles.disabledButton]}
            onPress={() => setBackCamera(!backCamera)}
          >
            <Text style={[styles.controlText, !backCamera && styles.disabledText]}>
              {backCamera ? 'Back Camera' : 'Enable Back'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recordButton, 
              isRecording && styles.recordingButton,
              (!backCamera && !frontCamera) && styles.disabledRecordButton
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={!backCamera && !frontCamera}
          >
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Stop' : 'Record'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, !frontCamera && styles.disabledButton]}
            onPress={() => setFrontCamera(!frontCamera)}
          >
            <Text style={[styles.controlText, !frontCamera && styles.disabledText]}>
              {frontCamera ? 'Front Camera' : 'Enable Front'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

// PreviewScreen Component
function PreviewScreen({ route, navigation }) {
  const { frontVideo, backVideo, duration } = route.params;
  const [frontPlaying, setFrontPlaying] = useState(false);
  const [backPlaying, setBackPlaying] = useState(false);
  const [showFront, setShowFront] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();
  
  const frontVideoRef = useRef(null);
  const backVideoRef = useRef(null);

  const toggleFrontVideo = async () => {
    if (Platform.OS === 'web') {
      if (frontPlaying) {
        frontVideoRef.current?.pause();
      } else {
        frontVideoRef.current?.play();
      }
    } else {
      if (frontPlaying) {
        frontVideoRef.current?.pause();
      } else {
        frontVideoRef.current?.play();
      }
    }
    setFrontPlaying(!frontPlaying);
  };

  const toggleBackVideo = async () => {
    if (Platform.OS === 'web') {
      if (backPlaying) {
        backVideoRef.current?.pause();
      } else {
        backVideoRef.current?.play();
      }
    } else {
      if (backPlaying) {
        backVideoRef.current?.pause();
      } else {
        backVideoRef.current?.play();
      }
    }
    setBackPlaying(!backPlaying);
  };

  const saveVideo = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save videos');
      return;
    }

    if (!storage) {
      console.error('❌ Firebase Storage not initialized!');
      Alert.alert('Error', 'Firebase Storage is not set up. Please check the console and ensure Storage is enabled in Firebase Console.');
      return;
    }
    
    console.log('🔍 Storage object type:', typeof storage);
    console.log('🔍 Storage has ref?', !!storage.ref);
    console.log('🔍 Storage methods:', Object.keys(storage).slice(0, 10));

    if (!db) {
      console.error('❌ Firestore not initialized!');
      Alert.alert('Error', 'Firestore is not set up.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      console.log('📤 Starting video upload...');
      console.log('👤 User ID:', user.uid);
      console.log('🎥 Video URL:', frontVideo?.substring(0, 50) + '...');

      if (Platform.OS === 'web') {
        // WEB: Upload blob to Firebase Storage
        console.log('🌐 Web platform detected, uploading blob...');
        
        // Convert blob URL to blob
        const response = await fetch(frontVideo);
        const blob = await response.blob();
        console.log('✅ Blob created, size:', blob.size);
        
        // Create unique filename
        const timestamp = Date.now();
        const filename = `videos/${user.uid}/${timestamp}.webm`;
        console.log('📝 Uploading to:', filename);
        
        // Upload to Firebase Storage
        // Check if it's compat or modular SDK
        let downloadURL;
        
        if (storage.ref) {
          // Compat SDK (from window.firebase.storage())
          console.log('📦 Using Firebase Storage compat SDK');
          const storageRef = storage.ref(filename);
          const uploadTask = storageRef.put(blob);
          
          // Monitor upload progress
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(Math.round(progress));
              console.log(`📊 Upload progress: ${Math.round(progress)}%`);
            },
            (error) => {
              console.error('❌ Upload error:', error);
              throw error;
            }
          );
          
          // Wait for upload to complete
          await uploadTask;
          console.log('✅ Upload complete!');
          
          // Get download URL
          downloadURL = await storageRef.getDownloadURL();
          console.log('🔗 Download URL:', downloadURL);
        } else {
          // Modular SDK
          console.log('📦 Using Firebase Storage modular SDK');
          const storageRef = ref(storage, filename);
          const uploadTask = uploadBytesResumable(storageRef, blob);
          
          // Monitor upload progress
          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(progress));
                console.log(`📊 Upload progress: ${Math.round(progress)}%`);
              },
              (error) => {
                console.error('❌ Upload error:', error);
                reject(error);
              },
              async () => {
                console.log('✅ Upload complete!');
                resolve();
              }
            );
          });
          
          // Get download URL
          downloadURL = await getDownloadURL(storageRef);
          console.log('🔗 Download URL:', downloadURL);
        }
        
        // Save metadata to Firestore
        const videoDoc = {
          userId: user.uid,
          username: user.username || 'anonymous',
          fullName: user.fullName || 'Anonymous User',
          // Don't save photoURL - we'll fetch current photo when displaying
          videoUrl: downloadURL,
          createdAt: new Date(), // Use Date object for Firestore
          duration: duration || 0,
          likes: 0,
          likedBy: [],
          comments: 0,
          views: 0
        };
        
        console.log('💾 Saving video metadata to Firestore:', videoDoc);
        const docRef = await addDoc(collection(db, 'videos'), videoDoc);
        console.log('✅ Video metadata saved to Firestore with ID:', docRef.id);
        
        // Log the saved document
        console.log('📄 Saved document:', {
          id: docRef.id,
          userId: videoDoc.userId,
          videoUrl: videoDoc.videoUrl.substring(0, 50) + '...',
          createdAt: videoDoc.createdAt
        });
        
        Alert.alert('Success', 'Video uploaded successfully!');
      } else {
        // MOBILE: Save to media library AND upload
        console.log('📱 Mobile platform detected');
        
        if (frontVideo) {
          await MediaLibrary.saveToLibraryAsync(frontVideo);
        }
        if (backVideo) {
          await MediaLibrary.saveToLibraryAsync(backVideo);
        }
        
        // TODO: Add mobile Firebase Storage upload
        Alert.alert('Success', 'Videos saved to gallery!');
      }
      
      setUploading(false);
      navigation.goBack(); // Go back to main screen
    } catch (error) {
      console.error('❌ Error saving video:', error);
      setUploading(false);
      Alert.alert('Error', `Failed to save video: ${error.message}`);
    }
  };

  const discardVideo = () => {
    console.log('Discard button pressed');
    
    // For web, use confirm dialog as fallback
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to discard this video?');
      if (confirmed) {
        console.log('Discard confirmed via confirm dialog');
        // Clean up video URLs
        if (frontVideo && frontVideo.startsWith('blob:')) {
          console.log('Revoking front video URL');
          URL.revokeObjectURL(frontVideo);
        }
        if (backVideo && backVideo.startsWith('blob:')) {
          console.log('Revoking back video URL');
          URL.revokeObjectURL(backVideo);
        }
        console.log('Navigating back');
        try {
          navigation.goBack();
        } catch (error) {
          console.error('Navigation error:', error);
          navigation.navigate('Camera');
        }
      }
      return;
    }
    
    // For mobile, use Alert
    Alert.alert(
      'Discard Video',
      'Are you sure you want to discard this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive', 
          onPress: () => {
            console.log('Discard confirmed');
            console.log('Navigating back');
            try {
              navigation.goBack();
            } catch (error) {
              console.error('Navigation error:', error);
              navigation.navigate('Camera');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={discardVideo} style={styles.headerButton} disabled={uploading}>
          <Text style={[styles.headerButtonText, uploading && styles.disabledText]}>Discard</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {uploading ? `${getUploadMessage(uploadProgress)} ${uploadProgress}%` : 'Preview'}
          </Text>
          {uploading && (
            <View style={styles.uploadProgressBar}>
              <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
            </View>
          )}
        </View>
        <TouchableOpacity onPress={saveVideo} style={styles.headerButton} disabled={uploading}>
          <Text style={[styles.headerButtonText, uploading && styles.disabledText]}>
            {uploading ? '...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.videoContainer}>
        {/* Main Video Display */}
        <View style={styles.mainVideoContainer}>
          {Platform.OS === 'web' && frontVideo ? (
            <TouchableOpacity onPress={toggleFrontVideo} style={styles.videoWrapper}>
              <video
                ref={frontVideoRef}
                src={frontVideo}
                style={styles.webVideo}
                controls={false}
                onEnded={() => setFrontPlaying(false)}
              />
              {!frontPlaying && (
                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : Platform.OS === 'web' ? (
            <View style={styles.webPreviewContainer}>
              <Text style={styles.webPreviewTitle}>Video Preview</Text>
              <Text style={styles.webPreviewSubtitle}>
                {showFront ? 'Front Camera' : 'Back Camera'}
              </Text>
              <View style={styles.webPreviewPlaceholder}>
                <Text style={styles.webPreviewIcon}>🎥</Text>
                <Text style={styles.webPreviewText}>Video Preview</Text>
                <Text style={styles.webPreviewDuration}>
                  Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            </View>
          ) : frontVideo && backVideo ? (
            // Dual video layout for mobile
            <View style={styles.dualVideoContainer}>
              <View style={styles.mainVideoSection}>
                <TouchableOpacity onPress={toggleBackVideo} style={styles.videoWrapper}>
                  <VideoView
                    ref={backVideoRef}
                    source={{ uri: backVideo }}
                    style={styles.mainVideo}
                    contentFit="contain"
                    allowsFullscreen={false}
                    allowsPictureInPicture={false}
                    nativeControls={false}
                  />
                  {!backPlaying && (
                    <View style={styles.playButton}>
                      <Text style={styles.playButtonText}>▶</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.videoLabel}>Back Camera</Text>
              </View>
              
              <View style={styles.overlayVideoSection}>
                <TouchableOpacity onPress={toggleFrontVideo} style={styles.videoWrapper}>
                  <VideoView
                    ref={frontVideoRef}
                    source={{ uri: frontVideo }}
                    style={styles.overlayVideo}
                    contentFit="contain"
                    allowsFullscreen={false}
                    allowsPictureInPicture={false}
                    nativeControls={false}
                  />
                  {!frontPlaying && (
                    <View style={styles.smallPlayButton}>
                      <Text style={styles.smallPlayButtonText}>▶</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.overlayVideoLabel}>Front Camera</Text>
              </View>
            </View>
          ) : showFront && frontVideo ? (
            <TouchableOpacity onPress={toggleFrontVideo} style={styles.videoWrapper}>
              <VideoView
                ref={frontVideoRef}
                source={{ uri: frontVideo }}
                style={styles.video}
                contentFit="contain"
                allowsFullscreen={false}
                allowsPictureInPicture={false}
                nativeControls={false}
              />
              {!frontPlaying && (
                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : backVideo ? (
            <TouchableOpacity onPress={toggleBackVideo} style={styles.videoWrapper}>
              <VideoView
                ref={backVideoRef}
                source={{ uri: backVideo }}
                style={styles.video}
                contentFit="contain"
                allowsFullscreen={false}
                allowsPictureInPicture={false}
                nativeControls={false}
              />
              {!backPlaying && (
                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.noVideoContainer}>
              <Text style={styles.noVideoText}>No video available</Text>
            </View>
          )}
        </View>

        {/* Video Toggle Buttons */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, showFront && styles.activeToggleButton]}
            onPress={() => setShowFront(true)}
          >
            <Text style={[styles.toggleButtonText, showFront && styles.activeToggleButtonText]}>
              Front Camera
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !showFront && styles.activeToggleButton]}
            onPress={() => setShowFront(false)}
          >
            <Text style={[styles.toggleButtonText, !showFront && styles.activeToggleButtonText]}>
              Back Camera
            </Text>
          </TouchableOpacity>
        </View>

        {/* Video Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</Text>
          <Text style={styles.infoText}>Tap video to play/pause</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ForYouFeedScreen Component - TikTok Style (Shows videos from YOU + YOUR FRIENDS)
function ForYouFeedScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const { user } = useAuth();
  const { friends } = useFriends();
  const videoRefs = useRef({});
  const flatListRef = useRef(null);
  const feedHeight = height - 80; // Subtract bottom nav height

  useEffect(() => {
    loadVideos();
  }, [friends]); // Reload when friends list changes

  // Reload videos when screen comes into focus (so new uploads appear)
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('🔄 For You feed focused - reloading videos...');
      loadVideos();
    });
    return unsubscribe;
  }, [navigation]);

  // Pause/play videos based on currentIndex
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Pause all videos except the current one
      Object.keys(videoRefs.current).forEach((videoId, index) => {
        const videoElement = videoRefs.current[videoId];
        if (videoElement) {
          if (videos[currentIndex]?.id === videoId) {
            // Play the active video
            videoElement.play().catch(err => console.log('Play error:', err));
          } else {
            // Pause all other videos
            videoElement.pause();
          }
        }
      });
    }
  }, [currentIndex, videos]);

  // Keyboard navigation for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          // Go to next video
          if (currentIndex < videos.length - 1) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex + 1,
              animated: true
            });
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          // Go to previous video
          if (currentIndex > 0) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex - 1,
              animated: true
            });
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentIndex, videos.length]);

  const loadVideos = async () => {
    try {
      if (!user) {
        console.log('⚠️ ForYou: No user logged in');
        setVideos([]);
        setLoading(false);
        return;
      }

      console.log('🎥 ForYou: Loading videos from YOU + YOUR FRIENDS...');
      console.log('👤 Current user ID:', user.uid);
      
      // Build list of user IDs to load videos from (you + your friends)
      const friendIds = friends.map(f => f.id);
      const userIds = [user.uid, ...friendIds];
      
      console.log(`👥 Loading videos from ${userIds.length} users (you + ${friendIds.length} friends)`);
      console.log('📋 User IDs:', userIds);
      
      if (userIds.length === 0) {
        console.log('📭 No users to load videos from');
        setVideos([]);
        setLoading(false);
        return;
      }
      
      // Firestore 'in' query has a limit of 10 items, so we need to handle this
      const videosData = [];
      
      // Split into chunks of 10 (Firestore 'in' limit)
      for (let i = 0; i < userIds.length; i += 10) {
        const chunk = userIds.slice(i, i + 10);
        console.log(`🔍 Querying chunk ${Math.floor(i/10) + 1}:`, chunk);
        
        const videosQuery = query(
          collection(db, 'videos'),
          where('userId', 'in', chunk),
          orderBy('createdAt', 'desc'),
          limit(10) // 🚀 Reduced from 50 to 10 for faster loading!
        );
        
        console.log('📊 Executing query...');
        const videosSnapshot = await getDocs(videosQuery);
        console.log(`📦 Query returned ${videosSnapshot.docs.length} videos`);
        
        videosSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log('📹 Video found:', {
            id: doc.id,
            userId: data.userId,
            createdAt: data.createdAt,
            videoUrl: data.videoUrl?.substring(0, 50) + '...'
          });
          
          videosData.push({
            id: doc.id,
            uri: data.videoUrl,
            creationTime: data.createdAt,
            duration: data.duration,
            userId: data.userId,
            username: data.username || 'anonymous',
            fullName: data.fullName || 'Anonymous User',
            // userPhotoURL will be fetched separately (current photo, not saved with video)
            likes: data.likes || 0,
            likedBy: data.likedBy || [],
            comments: data.comments || 0,
            views: data.views || 0
          });
        });
      }
      
      // Sort by creation time (newest first)
      videosData.sort((a, b) => {
        // Handle Firestore Timestamp (has .seconds), Date object (has .getTime()), or number
        const timeA = a.creationTime?.seconds 
          ? a.creationTime.seconds * 1000 
          : (typeof a.creationTime?.getTime === 'function' ? a.creationTime.getTime() : (a.creationTime || 0));
        const timeB = b.creationTime?.seconds 
          ? b.creationTime.seconds * 1000 
          : (typeof b.creationTime?.getTime === 'function' ? b.creationTime.getTime() : (b.creationTime || 0));
        return timeB - timeA;
      });
      
      // 🚀 Fetch current profile photos for all users IN PARALLEL (much faster!)
      console.log('📸 Fetching current profile photos...');
      const uniqueUserIds = [...new Set(videosData.map(v => v.userId))];
      
      // Fetch all user docs at once with Promise.all (parallel fetching!)
      const userPhotoPromises = uniqueUserIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          return { 
            userId, 
            photoURL: userDoc.exists() ? userDoc.data().photoURL || null : null 
          };
        } catch (error) {
          console.error(`❌ Error fetching photo for user ${userId}:`, error);
          return { userId, photoURL: null };
        }
      });
      
      const userPhotoResults = await Promise.all(userPhotoPromises);
      const userPhotos = {};
      userPhotoResults.forEach(result => {
        userPhotos[result.userId] = result.photoURL;
      });
      
      // Add current photos to videos
      videosData.forEach(video => {
        video.userPhotoURL = userPhotos[video.userId] || null;
      });
      
      console.log(`✅ ForYou: Loaded ${videosData.length} videos with current profile photos`);
      setVideos(videosData);
      setLoading(false);
    } catch (error) {
      console.error('❌ ForYou: Error loading videos:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Check if it's an index error
      if (error.message?.includes('index')) {
        console.error('🔥 FIRESTORE INDEX ERROR: You need to create a composite index!');
        console.error('🔗 Click the link in the error above to create the index automatically');
      }
      
      setVideos([]);
      setLoading(false);
    }
  };

  const handleLike = async (videoId) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to like videos');
      return;
    }

    try {
      console.log('❤️ Toggling like for video:', videoId);
      const videoRef = doc(db, 'videos', videoId);
      const videoDoc = await getDoc(videoRef);
      
      if (!videoDoc.exists()) {
        console.error('Video not found');
        return;
      }

      const videoData = videoDoc.data();
      const likedBy = videoData.likedBy || [];
      const isLiked = likedBy.includes(user.uid);

      if (isLiked) {
        // Unlike: remove user from likedBy array and decrease count
        console.log('👎 Unliking video');
        await updateDoc(videoRef, {
          likedBy: arrayRemove(user.uid),
          likes: Math.max(0, (videoData.likes || 0) - 1)
        });
      } else {
        // Like: add user to likedBy array and increase count
        console.log('👍 Liking video');
        await updateDoc(videoRef, {
          likedBy: arrayUnion(user.uid),
          likes: (videoData.likes || 0) + 1
        });
      }

      // Update local state immediately for smooth UI
      setVideos(prevVideos =>
        prevVideos.map(video =>
          video.id === videoId
            ? {
                ...video,
                likes: isLiked ? Math.max(0, video.likes - 1) : video.likes + 1,
                likedBy: isLiked
                  ? video.likedBy.filter(id => id !== user.uid)
                  : [...video.likedBy, user.uid]
              }
            : video
        )
      );

      console.log('✅ Like toggled successfully');
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  // 🎯 NEW: Quick Reaction System (Simple & Familiar)
  const handleQuickReaction = async (videoId, emoji) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to react to videos');
      return;
    }

    try {
      console.log(`${emoji} Toggling reaction for video:`, videoId);
      const videoRef = doc(db, 'videos', videoId);
      const videoDoc = await getDoc(videoRef);
      
      if (!videoDoc.exists()) {
        console.error('Video not found');
        return;
      }

      const videoData = videoDoc.data();
      const reactions = videoData.reactions || {};
      const userId = user.uid;
      
      // Initialize reaction array if it doesn't exist
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }
      
      const hasReacted = reactions[emoji].includes(userId);
      
      if (hasReacted) {
        // Remove reaction
        console.log(`👎 Removing ${emoji} reaction`);
        reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      } else {
        // Add reaction
        console.log(`👍 Adding ${emoji} reaction`);
        reactions[emoji] = [...reactions[emoji], userId];
      }
      
      await updateDoc(videoRef, { reactions });
      
      // Update local state immediately for smooth UI
      setVideos(prevVideos =>
        prevVideos.map(video =>
          video.id === videoId
            ? { ...video, reactions }
            : video
        )
      );
      
      console.log('✅ Reaction toggled successfully');
    } catch (error) {
      console.error('❌ Error toggling reaction:', error);
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
    }
  };

  const openComments = async (video) => {
    setSelectedVideo(video);
    setShowComments(true);
    await loadComments(video.id);
  };

  const closeComments = () => {
    setShowComments(false);
    setSelectedVideo(null);
    setComments([]);
    setCommentText('');
  };

  const loadComments = async (videoId) => {
    setLoadingComments(true);
    try {
      console.log('💬 Loading comments for video:', videoId);
      const commentsQuery = query(
        collection(db, 'comments'),
        where('videoId', '==', videoId),
        orderBy('createdAt', 'asc')
      );
      
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentsData = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ Loaded ${commentsData.length} comments`);
      if (commentsData.length > 0) {
        console.log('📋 Sample comment:', {
          username: commentsData[0].username,
          text: commentsData[0].text?.substring(0, 50),
          createdAt: commentsData[0].createdAt
        });
      }
      setComments(commentsData);
    } catch (error) {
      console.error('❌ Error loading comments:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      // If orderBy fails (needs index), try without ordering
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('⚠️ Trying to load comments without orderBy (index not created)...');
        try {
          const simpleQuery = query(
            collection(db, 'comments'),
            where('videoId', '==', videoId)
          );
          const snapshot = await getDocs(simpleQuery);
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`✅ Loaded ${data.length} comments (unordered)`);
          setComments(data);
        } catch (err2) {
          console.error('❌ Failed to load comments even without orderBy:', err2);
          setComments([]);
        }
      } else {
        setComments([]);
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const postComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Empty Comment', 'Please write something before posting');
      return;
    }

    if (!user) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }

    setPostingComment(true);
    try {
      console.log('💬 Posting comment...');
      
      // Add comment to Firestore
      const commentData = {
        videoId: selectedVideo.id,
        userId: user.uid,
        username: user.username || 'anonymous',
        fullName: user.fullName || 'Anonymous User',
        text: commentText.trim(),
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'comments'), commentData);
      
      // Update comment count on video
      const videoRef = doc(db, 'videos', selectedVideo.id);
      const videoDoc = await getDoc(videoRef);
      if (videoDoc.exists()) {
        await updateDoc(videoRef, {
          comments: (videoDoc.data().comments || 0) + 1
        });
        
        // Update local state
        setVideos(prevVideos =>
          prevVideos.map(video =>
            video.id === selectedVideo.id
              ? { ...video, comments: (video.comments || 0) + 1 }
              : video
          )
        );
      }
      
      // Reload comments
      await loadComments(selectedVideo.id);
      setCommentText('');
      
      console.log('✅ Comment posted successfully');
    } catch (error) {
      console.error('❌ Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setPostingComment(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const visibleIndex = viewableItems[0].index;
      setCurrentIndex(visibleIndex);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 51,
    minimumViewTime: 0
  }).current;

  // Force snap to correct position after scrolling ends
  const handleMomentumScrollEnd = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / feedHeight);
    
    // Force snap to the correct position
    if (flatListRef.current && index >= 0 && index < videos.length) {
      flatListRef.current.scrollToIndex({
        index: index,
        animated: false
      });
    }
    
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const renderVideoItem = ({ item, index }) => {
    const isActive = index === currentIndex;
    
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.tiktokVideoContainer, { height: feedHeight, width: width }]}>
          <video
            ref={(ref) => { videoRefs.current[item.id] = ref; }}
            src={item.uri}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute'
            }}
            loop
            autoPlay={isActive}
            playsInline
            muted={false}
          />
          
          <View style={styles.tiktokOverlay}>
            <View style={styles.tiktokSidebar}>
              {/* 🎯 NEW: Enhanced Reactions System */}
              <TouchableOpacity 
                style={styles.tiktokIconButton}
                onPress={() => handleQuickReaction(item.id, '❤️')}
              >
                <Text style={item.reactions?.['❤️']?.includes(user?.uid) ? styles.tiktokIconRed : styles.tiktokIconWhite}>
                  ❤️
                </Text>
                <Text style={styles.tiktokIconTextRed}>{item.reactions?.['❤️']?.length || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.tiktokIconButton}
                onPress={() => handleQuickReaction(item.id, '😂')}
              >
                <Text style={item.reactions?.['😂']?.includes(user?.uid) ? styles.tiktokIconYellow : styles.tiktokIconWhite}>
                  😂
                </Text>
                <Text style={styles.tiktokIconText}>{item.reactions?.['😂']?.length || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.tiktokIconButton}
                onPress={() => handleQuickReaction(item.id, '🔥')}
              >
                <Text style={item.reactions?.['🔥']?.includes(user?.uid) ? styles.tiktokIconOrange : styles.tiktokIconWhite}>
                  🔥
                </Text>
                <Text style={styles.tiktokIconText}>{item.reactions?.['🔥']?.length || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.tiktokIconButton}
                onPress={() => openComments(item)}
              >
                <Text style={styles.tiktokIcon}>💬</Text>
                <Text style={styles.tiktokIconText}>{item.comments || 0}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tiktokBottomInfo}>
              <View style={styles.videoUserInfo}>
                {item.userPhotoURL ? (
                  <Image 
                    source={{ uri: item.userPhotoURL }} 
                    style={styles.videoUserAvatar}
                  />
                ) : (
                  <View style={styles.videoUserAvatar}>
                    <Text style={styles.videoUserAvatarText}>
                      {item.fullName?.charAt(0).toUpperCase() || '👤'}
                    </Text>
                  </View>
                )}
                <View style={styles.videoUserTextInfo}>
                  <Text style={styles.tiktokUsername}>@{item.username}</Text>
                  <Text style={styles.tiktokCaption}>{item.fullName}</Text>
                  <Text style={styles.tiktokCaption}>
                    {formatDate(item.creationTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <View style={[styles.tiktokVideoContainer, { height: feedHeight }]}>
        {Platform.OS === 'web' ? (
          <video
            src={item.uri}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',  // Don't zoom or crop vertical videos
              objectPosition: 'center',
              backgroundColor: '#000'
            }}
            autoPlay={isActive}
            loop
            muted={false}
            playsInline
          />
        ) : (
          <VideoView
            source={{ uri: item.uri }}
            style={styles.tiktokVideo}
            contentFit="contain"
            shouldPlay={isActive}
            isLooping
            isMuted={false}
          />
        )}
        
        <View style={styles.tiktokOverlay}>
          <View style={styles.tiktokSidebar}>
            <TouchableOpacity style={styles.tiktokIconButton}>
              <Text style={styles.tiktokIcon}>❤️</Text>
              <Text style={styles.tiktokIconText}>Like</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tiktokIconButton}>
              <Text style={styles.tiktokIcon}>💬</Text>
              <Text style={styles.tiktokIconText}>Comment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tiktokIconButton}>
              <Text style={styles.tiktokIcon}>🔗</Text>
              <Text style={styles.tiktokIconText}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tiktokBottomInfo}>
            <View style={styles.videoUserInfo}>
              {item.userPhotoURL ? (
                <Image 
                  source={{ uri: item.userPhotoURL }} 
                  style={styles.videoUserAvatar}
                />
              ) : (
                <View style={styles.videoUserAvatar}>
                  <Text style={styles.videoUserAvatarText}>
                    {item.fullName?.charAt(0).toUpperCase() || '👤'}
                  </Text>
                </View>
              )}
              <View style={styles.videoUserTextInfo}>
                <Text style={styles.tiktokUsername}>@{item.username}</Text>
                <Text style={styles.tiktokCaption}>{item.fullName}</Text>
                <Text style={styles.tiktokCaption}>
                  {formatDate(item.creationTime)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyText}>No videos in your feed</Text>
          <Text style={styles.emptySubtext}>Add friends to see their videos here!</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('🔘 Add Friends button clicked from ForYou feed');
              navigation.navigate('Friends');
            }}
            style={styles.tiktokEmptyButton}
          >
            <Text style={styles.recordButtonText}>
              Add Friends
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tiktokFeedContainer}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={feedHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleMomentumScrollEnd}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: feedHeight,
          offset: feedHeight * index,
          index,
        })}
        style={{ height: feedHeight }}
      />

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent={true}
        onRequestClose={closeComments}
      >
        <View style={styles.commentsModalContainer}>
          <TouchableOpacity 
            style={styles.commentsModalOverlay}
            activeOpacity={1}
            onPress={closeComments}
          />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.commentsModalKeyboardView}
          >
            <View style={styles.commentsModalContent}>
              {/* Header */}
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>
                  {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </Text>
                <TouchableOpacity onPress={closeComments}>
                  <Text style={styles.commentsCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Comments List */}
              <View style={styles.commentsListContainer}>
                {loadingComments ? (
                  <View style={styles.commentsLoading}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                ) : comments.length === 0 ? (
                  <View style={styles.commentsEmpty}>
                    <Text style={styles.commentsEmptyEmoji}>💬</Text>
                    <Text style={styles.commentsEmptyText}>No comments yet</Text>
                    <Text style={styles.commentsEmptySubtext}>Be the first to comment!</Text>
                  </View>
                ) : (
                  <FlatList
                    data={comments}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.commentItem}>
                        <View style={styles.commentAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {item.fullName?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View style={styles.commentContent}>
                          <Text style={styles.commentUsername}>@{item.username}</Text>
                          <Text style={styles.commentText}>{item.text}</Text>
                          <Text style={styles.commentTime}>
                            {formatDate(item.createdAt)}
                          </Text>
                        </View>
                      </View>
                    )}
                    style={styles.commentsList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>

              {/* Input */}
              <View style={styles.commentsInputContainer}>
                <TextInput
                  style={styles.commentsInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#666"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.commentsPostButton, postingComment && styles.commentsPostButtonDisabled]}
                  onPress={postComment}
                  disabled={postingComment || !commentText.trim()}
                >
                  {postingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.commentsPostButtonText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// YourVideosFeedScreen Component - TikTok Style (Your Uploads)
function YourVideosFeedScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deleting, setDeleting] = useState(null); // Track which video is being deleted
  const { user, logout } = useAuth();
  const videoRefs = useRef({});
  const flatListRef = useRef(null);
  const feedHeight = height - 80; // Subtract bottom nav height

  useEffect(() => {
    loadVideos();
  }, []);

  // Reload videos when screen comes into focus (so new uploads appear)
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('🔄 My Videos tab focused - reloading videos...');
      loadVideos();
    });
    return unsubscribe;
  }, [navigation]);

  // Pause/play videos based on currentIndex
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Pause all videos except the current one
      Object.keys(videoRefs.current).forEach((videoId, index) => {
        const videoElement = videoRefs.current[videoId];
        if (videoElement) {
          if (videos[currentIndex]?.id === videoId) {
            // Play the active video
            videoElement.play().catch(err => console.log('Play error:', err));
          } else {
            // Pause all other videos
            videoElement.pause();
          }
        }
      });
    }
  }, [currentIndex, videos]);

  // Keyboard navigation for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          // Go to next video
          if (currentIndex < videos.length - 1) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex + 1,
              animated: true
            });
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          // Go to previous video
          if (currentIndex > 0) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex - 1,
              animated: true
            });
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentIndex, videos.length]);

  const loadVideos = async () => {
    try {
      console.log('🎬 YourVideos: Loading videos from Firestore...');
      
      if (!user) {
        console.warn('⚠️ YourVideos: User not logged in');
        setVideos([]);
        setLoading(false);
        return;
      }

      const currentUserId = user.uid;
      console.log('👤 YourVideos: Loading videos for user:', currentUserId);
      
      // Load only current user's videos from Firestore
      const videosQuery = query(
        collection(db, 'videos'),
        where('userId', '==', currentUserId),
        orderBy('createdAt', 'desc'),
        limit(10) // 🚀 Reduced from 50 to 10 for faster loading!
      );
      
      console.log('📊 Executing query for My Videos...');
      const videosSnapshot = await getDocs(videosQuery);
      console.log(`📦 Query returned ${videosSnapshot.docs.length} videos`);
      
      const videosData = videosSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📹 My video found:', {
          id: doc.id,
          userId: data.userId,
          createdAt: data.createdAt,
          videoUrl: data.videoUrl?.substring(0, 50) + '...'
        });
        
        return {
          id: doc.id,
          uri: data.videoUrl,
          creationTime: data.createdAt,
          duration: data.duration,
          userId: data.userId,
          username: data.username || user.username || 'you',
          fullName: data.fullName || user.fullName || 'You',
          userPhotoURL: user.photoURL || null, // Use current user's photo (not from video doc)
          likes: data.likes || 0,
          comments: data.comments || 0,
          views: data.views || 0
        };
      });
      
      console.log(`✅ YourVideos: Loaded ${videosData.length} videos with current profile photo`);
      setVideos(videosData);
    } catch (error) {
      console.error('❌ YourVideos: Error loading videos:', error);
      console.error('❌ Error details:', error.message);
      
      // Check if it's an index error
      if (error.message?.includes('index')) {
        console.error('🔥 FIRESTORE INDEX ERROR: You need to create a composite index!');
        console.error('🔗 Click the link in the error above to create the index automatically');
      }
      
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId, videoUrl) => {
    // Show confirmation dialog
    const confirmMessage = Platform.OS === 'web' 
      ? 'Are you sure you want to delete this video? This cannot be undone.'
      : 'Delete Video';
    
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(confirmMessage)
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Video',
            'Are you sure you want to delete this video? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) {
      return;
    }

    setDeleting(videoId);

    try {
      console.log('🗑️ Deleting video:', videoId);

      // Delete from Firestore
      await deleteDoc(doc(db, 'videos', videoId));
      console.log('✅ Deleted from Firestore');

      // Try to delete from Storage (optional - may fail if file doesn't exist)
      try {
        if (videoUrl) {
          const videoRef = ref(storage, videoUrl);
          await deleteObject(videoRef);
          console.log('✅ Deleted from Storage');
        }
      } catch (storageError) {
        console.warn('⚠️ Could not delete from storage (file may not exist):', storageError.message);
        // Continue anyway - Firestore deletion is more important
      }

      // Remove from local state
      setVideos(prevVideos => prevVideos.filter(v => v.id !== videoId));
      
      // Adjust current index if needed
      if (currentIndex >= videos.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }

      if (Platform.OS === 'web') {
        alert('Video deleted successfully!');
      } else {
        Alert.alert('Success', 'Video deleted successfully!');
      }

      console.log('✅ Video deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete video: ' + error.message);
      } else {
        Alert.alert('Error', 'Failed to delete video: ' + error.message);
      }
    } finally {
      setDeleting(null);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const visibleIndex = viewableItems[0].index;
      setCurrentIndex(visibleIndex);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 51,
    minimumViewTime: 0
  }).current;

  // Force snap to correct position after scrolling ends
  const handleMomentumScrollEnd = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / feedHeight);
    
    // Force snap to the correct position
    if (flatListRef.current && index >= 0 && index < videos.length) {
      flatListRef.current.scrollToIndex({
        index: index,
        animated: false
      });
    }
    
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const renderVideoItem = ({ item, index }) => {
    console.log('Rendering video item:', item.id, item.uri);
    const isActive = index === currentIndex;
    const isDeleting = deleting === item.id;
    
    // For web, show actual video
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.tiktokVideoContainer, { height: feedHeight, width: width }]}>
          <video
            ref={(ref) => { videoRefs.current[item.id] = ref; }}
            src={item.uri}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute'
            }}
            loop
            autoPlay={isActive}
            playsInline
            muted={false}
          />
          
          {/* TikTok-style overlay UI */}
          <View style={styles.tiktokOverlay}>
            {/* Right sidebar */}
            <View style={styles.tiktokSidebar}>
              {/* Delete button for My Videos */}
              <TouchableOpacity 
                style={[styles.tiktokIconButton, styles.deleteButton]}
                onPress={() => handleDeleteVideo(item.id, item.uri)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.tiktokIcon, styles.deleteIcon]}>🗑️</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom info */}
            <View style={styles.tiktokBottomInfo}>
              <View style={styles.videoUserInfo}>
                {item.userPhotoURL ? (
                  <Image 
                    source={{ uri: item.userPhotoURL }} 
                    style={styles.videoUserAvatar}
                  />
                ) : (
                  <View style={styles.videoUserAvatar}>
                    <Text style={styles.videoUserAvatarText}>
                      {item.fullName?.charAt(0).toUpperCase() || '👤'}
                    </Text>
                  </View>
                )}
                <View style={styles.videoUserTextInfo}>
                  <Text style={styles.tiktokUsername}>@{item.username}</Text>
                  <Text style={styles.tiktokCaption}>{item.fullName}</Text>
                  <Text style={styles.tiktokCaption}>
                    {formatDate(item.creationTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <View style={[styles.tiktokVideoContainer, { height: feedHeight }]}>
        {Platform.OS === 'web' ? (
          <video
            src={item.uri}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',  // Don't zoom or crop vertical videos
              objectPosition: 'center',
              backgroundColor: '#000'
            }}
            autoPlay={isActive}
            loop
            muted={false}
            playsInline
          />
        ) : (
          <VideoView
            source={{ uri: item.uri }}
            style={styles.tiktokVideo}
            contentFit="contain"
            shouldPlay={isActive}
            isLooping
            isMuted={false}
          />
        )}
        
        {/* TikTok-style overlay UI */}
        <View style={styles.tiktokOverlay}>
          <View style={styles.tiktokSidebar}>
            {/* Delete button for My Videos */}
            <TouchableOpacity 
              style={[styles.tiktokIconButton, styles.deleteButton]}
              onPress={() => handleDeleteVideo(item.id, item.uri)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.tiktokIcon, styles.deleteIcon]}>🗑️</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.tiktokBottomInfo}>
            <View style={styles.videoUserInfo}>
              {item.userPhotoURL ? (
                <Image 
                  source={{ uri: item.userPhotoURL }} 
                  style={styles.videoUserAvatar}
                />
              ) : (
                <View style={styles.videoUserAvatar}>
                  <Text style={styles.videoUserAvatarText}>
                    {item.fullName?.charAt(0).toUpperCase() || '👤'}
                  </Text>
                </View>
              )}
              <View style={styles.videoUserTextInfo}>
                <Text style={styles.tiktokUsername}>@{item.username}</Text>
                <Text style={styles.tiktokCaption}>{item.fullName}</Text>
                <Text style={styles.tiktokCaption}>
                  {formatDate(item.creationTime)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  console.log('🎬 YourVideosScreen render - videos:', videos.length, 'loading:', loading);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your videos...</Text>
        </View>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No videos yet</Text>
          <Text style={styles.emptySubtext}>Record your first video to see it here!</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Camera')}
            style={styles.tiktokEmptyButton}
          >
            <Text style={styles.recordButtonText}>
              Record Your First Video
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tiktokFeedContainer}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={feedHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleMomentumScrollEnd}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: feedHeight,
          offset: feedHeight * index,
          index,
        })}
        style={{ height: feedHeight }}
      />
    </View>
  );
}

// FriendsOnlyFeedScreen Component - Shows videos from friends only
function FriendsOnlyFeedScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { friends } = useFriends();
  const videoRefs = useRef({});

  useEffect(() => {
    loadFriendsVideos();
  }, [friends]);

  const loadFriendsVideos = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, simulate friends' videos from localStorage
        const savedVideos = localStorage.getItem('recordedVideos');
        if (savedVideos) {
          const allVideos = JSON.parse(savedVideos);
          // In a real app, filter by friend IDs
          // For now, show all videos as "friends' videos"
          setVideos(allVideos);
        } else {
          setVideos([]);
        }
      } else {
        // For mobile, load from MediaLibrary
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }

        const media = await MediaLibrary.getAssetsAsync({
          mediaType: 'video',
          sortBy: MediaLibrary.SortBy.creationTime,
          first: 50,
        });

        setVideos(media.assets);
      }
    } catch (error) {
      console.error('Error loading friends videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const visibleIndex = viewableItems[0].index;
      setCurrentIndex(visibleIndex);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80
  }).current;

  const renderVideoItem = ({ item, index }) => {
    const isActive = index === currentIndex;
    
    if (Platform.OS === 'web') {
      return (
        <View style={styles.tiktokVideoContainer}>
          <video
            ref={(ref) => { videoRefs.current[item.id] = ref; }}
            src={item.uri}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute'
            }}
            loop
            autoPlay={isActive}
            playsInline
            muted={false}
          />
          
          <View style={styles.tiktokOverlay}>
            <View style={styles.tiktokSidebar}>
              <TouchableOpacity style={styles.tiktokIconButton}>
                <Text style={styles.tiktokIconWhite}>♡</Text>
                <Text style={styles.tiktokIconTextRed}>{item.likes || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.tiktokIconButton}
                onPress={() => openComments(item)}
              >
                <Text style={styles.tiktokIcon}>💬</Text>
                <Text style={styles.tiktokIconText}>{item.comments || 0}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tiktokBottomInfo}>
              <View style={styles.videoUserInfo}>
                {item.userPhotoURL ? (
                  <Image 
                    source={{ uri: item.userPhotoURL }} 
                    style={styles.videoUserAvatar}
                  />
                ) : (
                  <View style={styles.videoUserAvatar}>
                    <Text style={styles.videoUserAvatarText}>
                      {item.fullName?.charAt(0).toUpperCase() || '👤'}
                    </Text>
                  </View>
                )}
                <View style={styles.videoUserTextInfo}>
                  <Text style={styles.tiktokUsername}>@{item.username || 'friend'}</Text>
                  <Text style={styles.tiktokCaption}>{item.fullName || ''}</Text>
                  <Text style={styles.tiktokCaption}>
                    {formatDate(item.creationTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.tiktokVideoContainer}>
        {Platform.OS === 'web' ? (
          <video
            src={item.uri}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',  // Don't zoom or crop vertical videos
              objectPosition: 'center',
              backgroundColor: '#000'
            }}
            autoPlay={isActive}
            loop
            muted={false}
            playsInline
          />
        ) : (
          <VideoView
            source={{ uri: item.uri }}
            style={styles.tiktokVideo}
            contentFit="contain"
            shouldPlay={isActive}
            isLooping
            isMuted={false}
          />
        )}
        
        <View style={styles.tiktokOverlay}>
          <View style={styles.tiktokSidebar}>
            <TouchableOpacity style={styles.tiktokIconButton}>
              <Text style={styles.tiktokIcon}>❤️</Text>
              <Text style={styles.tiktokIconText}>Like</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tiktokIconButton}>
              <Text style={styles.tiktokIcon}>💬</Text>
              <Text style={styles.tiktokIconText}>Comment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tiktokIconButton}>
              <Text style={styles.tiktokIcon}>🔗</Text>
              <Text style={styles.tiktokIconText}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tiktokBottomInfo}>
            <View style={styles.videoUserInfo}>
              {item.userPhotoURL ? (
                <Image 
                  source={{ uri: item.userPhotoURL }} 
                  style={styles.videoUserAvatar}
                />
              ) : (
                <View style={styles.videoUserAvatar}>
                  <Text style={styles.videoUserAvatarText}>
                    {item.fullName?.charAt(0).toUpperCase() || '👤'}
                  </Text>
                </View>
              )}
              <View style={styles.videoUserTextInfo}>
                <Text style={styles.tiktokUsername}>@{item.username || 'friend'}</Text>
                <Text style={styles.tiktokCaption}>{item.fullName || ''}</Text>
                <Text style={styles.tiktokCaption}>
                  {formatDate(item.creationTime)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading friends' videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('🎬 FriendsOnlyFeedScreen - friends.length:', friends.length, 'videos.length:', videos.length, 'loading:', loading);

  if (friends.length === 0) {
    console.log('📭 Showing "No friends yet" empty state');
    return (
      <SafeAreaView style={[styles.container, { flex: 1 }]}>
        <View style={[styles.emptyContainer, { flex: 1 }]}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>Add friends to see their videos here!</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('🔘 Add Friends button clicked!');
              console.log('📱 Navigation object:', navigation);
              navigation.navigate('Friends');
            }}
            style={styles.tiktokEmptyButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.recordButtonText, { color: '#fff' }]}>
              Add Friends
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (videos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📹</Text>
          <Text style={styles.emptyText}>No videos from friends yet</Text>
          <Text style={styles.emptySubtext}>Your friends haven't posted any videos</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.tiktokFeedContainer}>
      {/* Manage Friends Button - Top Right */}
      <TouchableOpacity
        style={styles.manageFriendsButton}
        onPress={() => navigation.navigate('Friends')}
      >
        <Text style={styles.manageFriendsIcon}>⚙️</Text>
        <Text style={styles.manageFriendsText}>Manage</Text>
      </TouchableOpacity>

      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height - 80}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: height - 80,
          offset: (height - 80) * index,
          index,
        })}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </View>
  );
}

// ProfileScreen Component
function ProfileScreen({ navigation }) {
  const { user, logout, updateUserProfile } = useAuth();
  const [stats, setStats] = useState({ videos: 0, likes: 0, followers: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.photoURL || null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    loadStats();
  }, []);

  // Reload stats when screen comes into focus (so it updates after deleting videos)
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('🔄 Profile screen focused - reloading stats...');
      loadStats();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Initialize edit fields when user data loads
    if (user) {
      setEditFullName(user.fullName || '');
      setEditUsername(user.username || '');
      setProfilePhotoUrl(user.photoURL || null);
    }
  }, [user]);

  const loadStats = async () => {
    try {
      if (!user) {
        console.warn('⚠️ Profile: User not logged in');
        setStats({ videos: 0, likes: 0, followers: 0 });
        return;
      }

      // Count videos and likes from Firestore for the current user
      const videosQuery = query(
        collection(db, 'videos'),
        where('userId', '==', user.uid)
      );
      
      const videosSnapshot = await getDocs(videosQuery);
      const videoCount = videosSnapshot.docs.length;
      
      // Calculate total likes across all videos
      let totalLikes = 0;
      videosSnapshot.docs.forEach(doc => {
        const videoData = doc.data();
        // Use likedBy array length if available, otherwise use likes field
        const videoLikes = videoData.likedBy?.length || videoData.likes || 0;
        totalLikes += videoLikes;
      });
      
      // Get friends count (followers) from user document
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const friendsCount = userData?.friends?.length || 0;
      
      console.log(`📊 Profile: User has ${videoCount} videos, ${totalLikes} total likes, ${friendsCount} friends`);
      setStats({ videos: videoCount, likes: totalLikes, followers: friendsCount });
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      setStats({ videos: 0, likes: 0, followers: 0 });
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return 'No phone number';
    
    // Format like: +31 6 1234 5678
    // Try to match with 1-2 digit country code first (most common, like +31, +1, +44)
    let match = phone.match(/^(\+\d{1,2})(\d{1})(\d{4})(\d+)/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
    
    // Try to match with 3-digit country code (less common, like +234)
    match = phone.match(/^(\+\d{3})(\d{1})(\d{4})(\d+)/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
    
    // Fallback for shorter numbers: try 1-2 digit country code
    match = phone.match(/^(\+\d{1,2})(.+)/);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
    
    // Last resort: return as-is
    return phone;
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setEditFullName(user?.fullName || '');
    setEditUsername(user?.username || '');
    setIsEditing(false);
  };

  const validateInputs = () => {
    if (!editFullName.trim()) {
      Alert.alert('Missing Full Name', 'Please enter your full name');
      return false;
    }

    if (!editUsername.trim()) {
      Alert.alert('Missing Username', 'Please enter a username');
      return false;
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(editUsername)) {
      Alert.alert(
        'Invalid Username',
        'Username must be 3-20 characters and can only contain letters, numbers, and underscores'
      );
      return false;
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateInputs()) {
      return;
    }

    setSaving(true);

    try {
      const result = await updateUserProfile({
        fullName: editFullName.trim(),
        username: editUsername.trim().toLowerCase(),
      });

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
      } else {
        Alert.alert('Update Failed', result.error || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'An unexpected error occurred while updating your profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadProfilePhoto = async (uri) => {
    try {
      setUploadingPhoto(true);
      console.log('📤 Starting upload for:', uri);
      
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      console.log('📦 Blob created, size:', blob.size);
      
      // Create filename
      const filename = `profilePhotos/${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload to Firebase Storage
      console.log('📤 Uploading profile photo to Firebase...');
      await uploadBytesResumable(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ Photo uploaded successfully:', downloadURL);
      
      // Update user profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL: downloadURL });
      console.log('✅ Firestore updated');
      
      // Update local state
      setProfilePhotoUrl(downloadURL);
      
      // Update auth context
      await updateUserProfile({ photoURL: downloadURL });
      console.log('✅ Auth context updated');
      
      if (Platform.OS === 'web') {
        window.alert('Success! Profile photo updated!');
      } else {
        Alert.alert('Success', 'Profile photo updated!');
      }
    } catch (error) {
      console.error('❌ Error uploading profile photo:', error);
      if (Platform.OS === 'web') {
        window.alert('Upload Failed: ' + error.message);
      } else {
        Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      console.log('📸 pickImageFromGallery called');
      
      // Request permissions (not needed on web)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need camera roll permissions to select a photo');
          return;
        }
      }

      console.log('📸 Launching image picker...');
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      console.log('📸 Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        console.log('📸 Image selected, uploading...');
        await uploadProfilePhoto(result.assets[0].uri);
      } else {
        console.log('📸 User cancelled image selection');
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to pick image. ' + error.message);
      } else {
        Alert.alert('Error', 'Failed to pick image');
      }
    }
  };

  const takePhoto = async () => {
    try {
      // On web, ImagePicker.launchCameraAsync doesn't work well
      // Instead, we'll use the gallery picker which allows camera on web
      if (Platform.OS === 'web') {
        // On web, use file input which can access camera
        Alert.alert(
          'Take Photo',
          'Please use "Choose from Gallery" and select "Take Photo" in the browser dialog to use your camera on web.',
          [{ text: 'Open Gallery', onPress: pickImageFromGallery }]
        );
        return;
      }

      // On mobile, use camera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions to take a photo');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        cameraType: ImagePicker.CameraType.front, // Front camera for selfies
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Try using "Choose from Gallery" instead.');
    }
  };

  const captureSelfie = async () => {
    try {
      if (Platform.OS === 'web' && webcamRef.current) {
        console.log('📸 Capturing selfie from webcam...');
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (!imageSrc) {
          window.alert('Failed to capture photo. Please try again.');
          return;
        }
        
        console.log('📸 Selfie captured, uploading...');
        setShowCameraModal(false);
        await uploadProfilePhoto(imageSrc);
      }
    } catch (error) {
      console.error('❌ Error capturing selfie:', error);
      window.alert('Failed to capture selfie: ' + error.message);
    }
  };

  const handleChangePhoto = () => {
    console.log('📸 handleChangePhoto called - Platform:', Platform.OS);
    
    // On web, open camera modal directly
    if (Platform.OS === 'web') {
      console.log('📸 Opening camera modal');
      setShowCameraModal(true);
    } else {
      // On mobile, show both options
      Alert.alert(
        'Change Profile Photo',
        'Choose an option',
        [
          { text: 'Take Selfie 📸', onPress: takePhoto },
          { text: 'Choose from Gallery', onPress: pickImageFromGallery },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileContainer}>
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.profileAvatar} 
            onPress={handleChangePhoto}
            disabled={uploadingPhoto}
          >
            {profilePhotoUrl ? (
              <Image 
                source={{ uri: profilePhotoUrl }} 
                style={styles.profileAvatarImage}
              />
            ) : (
              <Text style={styles.profileAvatarText}>
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : '👤'}
              </Text>
            )}
            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Text style={styles.cameraIconText}>📷</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfoContainer}>
            {user?.fullName && (
              <Text style={styles.profileFullName}>{user.fullName}</Text>
            )}
            
            <Text style={styles.profileUsername}>
              @{user?.username || 'you'}
            </Text>
            
            <View style={styles.phoneNumberContainer}>
              <Text style={styles.phoneNumberLabel}>📱 Phone Number</Text>
              <Text style={styles.phoneNumberText}>
                {formatPhoneNumber(user?.phoneNumber)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.profileStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.videos}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.likes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>

        <View style={styles.profileActions}>
          <TouchableOpacity 
            style={[styles.profileButton, styles.editButton]}
            onPress={handleEditProfile}
          >
            <Text style={styles.profileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.profileButton, styles.logoutButton]}
            onPress={logout}
          >
            <Text style={styles.profileButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleCancelEdit} disabled={saving}>
                <Text style={[styles.modalCloseButton, saving && styles.disabledText]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalLabel}>Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="John Doe"
                  placeholderTextColor="#666"
                  value={editFullName}
                  onChangeText={setEditFullName}
                  autoCapitalize="words"
                  editable={!saving}
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalLabel}>Username</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="johndoe"
                  placeholderTextColor="#666"
                  value={editUsername}
                  onChangeText={(text) => setEditUsername(text.toLowerCase())}
                  autoCapitalize="none"
                  editable={!saving}
                />
                <Text style={styles.modalHelpText}>
                  3-20 characters, letters, numbers, and _ only
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={handleCancelEdit}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSaveButton, saving && styles.buttonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#000" size="small" />
                      <Text style={styles.modalSaveButtonText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Camera Modal for Selfie */}
      {Platform.OS === 'web' && (
        <Modal
          visible={showCameraModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowCameraModal(false)}
        >
          <View style={styles.cameraModalContainer}>
            <View style={styles.cameraHeader}>
              <Text style={styles.cameraTitle}>Take a Selfie 📸</Text>
              <TouchableOpacity 
                onPress={() => setShowCameraModal(false)}
                style={styles.cameraCloseButton}
              >
                <Text style={styles.cameraCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cameraPreviewContainer}>
              <View style={styles.circularCameraWrapper}>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "user", // Front camera
                    width: 1280,
                    height: 1280,
                    aspectRatio: 1
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirror effect
                  }}
                />
              </View>
              <Text style={styles.cameraHintText}>Position your face in the circle</Text>
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={captureSelfie}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.captureButtonText}>📸 Capture</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelCameraButton}
                onPress={() => setShowCameraModal(false)}
              >
                <Text style={styles.cancelCameraButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <FriendsProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#000" />
          <AppNavigator />
        </NavigationContainer>
      </FriendsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Bottom Navigation Styles
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 26,
    marginBottom: 4,
    color: '#666',
  },
  activeTabIcon: {
    color: '#fff',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: '#fff',
  },
  cameraTabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  cameraTabIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  // Profile Screen Styles
  profileContainer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  profileAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileAvatarText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  cameraIconText: {
    fontSize: 16,
  },
  profileInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  profileFullName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileUsername: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  phoneNumberContainer: {
    backgroundColor: '#111',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  phoneNumberLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  phoneNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
  },
  profileActions: {
    alignItems: 'center',
    gap: 15,
  },
  profileButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Edit Profile Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#000',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 25,
    borderTopWidth: 1,
    borderTopColor: '#333',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalForm: {
    gap: 20,
  },
  modalInputContainer: {
    marginBottom: 10,
  },
  modalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
  },
  modalHelpText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#333',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  feedButtonTopLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 100,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  feedButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendsButtonTopRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  friendsButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  backCamera: {
    flex: 1,
  },
  frontCameraContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  frontCamera: {
    flex: 1,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recordingIndicatorGood: {
    backgroundColor: 'rgba(0,150,0,0.8)',
    borderColor: 'rgba(0,255,0,0.3)',
  },
  recordingIndicatorWarning: {
    backgroundColor: 'rgba(255,140,0,0.8)',
    borderColor: 'rgba(255,200,0,0.3)',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff0000',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  cameraButtonBottomLeft: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  cameraControlsRow: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  recordButtonCenter: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 35,
    paddingVertical: 15,
    borderRadius: 30,
    minWidth: 120,
    alignItems: 'center',
  },
  recordButtonCenterSolo: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 35,
    paddingVertical: 15,
    borderRadius: 30,
    minWidth: 120,
    alignItems: 'center',
  },
  flipCameraButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  flipCameraIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  flipCameraText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controlText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recordButton: {
    backgroundColor: '#fff',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000',
  },
  recordingButton: {
    backgroundColor: '#ff0000',
  },
  recordButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigation: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  navButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  webCameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  webCamera: {
    width: '100%',
    height: '100%',
    objectFit: 'contain', // Changed from 'cover' to prevent zooming/cropping
  },
  // 🎯 NEW: Dual Camera Styles
  dualCameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  mainCameraContainer: {
    flex: 1,
    position: 'relative',
  },
  mainCamera: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  frontCameraOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 150,
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  frontCamera: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  cameraLabel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  cameraLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  frontCameraLabel: {
    position: 'absolute',
    top: 230,
    right: 25,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  frontCameraLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dualCameraToggle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 80,
  },
  dualCameraToggleActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  dualCameraToggleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  dualCameraToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cameraLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  cameraLoadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
  },
  noCameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  noCameraText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noCameraSubtext: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  disabledText: {
    color: '#666',
  },
  disabledRecordButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  // Preview Screen Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadProgressBar: {
    width: 100,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  videoContainer: {
    flex: 1,
    padding: 20,
  },
  mainVideoContainer: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 30,
    color: '#000',
    marginLeft: 5,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: '#666',
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: '#222',
    borderRadius: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeToggleButton: {
    backgroundColor: '#fff',
  },
  toggleButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeToggleButtonText: {
    color: '#000',
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    marginVertical: 2,
  },
  webPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webPreviewTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  webPreviewSubtitle: {
    color: '#666',
    fontSize: 16,
    marginBottom: 30,
  },
  webPreviewPlaceholder: {
    backgroundColor: '#222',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 200,
  },
  webPreviewIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  webPreviewText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  webPreviewDuration: {
    color: '#666',
    fontSize: 14,
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain', // Show full video without cropping - works for both portrait and landscape
    backgroundColor: '#000',
  },
  dualVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  mainVideoSection: {
    flex: 1,
    position: 'relative',
  },
  mainVideo: {
    width: '100%',
    height: '100%',
  },
  videoLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  overlayVideoSection: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  overlayVideo: {
    width: '100%',
    height: '100%',
  },
  overlayVideoLabel: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  smallPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallPlayButtonText: {
    fontSize: 12,
    color: '#000',
    marginLeft: 2,
  },
  // Feed Screen Styles
  feedHeaderTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // TikTok-style Feed Styles
  tiktokFeedContainer: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    height: height - 80,
  },
  tiktokVideoContainer: {
    width: width,
    height: height - 80,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tiktokVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    // Allow video to maintain aspect ratio - important for vertical iPhone videos
    maxWidth: '100%',
    maxHeight: '100%',
  },
  tiktokOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  tiktokTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 50,
  },
  tiktokBackButton: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  tiktokSidebar: {
    position: 'absolute',
    right: 10,
    bottom: 20,
    alignItems: 'center',
    gap: 20,
  },
  tiktokIconButton: {
    alignItems: 'center',
    marginVertical: 10,
  },
  tiktokIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  tiktokIconWhite: {
    fontSize: 40,
    marginBottom: 0,
    color: '#fff',
  },
  tiktokIconRed: {
    fontSize: 40,
    marginBottom: 0,
    color: '#ff4444',
  },
  tiktokIconYellow: {
    fontSize: 40,
    marginBottom: 0,
    color: '#ffdd44',
  },
  tiktokIconOrange: {
    fontSize: 40,
    marginBottom: 0,
    color: '#ff8844',
  },
  tiktokIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tiktokIconTextRed: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  deleteButton: {
    // Red circle removed - clean look
  },
  deleteIcon: {
    fontSize: 28,
  },
  tiktokBottomInfo: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 80,
  },
  videoUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  videoUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  videoUserAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  videoUserTextInfo: {
    flex: 1,
  },
  videoTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoTimeHint: {
    color: '#88ff88',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  tiktokUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tiktokCaption: {
    color: '#fff',
    fontSize: 14,
  },
  tiktokEmptyButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  floatingCameraButton: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -35,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  floatingCameraIcon: {
    fontSize: 36,
  },
  manageFriendsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manageFriendsIcon: {
    fontSize: 16,
  },
  manageFriendsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButtonText: {
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  videoList: {
    padding: 10,
  },
  videoItem: {
    flex: 1,
    margin: 5,
    backgroundColor: '#111',
    borderRadius: 10,
    overflow: 'hidden',
  },
  videoContainer: {
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playIcon: {
    fontSize: 30,
    color: '#fff',
  },
  videoInfo: {
    padding: 10,
  },
  videoDate: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
  videoDuration: {
    color: '#666',
    fontSize: 12,
  },
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  // Header button styles
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsButtonText: {
    fontSize: 18,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ff4444',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Comments Modal Styles
  commentsModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentsModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  commentsModalKeyboardView: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  commentsModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  commentsCloseButton: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  commentsListContainer: {
    minHeight: 200,
    maxHeight: 400,
  },
  commentsList: {
    flex: 1,
  },
  commentsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  commentsEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  commentsEmptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  commentsEmptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  commentsEmptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  commentItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  commentTime: {
    color: '#666',
    fontSize: 12,
  },
  commentsInputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  commentsInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 14,
  },
  commentsPostButton: {
    backgroundColor: '#ff4444',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  commentsPostButtonDisabled: {
    backgroundColor: '#666',
  },
  commentsPostButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Camera Modal Styles
  cameraModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    paddingVertical: 20,
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cameraCloseButton: {
    padding: 10,
  },
  cameraCloseButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  cameraPreviewContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  circularCameraWrapper: {
    width: 400,
    height: 400,
    borderRadius: 200,
    overflow: 'hidden',
    borderWidth: 5,
    borderColor: '#fff',
    backgroundColor: '#000',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cameraHintText: {
    color: '#888',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  cameraControls: {
    width: '100%',
    maxWidth: 500,
    paddingBottom: 40,
    gap: 15,
  },
  captureButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  captureButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelCameraButton: {
    backgroundColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});