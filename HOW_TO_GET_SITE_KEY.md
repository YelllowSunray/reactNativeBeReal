# 🔑 How to Get Your reCAPTCHA v3 Site Key

## ❓ What Keys Do You Need?

### ✅ YOU NEED: Site Key (Public)
- This goes in your code (`firebase.js` and `web/index.html`)
- It's safe to put in client-side code
- Starts with `6L...`

### ❌ YOU DON'T NEED: Secret Key
- Firebase handles this on their servers
- You never put this in your code
- Only needed if implementing reCAPTCHA yourself (we're not)

---

## 📍 Where to Find the Site Key

### Option 1: Firebase Console (Recommended)

1. **Go to Firebase Console**
   - URL: https://console.firebase.google.com/
   - Select project: `reactnativevideobereal`

2. **Navigate to App Check**
   - Click **"App Check"** in the left sidebar
   - Click **"Apps"** tab at the top

3. **Register Your Web App** (if not already done)
   - Find your web app in the list
   - If not registered, click the app
   - Click **"Register"** next to **reCAPTCHA**
   - Choose **"reCAPTCHA v3"** (not v2)
   - Click **"Save"**

4. **Get the Site Key**
   - After registering, you'll see the site key displayed
   - Copy it (starts with `6L...`)
   - That's it! This is what you need.

### Option 2: Google Cloud Console (Alternative)

If you can't find it in Firebase Console:

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/security/recaptcha
   - Make sure you're in the correct project

2. **Find Your reCAPTCHA Key**
   - You should see a list of reCAPTCHA keys
   - Look for the one with type **"v3"** or **"Score-based"**
   - The **Site Key** column shows your key

3. **If No v3 Key Exists, Create One**
   - Click **"Create Key"**
   - Choose **reCAPTCHA v3**
   - Add your domain (e.g., `localhost` for testing, your actual domain for production)
   - Click **"Submit"**
   - Copy the **Site Key**

---

## 🔄 About Token Expiration (Don't Worry!)

### The "1 Day" Token You're Seeing

You might see that App Check tokens expire after 1 day - **this is normal and handled automatically**:

✅ **Auto-Refresh**: Firebase automatically refreshes tokens before they expire
✅ **Transparent**: Your users never notice this happening
✅ **Background**: Happens in the background while app is running
✅ **No Action Needed**: You don't need to do anything

### How It Works

```
User opens app → Firebase issues App Check token (valid 1 day)
                ↓
After ~12 hours → Firebase auto-refreshes token (new 1 day validity)
                ↓
Repeat → Token always valid as long as app is running
```

The 1-day expiration is actually a **security feature**:
- Short-lived tokens are more secure
- If a token is somehow compromised, it expires quickly
- Fresh tokens are issued automatically

---

## 📝 Step-by-Step: What to Do Now

### Step 1: Get Your Site Key

Choose the easiest method:

**Method A: Via Firebase Console**
```
Firebase Console → App Check → Apps → [Your Web App] → Register with reCAPTCHA v3 → Copy Site Key
```

**Method B: Via Google Cloud Console**
```
cloud.google.com/security/recaptcha → Find v3 key → Copy Site Key
```

### Step 2: Add Site Key to Your Code

**File 1: `firebase.js` (line 6)**
```javascript
// Replace this line:
const RECAPTCHA_V3_SITE_KEY = '6LdYOUR-SITE-KEY-HERE';

// With your actual site key:
const RECAPTCHA_V3_SITE_KEY = '6LcAbCdEfGhIjKlMnOpQrStUvWxYz-1234567890';  // Example
```

**File 2: `web/index.html` (line 49)**
```javascript
// Replace this line:
const RECAPTCHA_V3_SITE_KEY = '6LdYOUR-SITE-KEY-HERE';

// With your actual site key (same as above):
const RECAPTCHA_V3_SITE_KEY = '6LcAbCdEfGhIjKlMnOpQrStUvWxYz-1234567890';  // Example
```

### Step 3: Test It

```bash
npm run web
```

Check browser console for:
```
✅ Firebase initialized for web
🛡️ Firebase App Check activated for web (reCAPTCHA v3 - invisible)
```

---

## 🆘 Still Can't Find It?

### Quick Troubleshooting

**Problem: "I don't see App Check in Firebase Console"**
- Solution: Make sure you're using the correct Firebase project
- The project ID should be: `reactnativevideobereal`

**Problem: "I see reCAPTCHA v2, not v3"**
- Solution: Create a NEW reCAPTCHA registration and choose v3
- v2 = visible checkbox (old way)
- v3 = invisible score-based (what we want)

**Problem: "I see a Secret Key but no Site Key"**
- Solution: The Site Key should be displayed above or next to the Secret Key
- If you see a table, look for the "Site Key" column
- Site keys start with `6L...`, Secret keys start with `6L...` too but are different

**Problem: "Do I need to whitelist domains?"**
- For testing: Add `localhost` and `127.0.0.1`
- For production: Add your actual domain
- Firebase might add these automatically

---

## 🎯 Summary

### What You Need:
- ✅ **Site Key** (public) - starts with `6L...`
- ❌ **Secret Key** - NOT needed (Firebase handles it)

### Where to Get It:
1. Firebase Console → App Check → Apps → Register with reCAPTCHA v3
2. OR Google Cloud Console → Security → reCAPTCHA

### About Token Expiration:
- 1-day tokens are normal
- Auto-refresh happens automatically
- Nothing to worry about!

### What to Do:
1. Get site key from Firebase/Google Cloud Console
2. Add to `firebase.js` (line 6)
3. Add to `web/index.html` (line 49)
4. Test with `npm run web`

---

## 🔗 Direct Links

- **Firebase Console**: https://console.firebase.google.com/project/reactnativevideobereal/appcheck
- **Google Cloud reCAPTCHA**: https://console.cloud.google.com/security/recaptcha
- **Firebase Auth Settings**: https://console.firebase.google.com/project/reactnativevideobereal/authentication/settings

Try the Firebase Console link first - it should take you directly to App Check for your project!

