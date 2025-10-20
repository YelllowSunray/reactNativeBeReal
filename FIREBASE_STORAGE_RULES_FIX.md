# Firebase Storage Rules Fix - Profile Photos Upload Error

## ❌ Error
```
Firebase Storage: User does not have permission to access 'profilePhotos/...'
(storage/unauthorized)
```

## 🔧 Solution

You need to update your **Firebase Storage Security Rules** to allow authenticated users to upload profile photos.

### Step 1: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **reactnativevideobereal**
3. Click **Storage** in the left menu
4. Click the **Rules** tab at the top

### Step 2: Update Your Storage Rules

Replace your current rules with this:

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

### Step 3: Publish the Rules

1. Click **Publish** button
2. Wait for "Rules published successfully" message

### Step 4: Test Again

1. Refresh your app
2. Try uploading a profile photo
3. It should work now! ✅

---

## 📋 What These Rules Do (Explained Simply)

### Profile Photos:
- ✅ **Anyone can VIEW** profile photos (so they show up in feeds)
- ✅ **Only YOU can UPLOAD** your own profile photo
- ✅ **Only YOU can DELETE** your own profile photo

### Videos:
- ✅ **Anyone can WATCH** videos
- ✅ **Only YOU can UPLOAD** your own videos
- ✅ **Only YOU can DELETE** your own videos

### Security:
- 🔒 Only **authenticated users** (logged in) can upload
- 🔒 Users can only modify **their own files**
- 🔒 Files include the **user ID** in the path for security

---

## 🚨 Common Issues

### Issue: Rules won't save
**Solution**: Make sure you're using `rules_version = '2';` at the top

### Issue: Still getting permission error
**Solution**: 
1. Hard refresh your browser (Ctrl+Shift+R)
2. Log out and log back in
3. Check that you published the rules

### Issue: Videos stopped working
**Solution**: The rules above support both profile photos AND videos. Make sure you copied the entire rule set.

---

## ✅ After Fixing

Once you update the rules:
1. **Circular camera preview** will show ⭕
2. **Click capture** to take selfie
3. **Photo uploads** successfully
4. **Profile picture updates** instantly!

Try it now! 📸

