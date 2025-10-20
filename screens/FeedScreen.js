import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { VideoView } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');

export default function FeedScreen({ navigation }) {
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('FeedScreen render - videos:', videos.length, 'loading:', loading);

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
  recordButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  recordButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
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
  video: {
    width: '100%',
    height: 200,
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
  videoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  placeholderSubtext: {
    color: '#666',
    fontSize: 12,
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
