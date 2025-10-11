# 🐛 Profile Login Issue - Debug Guide

## Problem
Every time you login, the app asks for your name and username again, even though you've already saved them.

## How to Debug

### Step 1: Open Browser Console
Press **F12** → **Console** tab

### Step 2: Login to the App
Enter your phone number and verification code, then watch the console.

### Expected Console Output (When Working Correctly):

```
🔐 Auth state changed: User logged in
📖 Fetching user document from Firestore for: abc123def456...
✅ User document found with data: {
  phoneNumber: "+31612345678",
  username: "johndoe",
  fullName: "John Doe",
  profileComplete: true,
  hasFriends: 2
}
🔍 Profile check: {
  hasUser: true,
  profileComplete: true,
  fullName: "John Doe",
  username: "johndoe",
  isProfileIncomplete: false
}
✅ Profile complete, showing main app
```

**Result:** App goes directly to main feed ✅

---

### Bad Output #1: Profile Not Saved

```
🔐 Auth state changed: User logged in
📖 Fetching user document from Firestore for: abc123def456...
✅ User document found with data: {
  phoneNumber: "+31612345678",
  username: undefined,           ❌
  fullName: undefined,           ❌
  profileComplete: undefined,    ❌
  hasFriends: 0
}
🔍 Profile check: {
  hasUser: true,
  profileComplete: undefined,
  fullName: undefined,
  username: undefined,
  isProfileIncomplete: true      ❌
}
⚠️ Profile incomplete, showing CompleteProfile screen
```

**Problem:** Your profile was never saved to Firebase!

**Solution:** 
1. Check Firebase Console → Firestore → users collection
2. Find your user document (use your phone number to identify it)
3. Does it have `username`, `fullName`, and `profileComplete: true`?
4. If NOT, fill out the profile form again and check console for save errors

---

### Bad Output #2: profileComplete = false

```
✅ User document found with data: {
  phoneNumber: "+31612345678",
  username: "johndoe",
  fullName: "John Doe",
  profileComplete: false,        ❌
  hasFriends: 0
}
🔍 Profile check: {
  hasUser: true,
  profileComplete: false,        ❌
  fullName: "John Doe",
  username: "johndoe",
  isProfileIncomplete: true      ❌
}
⚠️ Profile incomplete, showing CompleteProfile screen
```

**Problem:** Your profile data is there, but `profileComplete` flag is set to `false`

**Solution:**
1. Go to Firebase Console → Firestore → users collection
2. Find your user document
3. Edit the document
4. Set `profileComplete` to `true` (boolean)
5. Save and login again

---

### Bad Output #3: User Document Not Found

```
🔐 Auth state changed: User logged in
📖 Fetching user document from Firestore for: abc123def456...
📝 User document does not exist, creating new one...  ❌
✅ New user document created
```

**Problem:** Your user document was deleted or never created properly

**Solution:**
- This creates a fresh user document
- Complete the profile form again
- It should save properly this time

---

## Quick Fix Guide

### If Profile Data Exists but Flag is Wrong:

1. Open Firebase Console: https://console.firebase.google.com
2. Go to your project
3. Click **Firestore Database**
4. Click **users** collection
5. Find your document (use phone number)
6. Click the document
7. Look for these fields:
   - `username`: should have your username
   - `fullName`: should have your full name
   - `profileComplete`: **should be `true` (boolean)**
8. If `profileComplete` is missing or `false`:
   - Click **Edit** (pencil icon)
   - Add/edit field: `profileComplete` → Type: `boolean` → Value: `true`
   - Click **Update**
9. Login again - should work! ✅

---

## What I Fixed

I added debug logging to track:

1. **User Data Loading** (`contexts/AuthContext.js`)
   - Shows exactly what data is loaded from Firestore
   - Shows if username, fullName, profileComplete exist

2. **Profile Completeness Check** (`App.snack.js`)
   - Shows what the app is checking
   - Shows why it decides to show/hide CompleteProfile screen

3. **Better Error Handling**
   - Sets `profileComplete: false` by default for new users
   - Logs all Firestore errors

---

## After You Test

Send me the console logs and tell me:
1. Which scenario matches your output?
2. Did the quick fix work?
3. Are the fields present in Firebase?

The logs will tell us EXACTLY what's wrong! 🔍

