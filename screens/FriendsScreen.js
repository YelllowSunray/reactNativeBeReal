import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { useFriends } from '../contexts/FriendsContext';
import { useAuth } from '../contexts/AuthContext';

export default function FriendsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('friends'); // friends, received, sent
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+31');
  const [searchLoading, setSearchLoading] = useState(false);
  
  const { 
    friends, 
    sentRequests, 
    receivedRequests, 
    loading, 
    searchUserByPhone, 
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    loadFriendRequests,
    loadFriends
  } = useFriends();
  const { user, refreshUserData } = useAuth();

  // Refresh data when screen opens
  useEffect(() => {
    console.log('🔄 FriendsScreen mounted - refreshing data');
    loadFriends();
    loadFriendRequests();
  }, []);

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('👀 FriendsScreen focused - refreshing data');
      loadFriends();
      loadFriendRequests();
    });
    return unsubscribe;
  }, [navigation]);

  const handleSendRequest = async () => {
    // Clean the phone number (remove spaces, dashes, etc)
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    // Remove leading 0 if present (e.g., "06123455" becomes "6123455")
    const phoneWithoutLeadingZero = cleanedPhone.replace(/^0+/, '');
    
    // Combine country code with phone number (no space for Firebase)
    const fullNumber = countryCode + phoneWithoutLeadingZero;
    
    if (phoneWithoutLeadingZero.length < 6) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    setSearchLoading(true);
    
    // First search for the user
    const searchResult = await searchUserByPhone(fullNumber);
    
    if (searchResult.success) {
      // Send friend request
      const result = await sendFriendRequest(searchResult.user.id);
      
      if (result.success) {
        Alert.alert('Success! 🎉', 'Friend request sent!');
        setPhoneNumber('');
        setActiveTab('sent'); // Switch to sent requests tab
      } else {
        Alert.alert('Error', result.error);
      }
    } else {
      Alert.alert('User Not Found', searchResult.error);
    }
    
    setSearchLoading(false);
  };

  const handleAcceptRequest = async (requestId, fromUserId) => {
    console.log('👍 Accepting friend request from:', fromUserId);
    const result = await acceptFriendRequest(requestId, fromUserId);
    
    if (result.success) {
      Alert.alert('Success! 🎉', 'You are now friends!');
      // Force immediate refresh after accepting
      console.log('🔄 Forcing immediate refresh after accept');
      
      // CRITICAL: Refresh AuthContext user first to update friends array
      if (refreshUserData) {
        console.log('🔄 Step 1: Refreshing AuthContext user data...');
        await refreshUserData();
      }
      
      // Then refresh friends lists (which will use the updated user.friends array)
      console.log('🔄 Step 2: Refreshing friends and requests...');
      await loadFriends();
      await loadFriendRequests();
      
      console.log('✅ All data refreshed successfully!');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    const result = await declineFriendRequest(requestId);
    
    if (result.success) {
      Alert.alert('Declined', 'Friend request declined');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleCancelRequest = async (requestId) => {
    const result = await cancelFriendRequest(requestId);
    
    if (result.success) {
      Alert.alert('Cancelled', 'Friend request cancelled');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleRemoveFriend = (friendId, friendName) => {
    const message = Platform.OS === 'web' 
      ? `Remove ${friendName}?`
      : `Are you sure you want to remove ${friendName}?`;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        removeFriend(friendId).then(result => {
          if (result.success) {
            Alert.alert('Removed', 'Friend removed');
          }
        });
      }
    } else {
      Alert.alert(
        'Remove Friend',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const result = await removeFriend(friendId);
              if (result.success) {
                Alert.alert('Removed', 'Friend removed');
              }
            }
          }
        ]
      );
    }
  };

  const formatPhoneDisplay = (phone) => {
    if (!phone) return 'Unknown';
    
    // Format like: +31 6 1234 5678
    // Match country code and number parts
    const match = phone.match(/^(\+\d{1,3})(\d{1})(\d{4})(\d+)/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
    
    // Fallback: just add space after country code
    return phone.replace(/^(\+\d{1,3})(\d)/, '$1 $2');
  };

  const renderFriendItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.fullName ? item.fullName.charAt(0).toUpperCase() : '👤'}
        </Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>
          {item.fullName || formatPhoneDisplay(item.phoneNumber)}
        </Text>
        <Text style={styles.itemSubtext}>{formatPhoneDisplay(item.phoneNumber)}</Text>
      </View>
      <TouchableOpacity
        style={styles.dangerButton}
        onPress={() => handleRemoveFriend(item.id, item.fullName || item.phoneNumber)}
      >
        <Text style={styles.dangerButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReceivedRequestItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.user.fullName ? item.user.fullName.charAt(0).toUpperCase() : '👤'}
        </Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>
          {item.user.fullName || formatPhoneDisplay(item.user.phoneNumber)}
        </Text>
        <Text style={styles.itemSubtext}>{formatPhoneDisplay(item.user.phoneNumber)}</Text>
      </View>
      <View style={styles.requestButtons}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item.id, item.fromUserId)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(item.id)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequestItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.user.fullName ? item.user.fullName.charAt(0).toUpperCase() : '👤'}
        </Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>
          {item.user.fullName || formatPhoneDisplay(item.user.phoneNumber)}
        </Text>
        <Text style={styles.itemSubtext}>{formatPhoneDisplay(item.user.phoneNumber)}</Text>
      </View>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => handleCancelRequest(item.id)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => {
    let message = '';
    let emoji = '';
    
    switch (activeTab) {
      case 'friends':
        emoji = '👥';
        message = 'No friends yet';
        break;
      case 'received':
        emoji = '📬';
        message = 'No incoming requests';
        break;
      case 'sent':
        emoji = '📤';
        message = 'No pending requests';
        break;
    }
    
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>{emoji}</Text>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    let data = [];
    let renderItem = null;
    
    switch (activeTab) {
      case 'friends':
        data = friends;
        renderItem = renderFriendItem;
        break;
      case 'received':
        data = receivedRequests;
        renderItem = renderReceivedRequestItem;
        break;
      case 'sent':
        data = sentRequests;
        renderItem = renderSentRequestItem;
        break;
    }

    if (data.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Add Friend Section */}
      <View style={styles.addSection}>
        <Text style={styles.addTitle}>Add Friend by Phone Number</Text>
        <View style={styles.phoneInputRow}>
          <TextInput
            style={styles.countryCodeInput}
            value={countryCode}
            onChangeText={setCountryCode}
            keyboardType="phone-pad"
            maxLength={4}
          />
          <TextInput
            style={styles.phoneInput}
            placeholder="612345678"
            placeholderTextColor="#666"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={15}
          />
          <TouchableOpacity
            style={[styles.sendButton, searchLoading && styles.sendButtonDisabled]}
            onPress={handleSendRequest}
            disabled={searchLoading}
          >
            <Text style={styles.sendButtonText}>
              {searchLoading ? '...' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
          {friends.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{friends.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Requests
          </Text>
          {receivedRequests.length > 0 && (
            <View style={[styles.badge, styles.badgeAlert]}>
              <Text style={styles.badgeText}>{receivedRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent
          </Text>
          {sentRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{sentRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    paddingVertical: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 60,
  },
  addSection: {
    padding: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  addTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCodeInput: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    width: 70,
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  sendButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  badge: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeAlert: {
    backgroundColor: '#ff4444',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 15,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtext: {
    color: '#666',
    fontSize: 13,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
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
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
});
