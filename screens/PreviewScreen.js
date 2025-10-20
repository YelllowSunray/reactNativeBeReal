import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { VideoView } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');

export default function PreviewScreen({ route, navigation }) {
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
        // Save to localStorage for the feed
        const savedVideos = JSON.parse(localStorage.getItem('recordedVideos') || '[]');
        const newVideo = {
          id: `video-${Date.now()}`,
          uri: frontVideo,
          creationTime: Date.now(),
          duration: duration
        };
        savedVideos.unshift(newVideo); // Add to beginning
        localStorage.setItem('recordedVideos', JSON.stringify(savedVideos));
        
        // Also download the video
        if (frontVideo) {
          const link = document.createElement('a');
          link.href = frontVideo;
          link.download = `video-${Date.now()}.webm`;
          link.click();
        }
        Alert.alert('Success', 'Video saved and downloaded!');
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
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
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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
});
