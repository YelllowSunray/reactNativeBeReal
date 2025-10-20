# 🔧 Troubleshooting Guide - Videos & Friend Requests

## 🎯 Issues to Fix

1. ❌ Friend requests not saving to Firestore
2. ❌ Videos not showing in "For You" feed
3. ❌ Videos not showing in "My Videos" feed

---

## 🔍 Step-by-Step Debugging

### ✅ STEP 1: Open Browser Console

**How to open console:**
- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Press `Cmd+Option+C`

Keep the console open while testing!

---

### ✅ STEP 2: Test Video Upload

1. Record a video
2. Click "Save"
3. Watch the console for logs:

**✅ Success looks like:**
```
📤 Starting video upload...
👤 User ID: abc123...
🌐 Web platform detected, uploading blob...
✅ Blob created, size: 123456
📝 Uploading to: videos/abc123.../1234567890.webm
📊 Upload progress: 25%
📊 Upload progress: 50%
📊 Upload progress: 100%
✅ Upload complete!
🔗 Download URL: https://firebasestorage...
💾 Saving video metadata to Firestore
✅ Video metadata saved to Firestore with ID: xyz789
```

**❌ Error patterns to look for:**

#### Error A: "Firebase Storage not initialized"
```
❌ Firebase Storage not initialized!
```
**Fix:** Check `firebase.js` - Storage might not be exported

#### Error B: "Permission denied"
```
❌ Upload error: FirebaseError: [code=storage/unauthorized]
```
**Fix:** Update Firebase Storage rules (see below)

#### Error C: "Missing index"
```
❌ ForYou: Error loading videos: FirebaseError: requires an index
🔥 FIRESTORE INDEX ERROR: You need to create a composite index!
```
**Fix:** Click the link in the error to create the index automatically

---

### ✅ STEP 3: Test Friend Requests

1. Go to Friends tab → "Add Friends"
2. Enter a phone number
3. Click the arrow button
4. Watch the console:

**✅ Success looks like:**
```
🔍 Searching for user with phone: +31612345678
✅ User found: +31612345678
📤 Sending friend request to: user-id-here
✅ Friend request created: request-id-here
📬 Loading friend requests for user: your-user-id
📤 Loaded 1 sent requests
```

**❌ Error patterns:**

#### Error A: "No user found"
```
❌ No user found
```
**Fix:** The other user hasn't signed up yet. Make sure they logged in at least once.

#### Error B: "Permission denied"
```
❌ Error sending friend request: FirebaseError: Missing or insufficient permissions
```
**Fix:** Update Firestore rules (see below)

---

### ✅ STEP 4: Check Firebase Console

1. Go to https://console.firebase.google.com/
2. Select your project: **reactnativevideobereal**

#### Check Videos Collection:
1. Click "Firestore Database" → "Data"
2. Click "videos" collection
3. **Do you see your videos?**
   - ✅ YES → Videos are saving! Issue is with loading/displaying
   - ❌ NO → Videos aren't saving! Check Step 2 errors

#### Check Friend Requests Collection:
1. In Firestore Database → "Data"
2. Click "friendRequests" collection
3. **Do you see friend requests?**
   - ✅ YES → Requests are saving! Issue is with displaying
   - ❌ NO → Requests aren't saving! Check Step 3 errors

---

## 🔥 Required Firebase Rules

### Storage Rules (for video uploads)

1. Go to Firebase Console → **Storage** → **Rules**
2. Copy and paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

### Firestore Rules (for data)

1. Go to Firebase Console → **Firestore Database** → **Rules**
2. Copy and paste:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write, update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Friend Requests collection
    match /friendRequests/{requestId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.from || 
                      request.auth.uid == resource.data.to);
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.from;
      allow update: if request.auth != null && 
                       (request.auth.uid == resource.data.from || 
                        request.auth.uid == resource.data.to);
      allow delete: if request.auth != null && 
                       request.auth.uid == resource.data.from;
    }
    
    // Videos collection
    match /videos/{videoId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
  }
}
```

3. Click **Publish**

---

## 📊 Required Firestore Indexes

### Index 1: For "For You" feed
- Collection: `videos`
- Fields:
  - `userId` (Ascending)
  - `createdAt` (Descending)

### Index 2: For "My Videos" feed
- Collection: `videos`
- Fields:
  - `userId` (Ascending)
  - `createdAt` (Descending)

**How to create:**
1. Try loading videos - you'll get an error with a link
2. Click the link in the error message
3. It opens Firebase Console → Click "Create Index"
4. Wait 1-5 minutes for it to build

---

## 🧪 Testing Checklist

### Video Upload Test:
- [ ] Open browser console
- [ ] Record a video
- [ ] Click Save
- [ ] See "Upload complete!" in console
- [ ] See "Video metadata saved" in console
- [ ] Check Firestore → videos collection → See your video
- [ ] Go to "My Videos" tab → See your video
- [ ] Go to "For You" tab → See your video

### Friend Request Test:
- [ ] Open 2 browsers (or incognito window)
- [ ] Login as User A in browser 1
- [ ] Login as User B in browser 2
- [ ] User A: Send friend request to User B
- [ ] See "Friend request sent!" alert
- [ ] Check console: "Friend request created"
- [ ] Check Firestore → friendRequests → See the request
- [ ] User A: Go to "Sent" tab → See the request
- [ ] User B: Refresh/reopen Friends screen
- [ ] User B: Go to "Requests" tab → See the request
- [ ] User B: Click "Accept"
- [ ] Both users: See each other in "Friends" tab

---

## 🚨 Common Issues & Fixes

### Issue: "Nothing shows up after upload"

**Possible causes:**
1. Videos saving with wrong date format
2. Firestore index missing
3. Query failing silently

**Fix:**
- Check console for errors
- Look for "FIRESTORE INDEX ERROR"
- Click the link to create index

---

### Issue: "Friend requests don't appear"

**Possible causes:**
1. Firestore rules blocking reads
2. Auto-refresh not working
3. Phone number mismatch

**Fix:**
- Check Firestore rules (see above)
- Manually refresh: Close and reopen Friends screen
- Verify both users used correct phone numbers

---

### Issue: "Videos show in Firestore but not in app"

**Possible causes:**
1. Date format is wrong (number vs Date object)
2. Query ordering failing
3. Missing composite index

**Fix:**
- I just fixed the date format (uses `new Date()` now)
- Clear your old videos from Firestore
- Upload a new video to test

---

## 🔄 Clean Slate Test

If nothing works, try this:

1. **Delete old data:**
   - Go to Firestore → videos collection
   - Delete all documents
   - Go to friendRequests collection
   - Delete all documents

2. **Test fresh:**
   - Record a NEW video
   - Send a NEW friend request
   - Check console logs

3. **Report back:**
   - Copy the console logs
   - Tell me exactly which step fails

---

## 📝 What I Fixed

### Video Upload:
- ✅ Changed `createdAt` from number → `new Date()` object
- ✅ Added detailed console logging
- ✅ Added error detection for missing indexes
- ✅ Added success confirmation logging

### Video Loading:
- ✅ Added detailed query logging
- ✅ Added error handling for index errors
- ✅ Fixed date sorting (handles both Date objects and Timestamps)

### Friend Requests:
- ✅ Already had good logging
- ✅ Auto-refresh every 5 seconds
- ✅ Proper error handling

---

## 🎯 Next Steps

1. Open browser console (F12)
2. Try recording a video
3. Copy the console output
4. Try sending a friend request
5. Copy the console output
6. Tell me what you see!

The console logs will tell us exactly what's happening! 🔍

