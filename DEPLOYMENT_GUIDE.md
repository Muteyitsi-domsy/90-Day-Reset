# Deployment & Production Monitoring Guide

This guide covers deploying your app safely and monitoring it in production.

## Pre-Launch Checklist

### Code Quality ✓
- [x] Error Boundary implemented and wrapping app
- [x] Error logging utility created
- [x] Git tag created (v0.9.0-pre-launch)
- [ ] Tests written for critical flows
- [ ] All known bugs fixed

### Production Setup
- [ ] Environment variables configured
- [ ] API keys secured (not in code)
- [ ] Error tracking service set up (Sentry recommended)
- [ ] Analytics configured (optional)

## Recommended Deployment Platform: Vercel

Vercel is ideal for React apps and offers:
- Automatic deployments from Git
- Preview deployments for every PR
- Easy rollback
- Edge functions
- Analytics

### Setup Vercel

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Production deployment**
```bash
vercel --prod
```

### Vercel Features for Safe Deployments

**Preview Deployments**
- Every commit gets a unique preview URL
- Test before merging to main
- Share with beta testers

**Instant Rollback**
- One click to revert to previous version
- Go to Deployments → Select previous → Promote to Production

**Environment Variables**
- Store API keys securely
- Different values for staging vs production

## Error Monitoring: Sentry Setup

Sentry gives you real-time error alerts with context.

### 1. Create Free Sentry Account
- Visit: https://sentry.io
- Create project (select React)
- Copy your DSN

### 2. Install Sentry
```bash
npm install @sentry/react
```

### 3. Initialize in index.tsx
```typescript
import * as Sentry from "@sentry/react";

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production',
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // 100% when error occurs
  });
}
```

### 4. Add DSN to .env
```
VITE_SENTRY_DSN=your_sentry_dsn_here
```

### 5. Update ErrorBoundary (optional enhancement)
```typescript
import * as Sentry from "@sentry/react";

logErrorToService(error: Error, errorInfo: ErrorInfo): void {
  // Send to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack }
    });
  }

  // Always log locally
  errorLogger.log(error, {
    componentStack: errorInfo.componentStack,
    type: 'ErrorBoundary'
  });
}
```

## Deployment Strategy

### Phase 1: Soft Launch (Recommended)
1. Deploy to Vercel preview environment
2. Share with 5-10 beta users
3. Monitor errors for 1 week
4. Fix any critical issues
5. Create new git tag: `v1.0.0-beta`

### Phase 2: Limited Launch
1. Deploy to production
2. Announce to limited audience (friends, social media)
3. Monitor Sentry for errors daily
4. Quick fixes as needed
5. Collect feedback

### Phase 3: Full Launch
1. Verify no critical errors for 1-2 weeks
2. Add payment processing
3. Full marketing push
4. Monitor closely for first month

## Monitoring Checklist

### Daily (First Week)
- [ ] Check Sentry for new errors
- [ ] Review error rates
- [ ] Check user feedback
- [ ] Verify critical flows working

### Weekly (First Month)
- [ ] Review error trends
- [ ] Check performance metrics
- [ ] User retention stats
- [ ] Plan fixes for common issues

### Monthly (Ongoing)
- [ ] Review all errors
- [ ] Plan feature improvements
- [ ] Update dependencies
- [ ] Performance optimization

## Emergency Procedures

### If App is Crashing in Production

1. **Immediate Rollback**
   ```bash
   # Via Vercel dashboard
   Deployments → Previous stable version → Promote to Production

   # Or via CLI
   vercel rollback
   ```

2. **Check Sentry**
   - Review error details
   - Check how many users affected
   - Identify the breaking change

3. **Fix and Redeploy**
   - Fix locally
   - Test thoroughly
   - Deploy to preview first
   - Then to production

### If Specific Feature is Broken

Option 1: Quick fix and deploy
Option 2: Disable feature temporarily (add feature flag)

## Progressive Rollout (Advanced)

For major updates, roll out gradually:

```typescript
// Example feature flag
const isNewFeatureEnabled = () => {
  // Randomly enable for 10% of users
  return Math.random() < 0.1;
};

// Use in component
{isNewFeatureEnabled() && <NewFeature />}
```

Or use a service like:
- Vercel Edge Config
- LaunchDarkly (feature flags)
- Split.io

## Key Metrics to Track

1. **Error Rate**
   - Target: < 1% of sessions
   - Alert if > 5%

2. **Page Load Time**
   - Target: < 2 seconds
   - Monitor via Vercel Analytics

3. **User Retention**
   - How many users return?
   - Track in your database

4. **Critical Flow Completion**
   - % who complete onboarding
   - % who create first entry
   - % who complete rituals

## Git Tagging Strategy

Tag stable versions:
```bash
# Pre-launch testing
git tag -a v0.9.0-pre-launch -m "Stable version before launch"

# Beta release
git tag -a v1.0.0-beta -m "Beta release"

# Production release
git tag -a v1.0.0 -m "First production release"

# Bug fixes
git tag -a v1.0.1 -m "Fix calendar crash"

# Push tags
git push origin --tags
```

## Your Current Status

✅ Error Boundary implemented
✅ Error logging utility created
✅ Git tag v0.9.0-pre-launch created
✅ App wrapped with error protection

### Next Steps for Safe Launch

1. Use the app yourself for 90 days (you're doing this!)
2. Set up Sentry (15 minutes)
3. Deploy to Vercel preview (10 minutes)
4. Share with 5-10 beta testers (1 week)
5. Monitor and fix issues
6. Full launch when stable

## Resources

- Vercel Docs: https://vercel.com/docs
- Sentry React Docs: https://docs.sentry.io/platforms/javascript/guides/react/
- React Testing: https://testing-library.com/react
- Vitest: https://vitest.dev/

Remember: It's better to launch with a few known minor bugs than to never launch. You can fix issues as you go, and users are generally understanding during a beta/early launch period.
