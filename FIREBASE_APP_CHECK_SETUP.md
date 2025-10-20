# Firebase App Check Setup Guide

Firebase App Check provides bot protection for your app across iOS, Android, and Web.

## How It Works
- **iOS**: Uses Apple DeviceCheck (invisible to users)
- **Android**: Uses Google Play Integrity API (invisible to users)
- **Web**: Uses reCAPTCHA Enterprise or v3 (mostly invisible)

---

## Step 1: Enable App Check in Firebase Console

### 1.1 Go to Firebase Console
1. Open https://console.firebase.google.com/
2. Select your project: **reactnativevideobereal**
3. Click **App Check** in the left sidebar

### 1.2 Register Your Apps

#### For Web App
1. Click **Apps** tab in App Check
2. Find your web app (or register it if not there)
3. Click **Register** next to reCAPTCHA
4. Choose **reCAPTCHA v3** (recommended - mostly invisible)
5. Get your **reCAPTCHA v3 Site Key** and **Secret Key**
6. Save the **Site Key** - you'll need it in the code

#### For iOS App
1. Click **Apps** tab in App Check
2. Find your iOS app (bundle ID: `com.myname.myapp`)
3. Click **Register** next to App Attest
4. For **debug/development**, you'll need to add a debug token (explained later)
5. No additional keys needed - uses Apple DeviceCheck automatically

#### For Android App
1. Click **Apps** tab in App Check
2. Find your Android app (package: `com.anonymous.MyApp`)
3. Click **Register** next to Play Integrity
4. No additional keys needed - uses Google Play Integrity API
5. For **debug/development**, you'll need to add a debug token (explained later)

### 1.3 Enforce App Check for Phone Authentication
1. Still in App Check console
2. Click **APIs** tab
3. Find **Identity Toolkit** (this is Firebase Auth)
4. Click the **⋮** menu → **Enforce**
5. ⚠️ **Important**: Start with **Unenforced** mode during testing, then switch to **Enforced** when ready

---

## Step 2: Get Your reCAPTCHA v3 Site Key

After registering your web app with reCAPTCHA v3:
1. Go to: https://console.cloud.google.com/security/recaptcha
2. Select your Firebase project
3. Find your site key for the registered domain
4. Copy the **Site Key** (starts with `6L...`)

**Your reCAPTCHA Site Key**: `___________________________`
*(Fill this in after getting it from console)*

---

## Step 3: Install Required Packages

Run this command in your terminal:

```bash
npm install @react-native-firebase/app @react-native-firebase/app-check
```

For Expo projects, you may need to use a development build:
```bash
npx expo install @react-native-firebase/app @react-native-firebase/app-check
```

---

## Step 4: Configure App Check in Code

See the updated `firebase.js` file - it will initialize App Check automatically for all platforms.

---

## Step 5: Testing & Debug Tokens

### Development Mode (Recommended for Testing)

During development, you'll need **debug tokens** to bypass real device attestation:

#### iOS Debug Token
1. Run your app on iOS Simulator or device
2. Check the console/logs for a message like:
   ```
   [Firebase/AppCheck][I-FAA001001] App Check debug token: ABCD1234-5678-90AB-CDEF-1234567890AB
   ```
3. Copy this token
4. In Firebase Console → App Check → Apps → iOS App
5. Click "⋮" menu → **Manage debug tokens**
6. Add the copied token
7. Give it a name like "iOS Simulator"

#### Android Debug Token
1. Run your app on Android Emulator or device
2. Check the console/logs for a debug token
3. Copy this token
4. In Firebase Console → App Check → Apps → Android App
5. Click "⋮" menu → **Manage debug tokens**
6. Add the copied token
7. Give it a name like "Android Emulator"

#### Web Debug Token
Web should work automatically with reCAPTCHA v3 - no debug token needed.

---

## Step 6: Testing

### Test Phone Authentication
1. Run your app: `npm start` (or `expo start`)
2. Try to send a verification code
3. Check console logs for App Check status
4. If you see errors, check debug tokens are added correctly

### Expected Behavior
- **iOS/Android**: Should work invisibly (no user interaction)
- **Web**: Should show minimal reCAPTCHA badge in corner (or invisible)
- **All platforms**: Phone auth should work as before

---

## Step 7: Production Deployment

### Before Going Live:
1. ✅ Test on real iOS device (not just simulator)
2. ✅ Test on real Android device (not just emulator)
3. ✅ Test on web in incognito/private mode
4. ✅ Remove any debug tokens (or keep for specific test devices)
5. ✅ In Firebase Console → App Check → APIs → Identity Toolkit
   - Change from **Unenforced** to **Enforced**

### iOS Production
- App Attest works automatically on real devices with iOS 14+
- For iOS 11-13, falls back to DeviceCheck

### Android Production
- Play Integrity API works automatically on devices with Google Play Services
- App must be published to Google Play (internal/closed testing is fine)

### Web Production
- reCAPTCHA v3 works automatically
- Make sure your domain is whitelisted in reCAPTCHA settings

---

## Troubleshooting

### "App Check token is invalid"
- Check that debug tokens are added in Firebase Console
- Make sure App Check is initialized before making auth calls
- Verify bundle ID (iOS) and package name (Android) match exactly

### iOS: "App Attest is not available"
- You're on iOS Simulator - add debug token
- OR device is iOS 13 or older - should fall back to DeviceCheck

### Android: "Play Integrity API not available"
- You're on emulator - add debug token
- OR device doesn't have Google Play Services

### Web: reCAPTCHA not loading
- Check console for errors
- Verify site key is correct
- Check domain is whitelisted in reCAPTCHA settings

---

## Important Notes

1. **Expo Development Builds Required**: If using Expo Go, you'll need to create a development build for native modules to work. Run:
   ```bash
   npx expo prebuild
   npx expo run:ios
   npx expo run:android
   ```

2. **Bundle IDs Must Match**: 
   - iOS: `com.myname.myapp`
   - Android: `com.anonymous.MyApp`
   - These must match in Firebase Console

3. **Start Unenforced**: Always test with App Check in "Unenforced" mode first, then enforce when ready

4. **reCAPTCHA v3 vs Enterprise**:
   - v3: Free, good for most apps
   - Enterprise: Paid, more advanced features

---

## Next Steps

After setup is complete, App Check will:
- ✅ Protect your phone auth from bots
- ✅ Work invisibly on iOS and Android
- ✅ Show minimal UI on web
- ✅ Provide better security than reCAPTCHA v2 alone

