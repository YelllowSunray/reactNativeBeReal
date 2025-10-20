# Firebase App Check - Quick Start

## ✅ What's Already Done

I've set up Firebase App Check in your code:

1. ✅ Updated `firebase.js` with App Check initialization
2. ✅ Added App Check SDK to `web/index.html`
3. ✅ Your `AuthContext.js` is ready (no changes needed - App Check works automatically)
4. ✅ Created comprehensive setup guide in `FIREBASE_APP_CHECK_SETUP.md`

## 🚀 Next Steps (3 Easy Steps)

### Step 1: Get Your reCAPTCHA v3 Site Key

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select project: **reactnativevideobereal**
3. Click **App Check** in left sidebar
4. Click **Apps** tab
5. Register your web app with **reCAPTCHA v3**
6. Copy the **Site Key** (starts with `6L...`)

### Step 2: Add Your Site Key to Code

Open `firebase.js` and replace this line:
```javascript
const RECAPTCHA_V3_SITE_KEY = '6LdYOUR-SITE-KEY-HERE'; // Line 6
```

With your actual site key:
```javascript
const RECAPTCHA_V3_SITE_KEY = '6LcABCDEFGHIJK-your-actual-site-key-here';
```

### Step 3: Register iOS and Android Apps

1. In Firebase Console → App Check → Apps
2. Register **iOS app** (bundle: `com.myname.myapp`) with **App Attest**
3. Register **Android app** (package: `com.anonymous.MyApp`) with **Play Integrity**

## 🧪 Testing

### Test on Web (Easiest)
```bash
npm run web
```
- Should work immediately after adding site key
- Check console for: `✅ Firebase App Check activated for web (reCAPTCHA v3)`

### Test on iOS/Android
```bash
npm run ios    # or
npm run android
```

**Important for Development:**
- You'll see a debug token in console
- Add it to Firebase Console → App Check → Apps → [Your App] → Debug tokens
- See full details in `FIREBASE_APP_CHECK_SETUP.md`

## 📱 How It Works

### iOS (Invisible ✨)
- Uses **Apple DeviceCheck** or **App Attest**
- No user interaction needed
- Works automatically on real devices

### Android (Invisible ✨)
- Uses **Google Play Integrity API**
- No user interaction needed
- Works automatically on real devices with Play Services

### Web (Mostly Invisible)
- Uses **reCAPTCHA v3**
- Shows small badge in corner
- No challenges unless suspicious activity detected

## 🔒 What Changes for Users?

**Mobile (iOS/Android):** Nothing! It's completely invisible.

**Web:** They might see a small reCAPTCHA badge in the corner (can be hidden with CSS if needed).

## ⚠️ Important Notes

1. **Start with "Unenforced" mode** in Firebase Console
   - Firebase Console → App Check → APIs → Identity Toolkit → Unenforced
   - This logs App Check status without blocking requests
   - Switch to "Enforced" when ready for production

2. **Development builds required for iOS/Android**
   - App Check uses native modules
   - Can't use Expo Go - must use development build
   - Run: `npx expo prebuild` then `npx expo run:ios` or `npx expo run:android`

3. **Debug tokens for testing**
   - Required for simulators/emulators
   - See console logs for token
   - Add to Firebase Console as explained in setup guide

## 🐛 Troubleshooting

### "App Check not activated" warning
→ Add your reCAPTCHA v3 site key to `firebase.js` (Step 2 above)

### "App Check token is invalid"
→ Add debug token to Firebase Console (for dev devices)

### Works on web but not mobile
→ Make sure you're using a development build, not Expo Go

## 📚 Full Documentation

See `FIREBASE_APP_CHECK_SETUP.md` for complete details including:
- Step-by-step Firebase Console setup
- Debug token instructions
- Production deployment checklist
- Troubleshooting guide

## 🎉 Benefits

✅ **Bot Protection**: Prevents automated attacks  
✅ **Invisible on Mobile**: Zero user friction on iOS/Android  
✅ **Better than reCAPTCHA v2**: Less intrusive on web  
✅ **Free**: Included with Firebase  
✅ **Easy Setup**: Already integrated in your code!

