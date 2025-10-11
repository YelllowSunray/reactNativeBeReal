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
} from 'react-native';
import { Camera } from 'expo-camera';
import { VideoView } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';
import Webcam from 'react-webcam';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [frontCamera, setFrontCamera] = useState(true);
  const [backCamera, setBackCamera] = useState(true);
  const [webcamDevices, setWebcamDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  
  const frontCameraRef = useRef(null);
  const backCameraRef = useRef(null);
  const webcamRef = useRef(null);
  const recordingTimer = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    getPermissions();
    if (Platform.OS === 'web') {
      getWebcamDevices();
    }
  }, []);

  const getWebcamDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setWebcamDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting webcam devices:', error);
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

  const startRecording = async () => {
    if (isRecording) return;

    try {
      setIsRecording(true);
      setRecordingTime(0);
      recordedChunksRef.current = [];

      if (Platform.OS === 'web') {
        // Web recording using MediaRecorder
        const stream = webcamRef.current?.video?.srcObject;
        if (stream) {
          mediaRecorderRef.current = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
          });

          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };

          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            navigation.navigate('Preview', {
              frontVideo: url,
              backVideo: url, // Same video for both on web
              duration: recordingTime
            });
          };

          mediaRecorderRef.current.start();
        }
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
        // Stop web recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
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

  // Web camera mode
  if (hasPermission === 'web-demo') {
    console.log('Rendering web camera mode');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraContainer}>
          {/* Web camera view */}
          <View style={styles.webCameraContainer}>
            {selectedDeviceId && (
              <Webcam
                ref={webcamRef}
                audio={true}
                videoConstraints={{
                  deviceId: selectedDeviceId,
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }}
                style={styles.webCamera}
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

          {/* Camera controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                if (webcamDevices.length > 1) {
                  const currentIndex = webcamDevices.findIndex(device => device.deviceId === selectedDeviceId);
                  const nextIndex = (currentIndex + 1) % webcamDevices.length;
                  setSelectedDeviceId(webcamDevices[nextIndex].deviceId);
                }
              }}
            >
              <Text style={styles.controlText}>
                {webcamDevices.length > 1 ? 'Switch Camera' : 'Camera'}
              </Text>
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
              onPress={() => navigation.navigate('Feed')}
            >
              <Text style={styles.controlText}>Feed</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.navigate('Feed')}
            >
              <Text style={styles.navButtonText}>View Feed</Text>
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
  webCameraContainer: {
    flex: 1,
    position: 'relative',
  },
  webCamera: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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
});
