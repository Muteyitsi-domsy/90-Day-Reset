# Google Play Store Submission Guide

**90-Day Identity Reset App**
**Target Platform:** Android (Google Play Store)
**App Type:** React/Vite Web App → Android (via Capacitor)
**Date:** January 16, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Converting Web App to Android](#converting-web-app-to-android)
3. [Pre-Submission Requirements](#pre-submission-requirements)
4. [Play Store Assets](#play-store-assets)
5. [Technical Requirements](#technical-requirements)
6. [Legal & Policy Compliance](#legal--policy-compliance)
7. [Testing & Quality](#testing--quality)
8. [Monetization Setup](#monetization-setup)
9. [Submission Checklist](#submission-checklist)
10. [Post-Submission](#post-submission)

---

## Overview

Your app is currently a **web application** built with React and Vite. To submit to the Google Play Store, you need to:

1. **Convert to Android app** (using Capacitor - recommended)
2. **Meet Play Store requirements** (policies, content rating, privacy)
3. **Prepare marketing assets** (screenshots, descriptions, icons)
4. **Set up monetization** (if you plan to charge)
5. **Test thoroughly** on real Android devices
6. **Submit for review** (can take 1-7 days)

**Estimated Time:** 2-4 weeks (depending on experience)

---

## Converting Web App to Android

### Option 1: Capacitor (RECOMMENDED)

**Why Capacitor:**
✅ Officially maintained by Ionic team
✅ Modern, well-documented
✅ Works perfectly with Vite
✅ Easy plugin system
✅ Native feature access (camera, notifications, etc.)
✅ PWA support
✅ Active community

#### Step 1: Install Capacitor

```bash
# Install Capacitor CLI and core
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init
```

**Configuration prompts:**
- App name: `90-Day Identity Reset`
- App ID: `com.yourcompany.ninetyDayReset` (must be unique, reverse domain notation)
- Web asset directory: `dist` (Vite's build output)

#### Step 2: Add Android Platform

```bash
# Install Android platform
npm install @capacitor/android

# Add Android project
npx cap add android
```

This creates an `android/` folder with native Android project.

#### Step 3: Install Essential Plugins

```bash
# Status bar styling
npm install @capacitor/status-bar

# Splash screen
npm install @capacitor/splash-screen

# Network status
npm install @capacitor/network

# Push notifications (optional, for future)
npm install @capacitor/push-notifications

# App updates (optional)
npm install @capacitor/app-update
```

#### Step 4: Configure Capacitor

Create `capacitor.config.ts` (or update if exists):

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.ninetyDayReset',
  appName: '90-Day Identity Reset',
  webDir: 'dist',

  server: {
    // Allow loading from localhost during development
    androidScheme: 'https',
    cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#588157", // Your app's primary color
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark', // or 'light'
      backgroundColor: "#588157",
    },
  },
};

export default config;
```

#### Step 5: Update package.json Scripts

Add these scripts:

```json
{
  "scripts": {
    "build": "vite build",
    "build:android": "vite build && npx cap sync android",
    "open:android": "npx cap open android"
  }
}
```

#### Step 6: Build and Sync

```bash
# Build web app
npm run build

# Sync to Android project
npx cap sync android

# Open Android Studio
npx cap open android
```

#### Step 7: Configure Android Project

In `android/app/src/main/AndroidManifest.xml`, add permissions:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Internet for Firebase, API calls -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Network state for offline detection -->
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Optional: Vibrate for notifications -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <!-- Main activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="@string/app_name"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:windowSoftInputMode="adjustResize">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

#### Step 8: Test in Android Studio

1. Open project in Android Studio: `npx cap open android`
2. Wait for Gradle sync to complete
3. Click "Run" (green play button)
4. Test on emulator or real device

---

### Option 2: Progressive Web App (PWA) with TWA

**Trusted Web Activities (TWA)** wrap your PWA in an Android app.

**Pros:**
- Simpler than full native app
- Smaller app size
- Easier updates (just update web version)

**Cons:**
- Requires PWA (you'd need to add service worker)
- Limited native features
- Requires your app to be HTTPS only

**Tools:**
- [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
- [PWABuilder](https://www.pwabuilder.com/)

**Not recommended** for your app because:
- You need offline functionality (easier with Capacitor)
- Firebase works better with native wrapper
- More control with Capacitor

---

## Pre-Submission Requirements

### 1. Google Play Console Account

**Cost:** $25 one-time registration fee

**Steps:**
1. Go to https://play.google.com/console/signup
2. Sign in with Google account
3. Accept Developer Distribution Agreement
4. Pay $25 registration fee
5. Complete account details (name, address, phone)

**Account Types:**
- **Individual** - Personal developer account
- **Organization** - Company/business account (requires D-U-N-S number)

**Recommendation:** Start with Individual unless you have a registered business.

---

### 2. App Signing

Google Play requires **app signing** for security.

#### Option A: Google Play App Signing (Recommended)

**What it does:**
- Google manages your app signing key
- You upload with upload key
- Google re-signs with app signing key

**How to set up:**
1. In Android Studio, go to: `Build → Generate Signed Bundle / APK`
2. Choose `Android App Bundle`
3. Create new keystore:
   - **Keystore path:** Choose secure location (e.g., `C:\keystores\90-day-reset.jks`)
   - **Password:** Strong password (SAVE THIS!)
   - **Alias:** `90-day-reset-key`
   - **Alias password:** Strong password (SAVE THIS!)
   - **Certificate info:**
     - First and Last Name: Your name
     - Organization: Your company name (or your name)
     - Country Code: Your country (e.g., US, KE, etc.)
4. Build signed bundle
5. When creating Play Console app, choose "Google Play App Signing"
6. Upload your app bundle

**IMPORTANT:**
- **NEVER lose your keystore** - store backups in multiple secure locations
- **NEVER share keystore password** - treat like a bank password
- Write down all passwords immediately

#### Backup Keystore

```bash
# Copy to secure locations
copy C:\keystores\90-day-reset.jks E:\Backups\
copy C:\keystores\90-day-reset.jks D:\Secure\

# Create password file (store separately!)
# keystore_passwords.txt:
Keystore Password: [your password]
Alias: 90-day-reset-key
Alias Password: [your alias password]
```

**Store password file:**
- Password manager (1Password, LastPass, Bitwarden)
- Encrypted USB drive
- Secure cloud storage (encrypted)

---

### 3. App Icon & Assets

#### App Icon Requirements

**Adaptive Icon (Required for Android 8+):**
- **Foreground:** 1024x1024 PNG (transparent background)
- **Background:** 1024x1024 PNG (solid color or pattern)

**Legacy Icon:**
- **xxxhdpi:** 192x192
- **xxhdpi:** 144x144
- **xhdpi:** 96x96
- **hdpi:** 72x72
- **mdpi:** 48x48

**Tools to generate:**
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
- [App Icon Generator](https://www.appicon.co/)

**Design tips:**
- Simple, recognizable at small sizes
- Avoid text (hard to read when small)
- Use your brand colors (#588157 green)
- Consider mental health theme (calming, peaceful)

#### Feature Graphic (Required)

**Size:** 1024x500 pixels
**Format:** PNG or JPEG
**Use:** Displayed in Play Store listing

**Content ideas:**
- App name + tagline: "90-Day Identity Reset - Transform Your Life"
- Mockup of app screens
- Inspirational imagery (sunrise, growth, transformation)

**Tools:**
- Canva (free templates)
- Figma
- Photoshop

---

## Play Store Assets

### Screenshots (Required)

**Minimum:** 2 screenshots per supported device type
**Recommended:** 4-8 screenshots

**Requirements:**
- **Phone:** 320-3840 pixels
- **Format:** PNG or JPEG
- **Aspect ratio:** 16:9 or 9:16 recommended
- **No transparency**

**What to show:**
1. **Onboarding screen** - Welcome message, value proposition
2. **Journal entry screen** - Daily journaling interface
3. **Mood tracker** - Mood selection and tracking
4. **AI insights** - Example of weekly/monthly summary
5. **Progress tracking** - Streak, milestones, journey progress
6. **Settings/security** - PIN lock, MFA options (to highlight security)

**Tools:**
- Android Studio Device Frame Generator
- [Mockuphone](https://mockuphone.com/)
- [Screely](https://www.screely.com/)

**Tips:**
- Use real content (not Lorem Ipsum)
- Show app in action, not empty states
- Highlight unique features (AI insights, crisis detection)
- Add captions/annotations to explain features

#### Screenshot Dimensions for Common Devices

- **Pixel 7:** 1080 x 2400
- **Pixel 7 Pro:** 1440 x 3120
- **Samsung Galaxy S23:** 1080 x 2340

**Easy way:** Run app on emulator, take screenshots, resize to required dimensions.

---

### Store Listing

#### App Title

**Max:** 30 characters
**Current:** "90-Day Identity Reset" (22 characters) ✅

**Tips:**
- Include main keyword (journaling, mental health, self-improvement)
- Clear and descriptive
- Avoid clickbait

**Alternative:**
- "90-Day Reset: Self-Care Journal"
- "Identity Reset - Daily Journal"

#### Short Description

**Max:** 80 characters
**Purpose:** Shown in search results

**Example:**
"Transform your life in 90 days with AI-powered journaling and mood tracking"
(77 characters)

#### Full Description

**Max:** 4000 characters
**Purpose:** Full app description

**Template:**

```
🌟 Transform Your Life in 90 Days 🌟

The 90-Day Identity Reset is your personal journaling companion for meaningful self-transformation. Combine daily reflections with AI-powered insights to understand yourself deeply and create lasting change.

✨ KEY FEATURES

📝 Daily Journaling
• Guided prompts for morning and evening reflections
• Free-form writing for complete self-expression
• Secure, encrypted storage (AES-256)

🧠 AI-Powered Insights
• Weekly and monthly summary reports
• Pattern recognition in your thoughts and emotions
• Personalized reflections based on your journey

😊 Mood Tracking
• Track your emotional state daily
• Monitor energy levels
• Visualize mood trends over time

📊 Progress Tracking
• 90-day structured journey
• Streak tracking to build consistency
• Milestone celebrations

🔐 Enterprise-Grade Security
• AES-256 encryption for all journal data
• Optional PIN lock (6-character alphanumeric)
• Optional Multi-Factor Authentication (MFA/2FA)
• Strong password requirements (12+ characters)
• Your data is private and secure

🆘 Crisis Support Resources
• Automatic detection of concerning language
• Immediate access to mental health resources
• National Suicide Prevention Lifeline: 988
• Crisis Text Line: HOME to 741741

🎨 Customization
• 4 beautiful themes (Default, Ocean, Sunset, Forest)
• Light and dark modes
• Personalize your journey

💡 WHY 90 DAYS?

Research shows it takes approximately 90 days to form lasting habits and create meaningful behavioral change. This app guides you through a structured 90-day journey of self-discovery and transformation.

🔒 PRIVACY & SECURITY

Your privacy is our top priority:
• All journal entries encrypted with AES-256
• No selling of your data - EVER
• GDPR and CCPA compliant
• You own your data - export or delete anytime
• Optional MFA for extra account protection

⚠️ IMPORTANT DISCLAIMER

This app is a journaling and self-reflection tool. It is NOT a substitute for professional mental health treatment, therapy, or medical advice. If you are experiencing a mental health crisis, please contact emergency services or call 988 (National Suicide Prevention Lifeline).

📱 OFFLINE SUPPORT

Journal entries work offline and sync when you're back online.

🎯 WHO IS THIS FOR?

• Anyone seeking personal growth and self-improvement
• People working on mental health and emotional wellness
• Those who want to build a daily journaling habit
• Individuals interested in AI-powered self-discovery
• Anyone ready for meaningful life transformation

📈 YOUR JOURNEY AWAITS

Start your 90-day transformation today. Download now and take the first step toward the person you want to become.

---

🔗 SUPPORT & PRIVACY

Privacy Policy: [Your URL]
Terms of Service: [Your URL]
Support Email: [Your Email]

Built with ❤️ for personal transformation
```

**Customize:**
- Add your actual support email
- Add privacy policy URL (you can host on your website or GitHub Pages)
- Adjust tone to match your brand

---

### App Category

**Primary Category:** Health & Fitness
**Alternative:** Lifestyle

**Tags/Keywords:**
- journaling
- mental health
- self-improvement
- mood tracker
- personal development
- daily journal
- mindfulness
- self-care
- wellness
- transformation

---

### Content Rating

**Required:** Complete Content Rating Questionnaire

**Your app will likely be rated:**
- **ESRB:** Teen (13+) or Everyone (10+)
- **PEGI:** PEGI 12 or PEGI 16
- **Reason:** Mental health content, crisis detection

**Questionnaire questions to prepare for:**
- Does your app contain violence? **No**
- Does it contain nudity or sexual content? **No**
- Does it contain profanity? **No**
- Does it contain controlled substances? **No**
- Does it allow user-generated content? **Yes** (journal entries)
- Does it contain references to mental health issues? **Yes**
- Does it contain crisis helpline information? **Yes**

**Age restriction recommendation:** 18+ (due to mental health content)

---

## Technical Requirements

### 1. Target API Level

**Requirement:** Must target Android API 33 (Android 13) or higher

**Configure in:** `android/app/build.gradle`

```gradle
android {
    compileSdkVersion 33

    defaultConfig {
        minSdkVersion 24  // Android 7.0 (supports 94% of devices)
        targetSdkVersion 33  // Android 13
        versionCode 1
        versionName "1.0.0"
    }
}
```

**Version Code Scheme:**
- First release: `versionCode 1`, `versionName "1.0.0"`
- Updates: Increment both (e.g., `versionCode 2`, `versionName "1.0.1"`)

---

### 2. APK/Bundle Size

**Limit:** 100 MB for Android App Bundle (AAB)
**Your app:** Likely 10-30 MB (should be fine)

**Check size:**
```bash
# After building
ls -lh android/app/build/outputs/bundle/release/
```

**If too large:**
- Use Android App Bundle (AAB) instead of APK
- Enable ProGuard/R8 minification
- Optimize images (compress PNG, use WebP)
- Remove unused dependencies

---

### 3. Permissions

**Review your permissions** in `AndroidManifest.xml`:

**Current permissions needed:**
- `INTERNET` - For Firebase, API calls ✅
- `ACCESS_NETWORK_STATE` - For offline detection ✅

**NOT needed (remove if added):**
- Camera, microphone, location (not used)
- Storage (Capacitor handles internally)

**Important:** Play Store reviewers scrutinize unnecessary permissions.

---

### 4. 64-bit Support

**Requirement:** Must include 64-bit native libraries (if using any)

**Your app:** Likely not using native code, but check:

In `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        ndk {
            abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
        }
    }
}
```

---

### 5. Privacy Policy URL

**Requirement:** MUST provide if app collects personal data

**Your app:** YES, you collect:
- Email addresses
- Journal entries (highly sensitive)
- Mood data
- Authentication data

**Where to host:**
- Your website
- GitHub Pages (free)
- Firebase Hosting (free)

**Example GitHub Pages setup:**
1. Create `docs/` folder in repo
2. Copy `PRIVACY_POLICY.md` to `docs/privacy.md`
3. Enable GitHub Pages in repo settings
4. URL: `https://yourusername.github.io/90-Day-Reset/privacy`

---

## Legal & Policy Compliance

### 1. Play Store Policies

**Review:** https://play.google.com/about/developer-content-policy/

**Key policies for your app:**

#### User Data Policy
✅ **Your compliance:**
- Privacy policy provided
- Data encryption implemented
- Transparent about data collection
- Users can export/delete data

❌ **Watch out for:**
- Don't access clipboard without user consent
- Don't collect data you don't disclose
- Don't share data without explicit consent

#### Health & Medical
✅ **Your compliance:**
- Clear disclaimer: NOT medical advice
- NOT claiming to diagnose/treat
- Crisis resources provided
- Age restriction (18+)

❌ **Watch out for:**
- Don't claim to cure depression
- Don't replace professional therapy
- Don't diagnose mental health conditions

#### User-Generated Content
✅ **Your compliance:**
- Content is private (not shared publicly)
- Users control their own content
- No moderation needed (private journals)

#### Deceptive Behavior
✅ **Your compliance:**
- App does what it says
- No misleading claims
- No fake reviews/ratings

---

### 2. Data Safety Section (REQUIRED)

**New requirement:** Must complete Data Safety form

**Questions you'll answer:**

**1. Does your app collect user data?**
- YES

**2. What data do you collect?**
- ☑ Email addresses
- ☑ Personal info (name)
- ☑ User-generated content (journal entries)
- ☑ App activity (mood tracking)

**3. How is data used?**
- ☑ App functionality
- ☑ Analytics (if using Firebase Analytics)
- ☐ Advertising (NO)
- ☐ Marketing (NO)

**4. Is data shared with third parties?**
- YES (Firebase/Google, Gemini API, Sentry)
- List each third party
- State purpose (cloud storage, AI analysis, error tracking)

**5. Is data encrypted?**
- ☑ In transit (TLS)
- ☑ At rest (AES-256)

**6. Can users request data deletion?**
- ☑ YES

**Tip:** Be completely honest. Violations result in app removal.

---

### 3. Age Restrictions

**Recommendation:** Set to **18+**

**Reasons:**
- Mental health content
- Crisis detection (mature topic)
- COPPA compliance (under 13 requires parental consent)
- Avoid liability issues

**How to set:**
- Content Rating Questionnaire → Will auto-set based on answers
- Can manually restrict in app settings

---

### 4. Country Distribution

**Default:** All countries

**Consider excluding:**
- Countries where mental health apps are restricted
- Countries with language barriers (if only English)
- Countries with legal/regulatory issues

**Your app works in:** Any country (Firebase/Vercel global)

**Recommendation:** Start with:
- United States
- Canada
- United Kingdom
- Australia
- Kenya (if that's your market)
- Other English-speaking countries

Can expand later based on demand.

---

## Testing & Quality

### 1. Pre-Launch Testing

**Android Test Track Options:**
1. **Internal Testing** - Max 100 testers, instant updates
2. **Closed Testing** - Limited testers, need to approve
3. **Open Testing** - Anyone can join, public listing

**Recommended flow:**
1. Internal Testing (friends, family) - 1 week
2. Closed Testing (beta users) - 2 weeks
3. Production release

**How to set up:**
1. In Play Console, go to "Testing" → "Internal testing"
2. Create release
3. Upload AAB file
4. Add tester email addresses
5. Share testing link with testers

---

### 2. Device Testing

**Test on:**
- ☑ Small phone (5-6 inch screen)
- ☑ Large phone (6.5+ inch screen)
- ☑ Tablet (optional but recommended)
- ☑ Different Android versions (Android 10, 11, 12, 13)

**Firebase Test Lab (FREE tier):**
- Automated testing on real devices
- Screenshots on different devices
- Crash detection

**How to use:**
```bash
# Upload AAB to Firebase Console
# Run tests on virtual and physical devices
# Get test report
```

---

### 3. Quality Checklist

**Before submitting:**

#### Functionality
- ☑ App opens without crashing
- ☑ All features work (journaling, mood tracking, AI insights)
- ☑ Offline mode works
- ☑ Firebase sync works
- ☑ Authentication works (signup, login, password reset)
- ☑ PIN lock works
- ☑ Data export works
- ☑ Account deletion works

#### UI/UX
- ☑ No UI glitches or overlaps
- ☑ Text is readable on all screen sizes
- ☑ Buttons are large enough to tap (48x48 dp minimum)
- ☑ Loading states shown for async operations
- ☑ Error messages are helpful

#### Performance
- ☑ App launches in < 3 seconds
- ☑ No ANR (Application Not Responding) errors
- ☑ Smooth scrolling
- ☑ No memory leaks

#### Security
- ☑ HTTPS only (no HTTP)
- ☑ Data encryption verified
- ☑ PIN lock tested
- ☑ MFA tested (if integrated)

#### Legal
- ☑ Privacy Policy accessible
- ☑ Terms of Service accessible
- ☑ Crisis resources work (links open correctly)
- ☑ Age restriction set
- ☑ Disclaimers shown

---

## Monetization Setup

### Pricing Models

**Option 1: Free with In-App Purchases**
- ✅ More downloads (free apps get 10x more installs)
- ✅ Try before buy (users test first)
- ✅ Flexible (offer premium features)
- ❌ Complex to implement
- ❌ Need to manage subscriptions

**Option 2: Paid App**
- ✅ Simple (one-time purchase)
- ✅ Predictable revenue
- ❌ Fewer downloads
- ❌ Harder to market (people reluctant to pay upfront)

**Option 3: Freemium (Free + Premium)**
- ✅ Best of both worlds
- ✅ Build user base with free tier
- ✅ Upsell to premium
- ❌ Most complex to implement

**Recommendation for 90-Day Reset:**
**Start with Free + Optional In-App Purchase for Premium Features**

---

### In-App Purchase Integration

**Google Play Billing Library Required**

#### Step 1: Add Billing Dependency

```bash
npm install @capacitor-community/in-app-purchases
npx cap sync
```

In `android/app/build.gradle`:

```gradle
dependencies {
    implementation 'com.android.billingclient:billing:5.1.0'
}
```

#### Step 2: Create Products in Play Console

**Product Types:**

**1. One-Time Purchase**
- Lifetime access
- Example: "Premium Unlock" - $9.99

**2. Subscription (Recurring)**
- Monthly: $4.99/month
- Yearly: $39.99/year (save 33%)

**Product ID examples:**
- `premium_lifetime` - One-time $9.99
- `premium_monthly` - Monthly $4.99
- `premium_yearly` - Yearly $39.99

#### Step 3: Define Premium Features

**Free Tier:**
✅ Daily journaling (unlimited)
✅ Mood tracking
✅ Basic progress tracking
✅ Crisis detection
✅ Data export
✅ 7-day AI insight trial

**Premium Features ($4.99/month or $39.99/year):**
✅ Unlimited AI insights (weekly & monthly summaries)
✅ Advanced mood analytics
✅ Custom themes (4 themes)
✅ PDF export with custom branding
✅ Priority email support
✅ Early access to new features
✅ No limit on journal entries (if you add limits)

**Premium Pro Features ($9.99/month - optional higher tier):**
✅ Everything in Premium
✅ 1-on-1 coaching calls (monthly)
✅ Personalized journal prompts from therapist
✅ Advanced crisis detection with professional referrals

#### Step 4: Implement Paywall

```typescript
// Example paywall component
import { InAppPurchases } from '@capacitor-community/in-app-purchases';

const showPremiumUpgrade = async () => {
  // Get products
  const products = await InAppPurchases.getProducts({
    productIds: ['premium_monthly', 'premium_yearly']
  });

  // Show upgrade modal
  // User selects monthly or yearly

  // Purchase
  const result = await InAppPurchases.purchase({
    productId: 'premium_yearly'
  });

  if (result.transactionId) {
    // Verify purchase on your backend
    // Grant premium access
  }
};
```

#### Step 5: Verify Purchases

**CRITICAL:** Always verify purchases on backend to prevent fraud.

**Options:**
1. Google Play Developer API
2. Firebase Cloud Functions
3. Third-party (RevenueCat, Adapty)

**RevenueCat (Recommended):**
- Handles purchase verification
- Manages subscriptions
- Cross-platform (iOS + Android)
- Free up to $10k monthly revenue

```bash
npm install @revenuecat/purchases-capacitor
```

---

### Tax & Legal

**Google takes 15%** on first $1M revenue, then 30%

**You need:**
- ☑ Tax information (W-9 if US, W-8BEN if international)
- ☑ Bank account for payouts
- ☑ Business registration (if not individual)

**Tax implications:**
- Report in-app purchase revenue as income
- May need to collect sales tax (depends on jurisdiction)
- Consult tax professional

---

## Submission Checklist

### Before Final Submission

#### Build & Technical
- [ ] Final build successful (no errors)
- [ ] Signed with release keystore
- [ ] Android App Bundle (AAB) generated
- [ ] Version code and name set correctly
- [ ] Permissions minimal and justified
- [ ] Target API 33+
- [ ] 64-bit support included
- [ ] ProGuard/R8 enabled for release

#### Testing
- [ ] Tested on 3+ real devices
- [ ] Tested on Android 10, 11, 12, 13
- [ ] All features working
- [ ] No crashes or ANRs
- [ ] Firebase Test Lab passed
- [ ] Beta testing completed

#### Assets
- [ ] App icon (1024x1024 + adaptive)
- [ ] Feature graphic (1024x500)
- [ ] 4-8 screenshots (phone)
- [ ] Screenshots (tablet - optional)
- [ ] Screenshots show real content
- [ ] Privacy Policy URL accessible
- [ ] Terms of Service URL accessible

#### Store Listing
- [ ] App title (≤30 chars)
- [ ] Short description (≤80 chars)
- [ ] Full description (compelling, ≤4000 chars)
- [ ] Category selected (Health & Fitness)
- [ ] Content rating completed
- [ ] Age restriction set (18+)
- [ ] Privacy Policy link working
- [ ] Support email set
- [ ] Website URL (optional)

#### Legal & Compliance
- [ ] Privacy Policy updated with Android-specific info
- [ ] Terms of Service reviewed
- [ ] Data Safety section completed
- [ ] All permissions justified
- [ ] Third-party libraries disclosed
- [ ] Contact email valid
- [ ] Disclaimers clear (NOT medical advice)

#### Monetization (if applicable)
- [ ] In-app products created
- [ ] Pricing set
- [ ] Tax info submitted
- [ ] Bank account added

#### Play Console Setup
- [ ] Developer account created ($25 paid)
- [ ] App created in console
- [ ] Release track selected (production/beta)
- [ ] Countries selected for distribution

---

## Submission Process

### Step-by-Step

**1. Create App in Play Console**
- Go to: https://play.google.com/console
- Click "Create app"
- Fill in app details:
  - Name: 90-Day Identity Reset
  - Language: English (United States)
  - App or game: App
  - Free or paid: Free (or Paid)
  - Declarations:
    - ☑ Comply with Play policies
    - ☑ Comply with US export laws
    - ☑ App is/isn't primarily for children (select NO)

**2. Complete Dashboard Tasks**

Play Console shows a dashboard with required tasks:

- ☑ App access (specify if login required)
- ☑ Ads (do you show ads? NO for now)
- ☑ Content rating
- ☑ Target audience & content
- ☑ News apps (NO)
- ☑ COVID-19 contact tracing (NO)
- ☑ Data safety
- ☑ App category
- ☑ Store listing
- ☑ Store settings

**3. Upload App Bundle**

- Go to "Release" → "Production" (or "Testing" for beta)
- Click "Create new release"
- Upload AAB file
- Add release notes:

```
What's New in v1.0.0

🎉 Initial release!

✨ Features:
• Daily journaling with AI-powered insights
• Mood tracking and analytics
• 90-day structured transformation journey
• Enterprise-grade security (AES-256 encryption)
• Optional PIN lock and MFA
• Crisis detection with mental health resources
• Beautiful themes and customization

📱 Start your 90-day transformation today!
```

**4. Review & Publish**

- Review all sections (must be 100% complete)
- Click "Review release"
- Fix any errors (red X marks)
- Click "Start rollout to production"

**5. Wait for Review**

- **Timeline:** 1-7 days (usually 2-3 days)
- **Email notification** when review complete
- **Possible outcomes:**
  - ✅ Approved - App published!
  - ❌ Rejected - Fix issues and resubmit

---

## Post-Submission

### If Approved ✅

**1. Monitor Analytics**
- Installs, uninstalls
- Crash reports
- User reviews

**2. Respond to Reviews**
- Reply to user reviews (shows you care)
- Address bugs reported in reviews
- Thank positive reviewers

**3. Marketing**
- Share Play Store link
- Social media announcement
- Blog post/press release
- Email newsletter (if you have list)

**4. Updates**
- Fix bugs promptly
- Add new features
- Regular updates (monthly or quarterly)

---

### If Rejected ❌

**Common rejection reasons:**

**1. Policy Violation**
- Review which policy violated
- Fix issue
- Resubmit with explanation

**2. Privacy Policy Issues**
- Ensure policy accessible
- Ensure policy covers all data collection
- Update and resubmit

**3. Content Rating Issues**
- Re-complete content rating questionnaire
- May need to restrict age

**4. Technical Issues**
- Crashes on test devices
- Fix bugs, retest, resubmit

**5. Misleading Content**
- Update store listing to be accurate
- Remove exaggerated claims
- Ensure screenshots match actual app

**How to appeal:**
- Reply to rejection email
- Explain fixes made
- Be polite and professional
- Resubmit after fixing

---

## Timeline Estimate

**Assuming you start today:**

| Week | Tasks | Time |
|------|-------|------|
| **Week 1** | Convert to Android (Capacitor setup), test locally | 8-12 hours |
| **Week 2** | Create assets (icon, screenshots, descriptions), Play Console setup | 10-15 hours |
| **Week 3** | Beta testing, bug fixes, prepare final build | 8-10 hours |
| **Week 4** | Final submission, wait for review, publish | 2-4 hours + wait time |

**Total time:** 2-4 weeks (28-41 hours of work)

**Factors that speed up:**
- Existing experience with Android/Capacitor
- Simple monetization (start free, add later)
- Pre-made assets

**Factors that slow down:**
- First time with Android development
- Complex in-app purchases
- Need to create all assets from scratch
- Extensive beta testing needed

---

## Resources

### Official Documentation
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)

### Tools
- [Android Studio](https://developer.android.com/studio) - Required
- [App Icon Generator](https://www.appicon.co/)
- [Screenshot Templates](https://www.mockuphone.com/)
- [RevenueCat](https://www.revenuecat.com/) - In-app purchases

### Community
- [Capacitor Community](https://github.com/capacitor-community)
- [Stack Overflow - Android](https://stackoverflow.com/questions/tagged/android)
- [Reddit - r/androiddev](https://www.reddit.com/r/androiddev/)

---

## Quick Start Command Summary

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init

# 2. Add Android
npm install @capacitor/android
npx cap add android

# 3. Install plugins
npm install @capacitor/status-bar @capacitor/splash-screen @capacitor/network

# 4. Build and sync
npm run build
npx cap sync android

# 5. Open in Android Studio
npx cap open android

# 6. Build signed bundle in Android Studio
# Build → Generate Signed Bundle / APK → Android App Bundle

# 7. Upload to Play Console
# https://play.google.com/console
```

---

## Final Tips

✅ **Start with free app** - Add monetization later
✅ **Use Capacitor** - Easier than going full native
✅ **Test thoroughly** - Rejections delay launch
✅ **Beta test first** - Catch bugs before public release
✅ **Clear disclaimers** - NOT medical advice (avoid liability)
✅ **Great screenshots** - First impression matters
✅ **Respond to reviews** - Shows you care about users
✅ **Regular updates** - Keeps users engaged

❌ **Don't rush** - Take time to do it right
❌ **Don't ignore policies** - Read them carefully
❌ **Don't lose keystore** - You'll be locked out of updates
❌ **Don't claim medical benefits** - Legal liability
❌ **Don't collect unnecessary data** - Privacy violation
❌ **Don't fake reviews** - Instant rejection

---

**Good luck with your Play Store submission! 🚀**

If you have questions during the process, refer back to this guide or consult the official Play Console help.
