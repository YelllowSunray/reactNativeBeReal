# 🐛 Video Not Showing Up - Debug Guide

## 🎯 The Problem
Videos record successfully, but don't appear in:
- ❌ For You feed
- ❌ My Videos feed

---

## 🔍 Step-by-Step Debug Process

### STEP 1: Open Browser Console
**Press F12** or right-click → Inspect → Console tab

**Keep it open for the entire process!**

---

### STEP 2: Record & Save a Video

1. Click the **+ (Camera)** button
2. Click **Record** button
3. Record for 3-5 seconds
4. Click **Stop**
5. Click **Save** button
6. **Watch the console carefully!**

---

### STEP 3: Check Console Output

#### ✅ GOOD OUTPUT (Video saved successfully):
```
📤 Starting video upload...
👤 User ID: abc123def456
🌐 Web platform detected, uploading blob...
✅ Blob created, size: 234567
📝 Uploading to: videos/abc123.../1697123456789.webm
📊 Upload progress: 25%
📊 Upload progress: 50%
📊 Upload progress: 75%
📊 Upload progress: 100%
✅ Upload complete!
🔗 Download URL: https://firebasestorage.googleapis...
💾 Saving video metadata to Firestore: {userId: "...", videoUrl: "...", ...}
✅ Video metadata saved to Firestore with ID: xyz789abc123
📄 Saved document: {id: "xyz789abc123", userId: "...", ...}
```

#### ❌ BAD OUTPUT (Various errors):

**Error A: Storage not initialized**
```
❌ Firebase Storage not initialized!
```

**Error B: Permission denied (Storage)**
```
❌ Upload error: FirebaseError: storage/unauthorized
```

**Error C: Permission denied (Firestore)**
```
❌ Error saving video: FirebaseError: Missing or insufficient permissions
```

**Error D: Nothing in console**
```
(No logs at all)
```

---

### STEP 4: Check Firebase Console

1. Go to https://console.firebase.google.com/
2. Select your project: **reactnativevideobereal**

#### Check Storage:
1. Click **Storage** in left menu
2. Look for: `videos/{your-user-id}/`
3. **Is there a video file there?**
   - ✅ YES → Storage works! Issue is with Firestore
   - ❌ NO → Storage upload failed

#### Check Firestore:
1. Click **Firestore Database** in left menu
2. Click **Data** tab
3. Look for **videos** collection
4. **Do you see any documents?**
   - ✅ YES → Videos are saving! Issue is with loading
   - ❌ NO → Videos aren't saving to Firestore

---

### STEP 5: Try Loading Videos

**After saving a video, try loading the feeds:**

#### Check "My Videos" Feed:
1. Click **My Videos** tab
2. Watch console for:

**✅ Good output:**
```
🎬 YourVideos: Loading videos from Firestore...
👤 YourVideos: Loading videos for user: abc123def456
📊 Executing query for My Videos...
📦 Query returned 1 videos
📹 My video found: {id: "xyz789", userId: "abc123...", ...}
✅ YourVideos: Loaded 1 videos from Firestore
```

**❌ Bad output:**
```
❌ YourVideos: Error loading videos: FirebaseError: requires an index
🔥 FIRESTORE INDEX ERROR: You need to create a composite index!
```

#### Check "For You" Feed:
1. Click **For You** tab
2. Watch console for:

**✅ Good output:**
```
🎥 ForYou: Loading videos from YOU + YOUR FRIENDS...
👤 Current user ID: abc123def456
👥 Loading videos from 1 users (you + 0 friends)
📋 User IDs: ["abc123def456"]
🔍 Querying chunk 1: ["abc123def456"]
📊 Executing query...
📦 Query returned 1 videos
📹 Video found: {id: "xyz789", ...}
✅ ForYou: Loaded 1 videos from friends feed
```

**❌ Bad output:**
```
❌ ForYou: Error loading videos: FirebaseError: requires an index
🔥 FIRESTORE INDEX ERROR: You need to create a composite index!
```

---

## 🔥 Most Common Issue: Missing Firestore Index

### What is a Firestore Index?
Think of it like a phone book. Without it, Firestore can't quickly find videos sorted by date.

### How to Fix:

#### Option 1: Click the Link in Console
When you see the error, it will show a link like:
```
https://console.firebase.google.com/project/.../database/firestore/indexes?create_composite=...
```

**Click that link!** It will:
1. Open Firebase Console
2. Auto-fill the index settings
3. Click **"Create Index"**
4. Wait 2-5 minutes

#### Option 2: Manual Creation
1. Go to Firebase Console
2. Click **Firestore Database** → **Indexes** tab
3. Click **"Create Index"**
4. Fill in:
   - **Collection ID**: `videos`
   - **Field 1**: `userId` (Ascending)
   - **Field 2**: `createdAt` (Descending)
   - **Query scope**: Collection
5. Click **Create**
6. Wait for it to build (shows progress bar)

---

## 🔒 Check Firebase Rules

### Storage Rules (for uploading videos)

1. Go to Firebase Console → **Storage** → **Rules**
2. Should look like:

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

3. Click **Publish** if not already set

### Firestore Rules (for saving/loading data)

1. Go to Firebase Console → **Firestore Database** → **Rules**
2. Should look like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /videos/{videoId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
    
    match /friendRequests/{requestId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish** if not already set

---

## 📝 Report Back with This Info

Please tell me:

### 1. Console Output During Save
Copy/paste what you see when you click "Save" after recording.

### 2. Firebase Console Check
- **Storage**: Do you see video files? YES/NO
- **Firestore**: Do you see videos collection? YES/NO
- **Firestore**: How many video documents? NUMBER

### 3. Console Output During Load
Copy/paste what you see when you go to "My Videos" tab.

### 4. Any Errors?
Copy the full error message if you see any.

---

## 🎯 Quick Test Script

Here's what to do **right now**:

1. ✅ Open browser console (F12)
2. ✅ Record a 3-second video
3. ✅ Click Save
4. ✅ Copy ALL console messages
5. ✅ Go to "My Videos" tab
6. ✅ Copy ALL console messages
7. ✅ Send me both sets of messages

The console will tell us EXACTLY what's wrong! 🔍

---

## 🎬 Expected Happy Path

When everything works:

1. Record video → Console shows upload progress
2. Save → Console shows "Video metadata saved with ID: xyz"
3. Go to My Videos → Console shows "Loaded 1 videos"
4. Video appears and plays! ✅

If ANY step fails, the console will tell us why!

---

## 🚨 Emergency: Clear Everything & Start Fresh

If nothing works:

1. Go to Firestore → videos collection → Delete all documents
2. Go to Storage → videos folder → Delete all files
3. Record a NEW video
4. Check console step-by-step

This rules out any old bad data!

