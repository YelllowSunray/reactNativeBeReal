# 📱 Real SMS Authentication Setup

## ✅ What's Been Implemented

Your app now supports **real SMS authentication** on both web and mobile platforms using Firebase Phone Authentication!

### Key Features:
- **Real SMS codes** sent to actual phone numbers
- **reCAPTCHA verification** on web to prevent abuse
- **Cross-platform support** (web and React Native)
- **International phone numbers** with country code selection

## 🌐 How Web SMS Works

### On Web:
1. User enters their phone number with country code
2. User solves a **visible reCAPTCHA** challenge (the "I'm not a robot" box)
3. Firebase sends a real SMS code to the phone number
4. User enters the 6-digit code from SMS
5. User is logged in!

### reCAPTCHA Details:
- **Size:** Normal (visible checkbox)
- **Location:** Displayed below the phone number input
- **Purpose:** Verifies the request is from a real human, not a bot
- **Required:** Yes, Google/Firebase requires this for web SMS

## 📱 How Mobile SMS Works

### On React Native (Android/iOS):
1. User enters their phone number with country code
2. Firebase automatically sends SMS (no reCAPTCHA needed on mobile!)
3. User enters the 6-digit code from SMS
4. User is logged in!

## 🧪 Testing Instructions

### For Web (localhost):

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Open in browser:**
   - Navigate to `http://localhost:8081` (or your Expo web URL)

3. **Login flow:**
   - Select your country (default: Netherlands +31)
   - Enter your phone number (e.g., `612345678`)
   - Complete the reCAPTCHA verification
   - Click "Send Verification Code"
   - Check your phone for the SMS
   - Enter the 6-digit code
   - You're logged in! 🎉

### For Mobile:

1. **Build and run:**
   ```bash
   # For Android
   npm run android

   # For iOS
   npm run ios
   ```

2. **Login flow:**
   - Select your country
   - Enter your phone number
   - Click "Send Verification Code" (no reCAPTCHA needed!)
   - Check your phone for the SMS
   - Enter the 6-digit code
   - You're logged in! 🎉

## 🔧 Firebase Configuration

### Required Firebase Setup:

1. **Enable Phone Authentication:**
   - Firebase Console → Authentication → Sign-in method
   - Enable "Phone" provider

2. **Authorized Domains (for web):**
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add your domains:
     - `localhost` (for development)
     - Your production domain (when deployed)

3. **reCAPTCHA Configuration:**
   - Automatically handled by Firebase for web
   - No additional setup needed

## 🌍 Supported Countries

Currently configured for:
- 🇳🇱 Netherlands (+31)
- 🇺🇸 United States (+1)
- 🇬🇧 United Kingdom (+44)
- 🇩🇪 Germany (+49)
- 🇫🇷 France (+33)
- 🇮🇹 Italy (+39)
- 🇪🇸 Spain (+34)
- 🇧🇪 Belgium (+32)
- 🇨🇭 Switzerland (+41)
- 🇦🇹 Austria (+43)

## 🐛 Troubleshooting

### "reCAPTCHA not initialized"
- **Wait a few seconds** - reCAPTCHA takes time to load
- **Refresh the page** if it doesn't appear

### "Invalid phone number"
- Ensure you're using the correct format
- Don't include the country code in the number field (it's added automatically)
- Example: For +31612345678, enter country code `+31` and number `612345678`

### "SMS not received"
- Check your phone signal
- Verify the phone number is correct
- Check spam/blocked messages
- Firebase has daily limits - if testing frequently, you may hit limits

### "auth/too-many-requests"
- Firebase rate limiting triggered
- Wait 15-30 minutes before trying again
- Consider using Firebase test phone numbers for development (see below)

## 🧪 Optional: Firebase Test Phone Numbers (For Development)

If you want to test without using real SMS:

1. **Add test numbers in Firebase:**
   - Firebase Console → Authentication → Sign-in method → Phone
   - Scroll down to "Phone numbers for testing"
   - Add a test number (e.g., `+31687343078`) and code (e.g., `123456`)

2. **Use in app:**
   - Enter the test phone number
   - Skip reCAPTCHA (test numbers bypass it)
   - Enter the test code you configured
   - You're logged in!

## 📝 Next Steps

- **Deploy to production:** Update authorized domains in Firebase
- **Customize reCAPTCHA:** Adjust size/theme in `screens/LoginScreen.js`
- **Add more countries:** Edit country list in `screens/LoginScreen.js`
- **Configure Firestore rules:** Secure your database (see `FIREBASE_SETUP.md`)

## 💡 Important Notes

- **Web requires reCAPTCHA** - This is a Firebase/Google requirement for security
- **Mobile doesn't need reCAPTCHA** - Native apps have built-in verification
- **Rate limits apply** - Be mindful of Firebase's SMS quotas
- **Costs** - Firebase charges for SMS beyond the free tier (check Firebase pricing)

---

🎉 **You're all set!** Try logging in with your real phone number and receive an actual SMS code!

