# Fix: auth/invalid-app-credential Error

## Problem
After upgrading to Firebase Blaze plan, you're getting:
```
Firebase: Error (auth/invalid-app-credential)
```

This means Firebase is rejecting your reCAPTCHA token because `localhost:8081` is not authorized.

## Solution: Add localhost to Firebase Authorized Domains

### Step 1: Go to Firebase Console
1. Open https://console.firebase.google.com/
2. Select your project: `reactnativevideobereal`

### Step 2: Configure Phone Authentication
1. In the left sidebar, click **Authentication**
2. Click the **Sign-in method** tab
3. Find **Phone** in the sign-in providers list
4. Click **Phone** to open its settings

### Step 3: Add Authorized Domains
Scroll down to find a section called **Authorized domains** or **Test phone numbers** section.

You need to ensure `localhost` is in your authorized domains list. Firebase usually includes it by default, but verify:

1. Look for a list of authorized domains
2. Make sure `localhost` is there
3. If not, add it:
   - Click **Add domain**
   - Enter `localhost`
   - Click **Add**

### Step 4: Check Phone Authentication is Enabled
1. Make sure the **Phone** provider toggle is **ON** (enabled)
2. Click **Save** if you made any changes

### Step 5: Alternative - Use Test Phone Numbers (Optional)
If you want to test without real SMS during development:

1. Scroll to **Phone numbers for testing**
2. Click **Add phone number**
3. Enter your phone number: `+31687343078`
4. Enter a test code: `123456` (any 6 digits you'll remember)
5. Click **Add**

Now you can use this phone number with the test code instead of receiving real SMS!

### Step 6: Clear Browser Cache & Retry
1. In your browser (where localhost:8081 is running):
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Clear "Cached images and files"
   - Clear "Cookies and other site data"
2. Refresh the page (`Ctrl+R` or `Cmd+R`)
3. Try sending the SMS again

---

## If it still doesn't work...

The error could also be because of reCAPTCHA v2 configuration. Let's check:

### Verify reCAPTCHA v2 Key in Firebase Console
1. Go to **Project Settings** (gear icon in left sidebar)
2. Scroll down to **Your apps** section
3. Select your **Web app** (the one with your web app configuration)
4. Look for **App Check** or **reCAPTCHA** settings
5. Make sure the reCAPTCHA v2 site key is properly configured

### Get a new reCAPTCHA v2 site key (if needed)
1. Go to https://www.google.com/recaptcha/admin
2. Click **+** to create a new site
3. Settings:
   - **Label**: "Firebase Phone Auth - localhost"
   - **reCAPTCHA type**: Select **reCAPTCHA v2** → **"I'm not a robot" Checkbox**
   - **Domains**: Add `localhost` and your actual domain
4. Click **Submit**
5. Copy the **Site Key** and **Secret Key**
6. In Firebase Console → **Authentication** → **Sign-in method** → **Phone**:
   - Find the reCAPTCHA settings
   - Enter the new Site Key

---

## Quick Test
After making these changes, you should see:
```
✅ Invisible reCAPTCHA widget rendered! Widget ID: 0
✅ reCAPTCHA verified automatically!
📞 Sending SMS to: +31687343078
✅ Verification code sent successfully!
```

Then you should receive an SMS with a 6-digit code! 📱




