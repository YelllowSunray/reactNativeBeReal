# 🔥 Firestore Security Rules Setup

Your app now has proper error handling, but you still need to update your Firestore rules to allow authenticated users to access their data.

## 📋 Steps to Update Firestore Rules

### 1. Open Firebase Console
- Go to: https://console.firebase.google.com/
- Select project: **reactnativevideobereal**
- Click **Firestore Database** in left sidebar
- Click **Rules** tab at the top

### 2. Replace Current Rules

Copy and paste these rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read user data (for friend search)
      allow read: if request.auth != null;
      
      // Only the user can write/update their own document
      allow write, update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Friend Requests collection
    match /friendRequests/{requestId} {
      // Can read if you're the sender or receiver
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.from || 
                      request.auth.uid == resource.data.to);
      
      // Can create if you're the sender
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.from;
      
      // Can update if you're involved (for accepting/declining)
      allow update: if request.auth != null && 
                       (request.auth.uid == resource.data.from || 
                        request.auth.uid == resource.data.to);
      
      // Can delete if you're the sender (cancel request)
      allow delete: if request.auth != null && 
                       request.auth.uid == resource.data.from;
    }
    
    // Videos collection
    match /videos/{videoId} {
      allow read: if true;  // Anyone can read videos
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;  // Only create your own
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;  // Only modify your own
    }
  }
}
```

### 3. Publish Rules
Click the **"Publish"** button in Firebase Console.

### 4. Test Your App
- Refresh your browser
- Enter your phone number
- Complete the reCAPTCHA
- Check your phone for SMS
- Enter the verification code

---

## ✅ What These Rules Do

### Users Collection
- **Read**: Any authenticated user can search for others by phone number
- **Write**: Users can only update their own profile

### Friend Requests Collection
- **Read**: Only see requests where you're the sender OR receiver
- **Create**: Can only create requests where YOU are the sender
- **Update**: Can accept/decline requests you're involved in
- **Delete**: Can cancel requests you sent

### Videos Collection
- **Read**: Everyone can watch videos (public feed)
- **Create**: Can only upload videos under your own userId
- **Update/Delete**: Can only modify your own videos

---

## 🎉 After Updating Rules

Your app will:
1. ✅ Send SMS verification codes
2. ✅ Save user data to Firestore
3. ✅ Allow friend management
4. ✅ Work on both web and mobile!

---

## 🆘 If You Still See Permission Errors

Check the browser console for:
```
⚠️ Firestore permission error (rules need to be updated)
```

If you see this, the rules haven't been published yet. Go back to Step 3 and click "Publish".

