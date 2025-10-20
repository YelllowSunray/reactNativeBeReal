# Complete Firebase Rules Setup Guide

## 🔥 Firebase Has TWO Rule Systems

Your app needs rules in **TWO different places** in Firebase:

---

## 1️⃣ FIRESTORE RULES (Database)

### What it controls:
- User profiles data
- Video metadata (titles, timestamps, likes)
- Comments data
- Friend requests

### Where to set it:
Firebase Console → **Firestore Database** → **Rules** tab

### Rules to use:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - allow authenticated users to read/update
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null; // Allow ANY authenticated user to update (needed for friend arrays)
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Friend Requests - allow authenticated users to send/receive requests
    match /friendRequests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // Videos collection - allow authenticated users to upload/view videos
    match /videos/{videoId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Comments collection - allow authenticated users to read/write comments
    match /comments/{commentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 2️⃣ STORAGE RULES (File Storage)

### What it controls:
- Actual video files (.mp4, .webm)
- Profile photo files (.jpg)
- Any uploaded media

### Where to set it:
Firebase Console → **Storage** → **Rules** tab

### Rules to use:
```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Profile Photos - Users can upload/update their own profile photo
    match /profilePhotos/{userId}_{timestamp}.jpg {
      allow read: if true; // Anyone can view profile photos
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Videos - Users can upload their own videos
    match /videos/{userId}/{allPaths=**} {
      allow read: if true; // Anyone can view videos
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Fallback for other files (more restrictive)
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## ✅ HOW TO SET UP BOTH

### Step 1: Firestore Rules
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select project: **reactnativevideobereal**
3. Click **Firestore Database** in left menu
4. Click **Rules** tab at top
5. Copy the **FIRESTORE RULES** above
6. Paste and click **Publish**

### Step 2: Storage Rules
1. Stay in Firebase Console
2. Click **Storage** in left menu (different section!)
3. Click **Rules** tab at top
4. Copy the **STORAGE RULES** above
5. Paste and click **Publish**

---

## 🔍 HOW TO CHECK IF BOTH ARE SET UP

### Check Firestore Rules:
1. Firebase Console → **Firestore Database** → **Rules**
2. Should see `service cloud.firestore`
3. Should have matches for: users, friendRequests, videos, comments

### Check Storage Rules:
1. Firebase Console → **Storage** → **Rules**
2. Should see `service firebase.storage`
3. Should have matches for: profilePhotos, videos

---

## 🚨 IMPORTANT: They Are Separate!

| System | What It Does | File Extension |
|--------|-------------|----------------|
| **Firestore** | Stores data (text, numbers, arrays) | No rules file locally |
| **Storage** | Stores files (videos, images) | `storage.rules` |

You need to set **BOTH** in the Firebase Console!

---

## ❌ Common Mistake

**WRONG:** Setting Storage rules in Firestore (or vice versa)  
**RIGHT:** Set Firestore rules in Firestore tab, Storage rules in Storage tab

---

## ✅ After Setting Both:

- ✅ Profile photos upload
- ✅ Videos upload  
- ✅ Comments work
- ✅ Friend system works
- ✅ Likes work

Everything should work perfectly! 🎉

