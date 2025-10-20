import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  addDoc
} from 'firebase/firestore';

const FriendsContext = createContext();

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
};

export const FriendsProvider = ({ children }) => {
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, firebaseAvailable } = useAuth();

  // Load friends and requests when user changes
  useEffect(() => {
    if (user?.uid) {
      console.log('👤 User logged in, loading friends for:', user.uid);
      console.log('   User has friends array:', user.friends?.length || 0, 'friends');
      loadFriends(true); // Show loading on initial load
      loadFriendRequests();
    } else {
      console.log('⚠️ No user logged in, clearing friends');
      setFriends([]);
      setSentRequests([]);
      setReceivedRequests([]);
    }
  }, [user?.uid]);

  // Auto-refresh friends and requests every 5 seconds to catch changes from other devices
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing friends and requests...');
      loadFriends();
      loadFriendRequests();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(intervalId);
  }, [user]);

  const loadFriends = async (showLoading = false) => {
    if (!user) {
      console.log('⚠️ loadFriends: No user logged in');
      return;
    }
    
    if (showLoading) setLoading(true);
    
    try {
      console.log('👥 Loading friends for user:', user.uid);
      const friendsData = [];
      
      // Get current user's friends list
      console.log('📖 Fetching user document to get friends array...');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.log('⚠️ User document not found!');
        setFriends([]);
        if (showLoading) setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      const friendIds = userData?.friends || [];
      
      console.log(`📋 User has ${friendIds.length} friend IDs:`, friendIds);
      
      // Load each friend's data
      for (const friendId of friendIds) {
        console.log(`   📖 Loading friend data for ${friendId}...`);
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          console.log(`   ✅ Found friend: ${friendData.phoneNumber || friendData.username || friendId}`);
          friendsData.push({
            id: friendDoc.id,
            ...friendData
          });
        } else {
          console.log(`   ⚠️ Friend ${friendId} not found in users collection`);
        }
      }
      
      console.log(`✅ Loaded ${friendsData.length} friends`);
      setFriends(friendsData);
    } catch (error) {
      console.error('❌ Error loading friends:', error);
      console.error('❌ Error details:', error.message);
      setFriends([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const searchUserByPhone = async (phoneNumber) => {
    try {
      console.log('🔍 Searching for user with phone:', phoneNumber);
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('❌ No user found');
        return { success: false, error: 'No user found with this phone number' };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() };
      
      // Check if trying to add yourself
      if (userData.id === user.uid) {
        return { success: false, error: 'You cannot add yourself as a friend' };
      }
      
      // Get current user's friends list
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      const currentUserFriends = currentUserDoc.data()?.friends || [];
      
      // Check if already friends
      if (currentUserFriends.includes(userData.id)) {
        return { success: false, error: 'This user is already your friend' };
      }
      
      // Check if request already sent
      const existingQuery = query(
        collection(db, 'friendRequests'),
        where('from', '==', user.uid),
        where('to', '==', userData.id),
        where('status', '==', 'pending')
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        return { success: false, error: 'Friend request already sent to this user' };
      }
      
      console.log('✅ User found:', userData.phoneNumber);
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Error searching user:', error);
      return { success: false, error: 'Error searching for user: ' + error.message };
    }
  };

  const loadFriendRequests = async () => {
    if (!user) return;
    
    try {
      console.log('📬 Loading friend requests for user:', user.uid);
      
      // Load sent requests
      const sentQuery = query(
        collection(db, 'friendRequests'),
        where('from', '==', user.uid),
        where('status', '==', 'pending')
      );
      const sentSnapshot = await getDocs(sentQuery);
      const sentRequestsData = [];
      
      for (const reqDoc of sentSnapshot.docs) {
        const reqData = reqDoc.data();
        const userDoc = await getDoc(doc(db, 'users', reqData.to));
        if (userDoc.exists()) {
          sentRequestsData.push({
            id: reqDoc.id,
            toUserId: reqData.to,
            user: { id: userDoc.id, ...userDoc.data() },
            createdAt: reqData.createdAt
          });
        }
      }
      console.log(`📤 Loaded ${sentRequestsData.length} sent requests`);
      setSentRequests(sentRequestsData);
      
      // Load received requests
      console.log('📥 Loading RECEIVED requests (where to == my user ID)');
      console.log('   My user ID:', user.uid);
      
      const receivedQuery = query(
        collection(db, 'friendRequests'),
        where('to', '==', user.uid),
        where('status', '==', 'pending')
      );
      const receivedSnapshot = await getDocs(receivedQuery);
      console.log(`📊 Found ${receivedSnapshot.docs.length} raw received request docs`);
      
      const receivedRequestsData = [];
      
      for (const reqDoc of receivedSnapshot.docs) {
        const reqData = reqDoc.data();
        console.log(`📬 Processing received request ${reqDoc.id}:`, {
          from: reqData.from,
          to: reqData.to,
          status: reqData.status
        });
        
        const userDoc = await getDoc(doc(db, 'users', reqData.from));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`   ✅ Found sender user: ${userData.phoneNumber || userData.username || userDoc.id}`);
          receivedRequestsData.push({
            id: reqDoc.id,
            fromUserId: reqData.from,
            user: { id: userDoc.id, ...userData },
            createdAt: reqData.createdAt
          });
        } else {
          console.log(`   ⚠️ Sender user ${reqData.from} not found in users collection`);
        }
      }
      console.log(`✅ Loaded ${receivedRequestsData.length} received requests`);
      setReceivedRequests(receivedRequestsData);
    } catch (error) {
      console.error('❌ Error loading friend requests:', error);
      setSentRequests([]);
      setReceivedRequests([]);
    }
  };

  const sendFriendRequest = async (friendId) => {
    try {
      console.log('📤 Sending friend request...');
      console.log('   From (me):', user.uid);
      console.log('   To (friend):', friendId);
      
      // Check if request already exists
      const existingQuery = query(
        collection(db, 'friendRequests'),
        where('from', '==', user.uid),
        where('to', '==', friendId),
        where('status', '==', 'pending')
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        console.log('⚠️ Request already exists');
        return { success: false, error: 'Friend request already sent' };
      }
      
      // Create friend request
      const requestData = {
        from: user.uid,
        to: friendId,
        status: 'pending',
        createdAt: new Date()
      };
      
      console.log('💾 Creating friend request doc with data:', requestData);
      const requestDoc = await addDoc(collection(db, 'friendRequests'), requestData);
      
      console.log('✅ Friend request created with ID:', requestDoc.id);
      console.log('📝 Request details:');
      console.log('   - Request ID:', requestDoc.id);
      console.log('   - From:', requestData.from);
      console.log('   - To:', requestData.to);
      console.log('   - Status:', requestData.status);
      
      // Reload requests to update UI
      console.log('🔄 Reloading friend requests to update UI...');
      await loadFriendRequests();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending friend request:', error);
      console.error('❌ Error details:', error.message);
      return { success: false, error: 'Failed to send friend request: ' + error.message };
    }
  };

  const acceptFriendRequest = async (requestId, fromUserId) => {
    try {
      console.log('✅ Accepting friend request...');
      console.log('   Request ID:', requestId);
      console.log('   From user:', fromUserId);
      console.log('   My user ID:', user.uid);
      
      // Update request status
      console.log('📝 Updating request status to "accepted"...');
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'accepted'
      });
      console.log('   ✅ Request status updated');
      
      // Add both users to each other's friends list
      console.log('👥 Adding users to each others friends lists...');
      
      console.log(`   📝 Adding ${fromUserId} to my (${user.uid}) friends list...`);
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(fromUserId)
      });
      console.log('   ✅ Added to my friends list');
      
      // Verify the write worked
      const myDocAfter = await getDoc(doc(db, 'users', user.uid));
      const myFriendsAfter = myDocAfter.data()?.friends || [];
      console.log('   🔍 VERIFY: My friends array after update:', myFriendsAfter);
      
      console.log(`   📝 Adding me (${user.uid}) to ${fromUserId}'s friends list...`);
      await updateDoc(doc(db, 'users', fromUserId), {
        friends: arrayUnion(user.uid)
      });
      console.log('   ✅ Added to their friends list');
      
      // Verify the write worked
      const theirDocAfter = await getDoc(doc(db, 'users', fromUserId));
      const theirFriendsAfter = theirDocAfter.data()?.friends || [];
      console.log('   🔍 VERIFY: Their friends array after update:', theirFriendsAfter);
      
      console.log('🎉 Users are now friends!');
      
      // Reload data
      console.log('🔄 Reloading friends and requests...');
      await loadFriends();
      await loadFriendRequests();
      console.log('✅ Data reloaded');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error accepting friend request:', error);
      console.error('❌ Error details:', error.message);
      return { success: false, error: 'Failed to accept friend request: ' + error.message };
    }
  };

  const declineFriendRequest = async (requestId) => {
    try {
      console.log('❌ Declining friend request:', requestId);
      
      // Update request status to declined
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'declined'
      });
      
      // Reload requests
      await loadFriendRequests();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error declining friend request:', error);
      return { success: false, error: 'Failed to decline friend request: ' + error.message };
    }
  };

  const cancelFriendRequest = async (requestId) => {
    try {
      console.log('🚫 Cancelling friend request:', requestId);
      
      // Update request status to cancelled
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'cancelled'
      });
      
      // Reload requests
      await loadFriendRequests();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling friend request:', error);
      return { success: false, error: 'Failed to cancel friend request: ' + error.message };
    }
  };

  // Keep old addFriend for backward compatibility but rename it
  const addFriend = sendFriendRequest;

  const removeFriend = async (friendId) => {
    try {
      console.log('🗑️ Removing friend:', friendId);
      
      // Remove friend from current user's friends list
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayRemove(friendId)
      });
      
      // Remove current user from friend's friends list
      await updateDoc(doc(db, 'users', friendId), {
        friends: arrayRemove(user.uid)
      });
      
      console.log('✅ Friend removed');
      
      // Reload friends list
      await loadFriends();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing friend:', error);
      return { success: false, error: 'Failed to remove friend: ' + error.message };
    }
  };

  // Manual refresh function (call this when you need immediate update)
  const refreshAll = async () => {
    console.log('🔄 Manual refresh triggered');
    await loadFriends();
    await loadFriendRequests();
  };

  const value = {
    friends,
    sentRequests,
    receivedRequests,
    loading,
    searchUserByPhone,
    addFriend,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    loadFriends,
    loadFriendRequests,
    refreshAll
  };

  return (
    <FriendsContext.Provider value={value}>
      {children}
    </FriendsContext.Provider>
  );
};