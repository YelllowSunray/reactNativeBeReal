# 🐛 Friend System Debug Guide

## How to Debug Friend Requests

I've added **extensive console logging** to help us find the issue! Follow these steps:

### Step 1: Open Browser Console
Press **F12** or right-click → Inspect → **Console** tab

### Step 2: Test Friend Request Flow

#### On User A's Device (Sender):
1. Go to Friends tab
2. Enter User B's phone number (e.g., `6 1234 5678` with country code `+31`)
3. Click "Send Request"
4. **Watch the console carefully!**

**Expected Console Output:**
```
🔍 Searching for user with phone: +316123455678
✅ User found: +316123455678
📤 Sending friend request...
   From (me): abc123...
   To (friend): def456...
💾 Creating friend request doc with data: {from: "abc123...", to: "def456...", status: "pending"}
✅ Friend request created with ID: xyz789...
📝 Request details:
   - Request ID: xyz789...
   - From: abc123...
   - To: def456...
   - Status: pending
🔄 Reloading friend requests to update UI...
📬 Loading friend requests for user: abc123...
📤 Loaded 1 sent requests
```

#### On User B's Device (Receiver):
1. Go to Friends tab → "Requests" tab
2. **Watch the console!**

**Expected Console Output:**
```
📬 Loading friend requests for user: def456...
📥 Loading RECEIVED requests (where to == my user ID)
   My user ID: def456...
📊 Found 1 raw received request docs
📬 Processing received request xyz789...: {from: "abc123...", to: "def456...", status: "pending"}
   ✅ Found sender user: +31612345678
✅ Loaded 1 received requests
```

**If you see this, friend requests ARE working!** ✅

3. Click "Accept" on the request
4. **Watch the console!**

**Expected Console Output:**
```
✅ Accepting friend request...
   Request ID: xyz789...
   From user: abc123...
   My user ID: def456...
📝 Updating request status to "accepted"...
   ✅ Request status updated
👥 Adding users to each others friends lists...
   📝 Adding abc123... to my (def456...) friends list...
   ✅ Added to my friends list
   📝 Adding me (def456...) to abc123...'s friends list...
   ✅ Added to their friends list
🎉 Users are now friends!
🔄 Reloading friends and requests...
👥 Loading friends for user: def456...
📖 Fetching user document to get friends array...
📋 User has 1 friend IDs: ["abc123..."]
   📖 Loading friend data for abc123...
   ✅ Found friend: +31612345678
✅ Loaded 1 friends
```

#### Back on User A's Device:
1. Switch to Friends tab or refresh
2. **Watch the console!**

**Expected Console Output:**
```
👀 FriendsScreen focused - refreshing data
👥 Loading friends for user: abc123...
📖 Fetching user document to get friends array...
📋 User has 1 friend IDs: ["def456..."]
   📖 Loading friend data for def456...
   ✅ Found friend: +31687654321
✅ Loaded 1 friends
```

---

## 🔍 Common Issues & Solutions

### Issue 1: "📊 Found 0 raw received request docs"
**Problem:** Friend request not reaching the receiver

**Check:**
- Did the sender see "✅ Friend request created"?
- Are both users using the correct phone numbers?
- Check Firestore Console → friendRequests collection
  - Does the document exist?
  - Is the "to" field correct?

### Issue 2: "⚠️ Sender user not found in users collection"
**Problem:** User who sent the request doesn't exist in database

**Solution:**
- Make sure both users have completed profile setup
- Check Firestore Console → users collection
- Verify both users have documents

### Issue 3: Friend accepted but not showing
**Problem:** Friends array not updating

**Check console for:**
- "✅ Added to my friends list" - Should appear TWICE
- "✅ Loaded 1 friends" - After accepting

**Verify in Firestore:**
1. Go to Firestore Console
2. Click "users" collection
3. Find User A's document
4. Check "friends" array - should contain User B's ID
5. Find User B's document  
6. Check "friends" array - should contain User A's ID

### Issue 4: Videos not showing in For You feed
**Problem:** Friends' videos not appearing

**Expected Console Output in For You feed:**
```
🎥 ForYou: Loading videos from YOU + YOUR FRIENDS...
👤 Current user ID: abc123...
👥 Loading videos from 2 users (you + 1 friends)
📋 User IDs: ["abc123...", "def456..."]
🔍 Querying chunk 1: ["abc123...", "def456..."]
📊 Executing query...
📦 Query returned X videos
```

**Check:**
- Do friends have uploaded videos?
- Check Firestore Console → videos collection
- Look for videos with userId matching friend's ID

---

## 📊 Quick Firestore Check

### Check Friend Requests:
1. Open Firebase Console
2. Go to Firestore Database
3. Click "friendRequests" collection
4. Look for documents with:
   - `from: <sender_user_id>`
   - `to: <receiver_user_id>`
   - `status: "pending"` or `"accepted"`

### Check Users' Friends Arrays:
1. Go to "users" collection
2. Click on a user document
3. Look for `friends` field (should be an array)
4. Should contain user IDs of their friends

---

## 🆘 Send Me This Info

If something is broken, copy and send me:

1. **Console logs** (all the 📬 📤 📥 ✅ ❌ messages)
2. **Firestore screenshot** of:
   - friendRequests collection
   - users collection (friends arrays)
3. **What step failed?**
   - Sending request
   - Receiving request
   - Accepting request
   - Loading friends
   - Loading videos

The console logs will tell us EXACTLY what's wrong! 🔍

