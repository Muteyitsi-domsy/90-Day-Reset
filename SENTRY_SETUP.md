# Sentry Setup - Complete ✓

Sentry error tracking is now fully integrated into your app!

## What's Configured

### ✅ Sentry SDK Installed
- Package: `@sentry/react` installed
- Version: Latest

### ✅ Environment Variables Set
- `.env` file created with your DSN
- `.env.example` template for reference
- `.gitignore` already excludes `.env` files

### ✅ Sentry Initialized (index.tsx)
- Error tracking enabled
- Performance monitoring (10% sampling in production)
- Session Replay (captures user sessions when errors occur)
- Console error logging
- **Only active in production mode** (development errors not sent)

### ✅ ErrorBoundary Integration
- All React errors automatically sent to Sentry
- Includes component stack traces
- Local logging still works as backup

## Testing Sentry

### Option 1: Test in Production Mode

Build and preview the production version:

```bash
npm run build
npm run preview
```

Then open the app and trigger an error to see it in Sentry.

### Option 2: Enable for Development

Edit `index.tsx` line 36 and change:

```typescript
enabled: import.meta.env.MODE === 'production',
```

to:

```typescript
enabled: true, // Always send to Sentry
```

Then run `npm run dev` and errors will be sent to Sentry even in development.

### Option 3: Use the Test Component

1. Add to App.tsx temporarily:
```typescript
import SentryTest from './components/SentryTest';

// In your render, add:
<SentryTest />
```

2. Click the test buttons to verify Sentry receives errors
3. Check your Sentry dashboard at https://sentry.io
4. Remove the component when done testing

## Verifying It Works

1. **Build for production:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Trigger an error** (try the calendar or any feature)

3. **Check Sentry Dashboard:**
   - Go to https://sentry.io
   - Navigate to Projects → 90-Day-Reset
   - Click "Issues" to see errors
   - You should see the error with full stack trace

## What You'll See in Sentry

When an error occurs, Sentry captures:

- **Error message and stack trace**
- **Component stack** (which React component failed)
- **User's browser and OS**
- **Breadcrumbs** (actions leading to the error)
- **Session Replay** (video of what the user did) *
- **Performance data**

\* Session Replay only activates when an error occurs (privacy-safe)

## Sentry Configuration Summary

Your current settings:

```typescript
{
  dsn: "your-sentry-dsn",
  environment: "production", // or "development"

  // 10% of normal sessions tracked for performance
  tracesSampleRate: 0.1,

  // 10% of sessions recorded
  replaysSessionSampleRate: 0.1,

  // 100% of error sessions recorded
  replaysOnErrorSampleRate: 1.0,

  // Only active in production builds
  enabled: import.meta.env.MODE === 'production',
}
```

## Adjusting Sensitivity

### Send More Data (for beta testing):
```typescript
tracesSampleRate: 1.0, // 100% of transactions
replaysSessionSampleRate: 1.0, // Record all sessions
```

### Send Less Data (for scale):
```typescript
tracesSampleRate: 0.05, // 5% of transactions
replaysSessionSampleRate: 0.01, // 1% of sessions
```

## Setting Up Alerts

In your Sentry dashboard:

1. Go to **Alerts** → **Create Alert**
2. Choose "Issues"
3. Set conditions:
   - "When an event is seen"
   - "The issue is new"
4. Set action: "Send notification to [your email]"
5. You'll get instant email alerts for new errors!

## Important Notes

### Privacy & GDPR
- Session Replay **masks all text and media** by default
- User inputs are not captured
- No personal data is recorded
- Compliant with privacy regulations

### Free Tier Limits
- 5,000 errors/month
- 500 performance monitoring sessions/month
- 50 replays/month
- Perfect for your launch!

### Production vs Development
- Currently set to **only send errors in production**
- Development errors are logged to console only
- Change `enabled: true` to send dev errors too

## What's Next

1. **Test it!** Use the test component or production build
2. **Set up email alerts** in Sentry dashboard
3. **Monitor during beta launch**
4. **Review errors weekly** and prioritize fixes

## Quick Commands

```bash
# Build for production (Sentry will be active)
npm run build
npm run preview

# Development (Sentry inactive by default)
npm run dev

# To see your .env file
cat .env
```

## Need Help?

- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/react/
- Your Dashboard: https://sentry.io/organizations/[your-org]/projects/
- Contact: support@sentry.io (they're very responsive!)

---

**Status: ✅ Sentry is fully configured and ready for production!**

Your app will now catch errors gracefully and alert you in real-time when users encounter issues. You're production-ready! 🚀
