# Subscription Setup Guide

This guide walks you through setting up subscriptions for the Renew90 app using RevenueCat and Google Play Billing.

## Overview

- **Payment Provider**: RevenueCat (wraps Google Play Billing)
- **Platforms**: Android (Play Store)
- **Subscription Tiers**:
  - Monthly: ~$6.99/month
  - Yearly: ~$49.99/year (save ~40%)
- **Trial Period**: 14 days free
- **Beta Codes**: 90 days free access

---

## Step 1: Google Play Console Setup

### 1.1 Create Developer Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay the one-time $25 registration fee
3. Complete account verification

### 1.2 Create Your App
1. Click "Create app"
2. Fill in details:
   - App name: **Renew90**
   - Default language: English
   - App or game: App
   - Free or paid: Free (we use in-app subscriptions)

### 1.3 Set Up Subscriptions
1. Go to **Monetize** → **Products** → **Subscriptions**
2. Create subscription products:

**Monthly Subscription:**
- Product ID: `renew90_monthly`
- Name: Renew90 Monthly
- Description: Full access to all features
- Price: $6.99 USD
- Billing period: 1 month
- Free trial: 14 days

**Yearly Subscription:**
- Product ID: `renew90_yearly`
- Name: Renew90 Yearly
- Description: Full access - Best Value!
- Price: $49.99 USD
- Billing period: 1 year
- Free trial: 14 days

### 1.4 Get License Key
1. Go to **Monetize** → **Monetization setup**
2. Copy your **Base64-encoded RSA public key** (needed for RevenueCat)

---

## Step 2: RevenueCat Setup

### 2.1 Create Account
1. Go to [RevenueCat](https://www.revenuecat.com/)
2. Sign up for free (free up to $2,500/month revenue)

### 2.2 Create Project
1. Click "Create new project"
2. Name: **Renew90**

### 2.3 Add Android App
1. In your project, go to **Apps** → **Add new app**
2. Platform: **Google Play Store**
3. App name: **Renew90**
4. Package name: `app.renew90.journal`
5. Service credentials: Follow RevenueCat's guide to set up Google Play service account

### 2.4 Configure Products
1. Go to **Products** in RevenueCat
2. Import products from Google Play:
   - `renew90_monthly`
   - `renew90_yearly`

### 2.5 Create Entitlements
1. Go to **Entitlements** → **New**
2. Create entitlement:
   - Identifier: `premium`
   - Description: Full app access
3. Attach both products to this entitlement

### 2.6 Create Offering
1. Go to **Offerings** → **New**
2. Identifier: `default`
3. Add packages:
   - Monthly: Select `renew90_monthly`
   - Annual: Select `renew90_yearly`
4. Make it the **Current Offering**

### 2.7 Get API Keys
1. Go to **API Keys**
2. Copy the **Public SDK Key** for Android
3. This is your `VITE_REVENUECAT_ANDROID_KEY`

---

## Step 3: Environment Configuration

### 3.1 Update .env File
Add these to your `.env` file:

```env
# RevenueCat API Keys
VITE_REVENUECAT_ANDROID_KEY=your_revenuecat_public_key_here
VITE_REVENUECAT_IOS_KEY=your_revenuecat_ios_key_if_needed

# Optional: Beta codes (for server-side validation)
VITE_BETA_CODES_ENABLED=true
```

### 3.2 Update .env.example
Make sure `.env.example` has placeholders for these keys.

---

## Step 4: Android Configuration

### 4.1 Build the Android App
```bash
# Build the web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 4.2 Configure Signing
1. In Android Studio, go to **Build** → **Generate Signed Bundle/APK**
2. Create a new keystore or use existing
3. Save keystore securely (you'll need it for all updates)

### 4.3 Add Google Play Billing Permission
The RevenueCat Capacitor plugin automatically adds the billing permission.

---

## Step 5: Testing

### 5.1 License Testing
1. In Google Play Console, go to **Settings** → **License testing**
2. Add your test Gmail accounts
3. These accounts can make test purchases without being charged

### 5.2 Internal Testing Track
1. Go to **Testing** → **Internal testing**
2. Create a release with your signed AAB
3. Add testers (use license testing accounts)

### 5.3 Test Purchases
1. Install app from internal testing track
2. Make test purchases
3. Verify subscription activates correctly
4. Test restore purchases

### 5.4 Test Beta Codes
1. Open the paywall
2. Click "Have a beta code?"
3. Enter: `BETA2026` or `RENEW90BETA`
4. Verify 90-day access is granted

---

## Step 6: Production Launch

### 6.1 Pre-launch Checklist
- [ ] All subscription products created in Play Console
- [ ] Products synced to RevenueCat
- [ ] Entitlements and offerings configured
- [ ] API keys set in environment
- [ ] Tested on internal track
- [ ] Privacy policy updated
- [ ] App listing complete

### 6.2 Submit for Review
1. Complete all Play Store listing requirements
2. Submit to **Production** track
3. Wait for Google's review (usually 1-7 days)

---

## Beta Codes

### Default Beta Codes
The following codes are pre-configured for 90 days free access:
- `BETA2026`
- `RENEW90BETA`
- `EARLYBIRD`
- `FOUNDER90`

### Adding New Codes
Edit `services/subscriptionService.ts`:

```typescript
const VALID_BETA_CODES = new Set([
  'BETA2026',
  'RENEW90BETA',
  // Add new codes here
  'NEWCODE123',
]);
```

### Server-Side Validation (Recommended for Production)
For production, validate beta codes server-side to prevent abuse:
1. Store valid codes in Firebase
2. Track usage per code
3. Set expiry dates per code
4. Limit uses per code

---

## Troubleshooting

### "Purchases not available"
- Running on web (expected - subscriptions only work on native)
- RevenueCat not initialized
- Missing API key

### "Product not found"
- Product ID mismatch between code and Play Console
- Product not active in Play Console
- Product not synced to RevenueCat

### "Purchase failed"
- User cancelled (not an error)
- Payment method issue
- Google Play services not available

### Test purchases not working
- Account not in license testing list
- App not installed from testing track
- Try clearing Play Store cache

---

## Pricing Recommendations

Based on journaling app market research:

| Plan | Price | Notes |
|------|-------|-------|
| Monthly | $6.99 | Competitive with similar apps |
| Yearly | $49.99 | ~40% savings vs monthly |
| Trial | 14 days | Industry standard |

You can adjust prices in Google Play Console at any time. RevenueCat will automatically reflect the new prices.

---

## Support Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [Google Play Billing Guide](https://developer.android.com/google/play/billing)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [RevenueCat Capacitor Plugin](https://github.com/RevenueCat/purchases-capacitor)

---

## Next Steps

1. Complete Google Play Console setup
2. Set up RevenueCat account and project
3. Configure products and offerings
4. Add API key to environment
5. Test with internal testing track
6. Launch! 🚀
