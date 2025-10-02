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
} from 'react-native';
import { Camera } from 'expo-camera';
import { VideoView } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const Stack = createStackNavigator();

// CameraScreen Component
function CameraScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [frontCamera, setFrontCamera] = useState(true);
  const [backCamera, setBackCamera] = useState(true);
  
  const frontCameraRef = useRef(null);
  const backCameraRef = useRef(null);
  const recordingTimer = useRef(null);

  useEffect(() => {
    getPermissions();
  }, []);

  const getPermissions = async () => {
    try {
      console.log('Getting permissions...', Platform.OS);
      
      // Check if we're on web
      if (Platform.OS === 'web') {
        console.log('Web detected, setting demo mode');
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

  const startRecording = async () => {
    if (isRecording) return;

    try {
      setIsRecording(true);
      setRecordingTime(0);

      if (Platform.OS === 'web') {
        // Web demo - simulate recording
        Alert.alert('Demo', 'Recording started! This is a web demo.');
      } else {
        // Mobile recording using Expo Camera
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
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      setIsRecording(false);
      clearInterval(recordingTimer.current);

      if (Platform.OS === 'web') {
        // Web demo - simulate recording stop
        Alert.alert('Demo', 'Recording stopped! This is a web demo.');
        navigation.navigate('Preview', {
          frontVideo: 'demo-video',
          backVideo: 'demo-video',
          duration: recordingTime
        });
      } else {
        // Stop mobile recording
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
      console.error('Error stopping recording:', error);
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

  // Web demo mode
  if (hasPermission === 'web-demo') {
    console.log('Rendering web demo mode');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraContainer}>
          {/* Demo camera view */}
          <View style={styles.demoCamera}>
            <Text style={styles.demoText}>📹 Camera Demo Mode</Text>
            <Text style={styles.demoSubtext}>This is a web demo. For full camera functionality, please use the mobile app.</Text>
          </View>

          {/* Demo front camera overlay */}
          <View style={styles.frontCameraContainer}>
            <View style={styles.demoFrontCamera}>
              <Text style={styles.demoFrontText}>📱</Text>
            </View>
          </View>

          {/* Demo controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => Alert.alert('Demo', 'Back camera toggle (demo)')}
            >
              <Text style={styles.controlText}>Back Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stop' : 'Record'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => Alert.alert('Demo', 'Front camera toggle (demo)')}
            >
              <Text style={styles.controlText}>Front Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.navigate('Feed')}
            >
              <Text style={styles.navButtonText}>Feed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Feed')}
          >
            <Text style={styles.navButtonText}>Feed</Text>
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
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Demo', 'Video saved! This is a web demo.');
      } else {
        // Save both videos to media library on mobile
        if (frontVideo) {
          await MediaLibrary.saveToLibraryAsync(frontVideo);
        }
        if (backVideo) {
          await MediaLibrary.saveToLibraryAsync(backVideo);
        }
        Alert.alert('Success', 'Videos saved to gallery!');
      }
      navigation.navigate('Feed');
    } catch (error) {
      console.error('Error saving videos:', error);
      Alert.alert('Error', 'Failed to save videos');
    }
  };

  const discardVideo = () => {
    console.log('Discard button pressed');
    
    // For web, use confirm dialog as fallback
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to discard this video?');
      if (confirmed) {
        console.log('Discard confirmed via confirm dialog');
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
        <TouchableOpacity onPress={discardVideo} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Discard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview</Text>
        <TouchableOpacity onPress={saveVideo} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.videoContainer}>
        {/* Main Video Display */}
        <View style={styles.mainVideoContainer}>
          {Platform.OS === 'web' ? (
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
                    contentFit="cover"
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
                    contentFit="cover"
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
                contentFit="cover"
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
                contentFit="cover"
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

// FeedScreen Component
function FeedScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
    
    // Listen for new videos from navigation
    const unsubscribe = navigation.addListener('focus', () => {
      loadVideos();
    });

    return unsubscribe;
  }, [navigation]);

  const loadVideos = async () => {
    try {
      console.log('Loading videos...', Platform.OS);
      
      // For web, load from localStorage
      if (Platform.OS === 'web') {
        console.log('Loading videos from localStorage');
        const savedVideos = localStorage.getItem('recordedVideos');
        if (savedVideos) {
          const videos = JSON.parse(savedVideos);
          setVideos(videos);
        } else {
          setVideos([]);
        }
        setLoading(false);
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission not granted');
        setLoading(false);
        return;
      }

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'video',
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 50,
      });

      console.log('Found videos:', media.assets.length);
      setVideos(media.assets);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderVideoItem = ({ item }) => {
    console.log('Rendering video item:', item.id, item.uri);
    
    // For web, show actual video
    if (Platform.OS === 'web') {
      return (
        <View style={styles.videoItem}>
          <View style={styles.videoContainer}>
            <video
              src={item.uri}
              style={styles.webVideo}
              controls={true}
              preload="metadata"
            />
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoDate}>
              {new Date(item.creationTime).toLocaleDateString()}
            </Text>
            <Text style={styles.videoDuration}>
              {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.videoItem}>
        <View style={styles.videoContainer}>
          <VideoView
            source={{ uri: item.uri }}
            style={styles.video}
            contentFit="cover"
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            nativeControls={false}
            onError={(error) => {
              console.error('Video error:', error);
            }}
            onLoad={() => console.log('Video loaded:', item.id)}
          />
          <View style={styles.playOverlay}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.videoDate}>
            {new Date(item.creationTime).toLocaleDateString()}
          </Text>
          <Text style={styles.videoDuration}>
            {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      </View>
    );
  };

  console.log('FeedScreen render - videos:', videos.length, 'loading:', loading);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Videos</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Camera')}
          style={styles.cameraButton}
        >
          <Text style={styles.cameraButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      {videos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {Platform.OS === 'web' ? 'Demo Mode - No videos yet' : 'No videos yet'}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Camera')}
            style={styles.recordButton}
          >
            <Text style={styles.recordButtonText}>
              {Platform.OS === 'web' ? 'Try Camera Demo' : 'Record Your First Video'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.videoList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// Main App Component
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#000" />
      <Stack.Navigator
        initialRouteName="Camera"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000' }
        }}
      >
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="Preview" component={PreviewScreen} />
        <Stack.Screen name="Feed" component={FeedScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
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
    justifyContent: 'space-around',
    alignItems: 'center',
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
  demoCamera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#555',
    borderStyle: 'dashed',
  },
  demoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  demoSubtext: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  demoFrontCamera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#444',
    borderWidth: 1,
    borderColor: '#666',
  },
  demoFrontText: {
    fontSize: 30,
    color: '#fff',
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
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  headerTitle: {
    color: '#fff',
    fontSize: 24,
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
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginBottom: 30,
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
  webVideo: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
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
});
