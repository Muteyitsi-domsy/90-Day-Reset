# Testing Setup Guide

This guide will help you set up automated testing for the 90-Day Reset App.

## Quick Start - Add Testing

### 1. Install Testing Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### 2. Update package.json

Add these scripts to your `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

### 3. Create vitest.config.ts

Create a file `vitest.config.ts` in the root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

### 4. Create test setup file

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

### 5. Run Tests

```bash
npm test
```

## Testing Strategy

### What to Test

1. **Critical User Flows**
   - User can complete onboarding
   - User can create journal entries
   - User can complete daily rituals
   - Calendar displays correctly

2. **Data Persistence**
   - Settings are saved and loaded
   - Journal entries persist
   - User profile persists

3. **Error Handling**
   - App doesn't crash on invalid input
   - Error boundaries work
   - Graceful degradation

### Example Tests

See `__tests__/example.test.tsx` for basic test examples.

## Integrating Error Tracking (Sentry)

### 1. Install Sentry

```bash
npm install --save @sentry/react
```

### 2. Initialize in index.tsx

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN_HERE",
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0, // Lower in production
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 3. Update ErrorBoundary

Replace the `logErrorToService` method in `ErrorBoundary.tsx`:

```typescript
import * as Sentry from "@sentry/react";

logErrorToService(error: Error, errorInfo: ErrorInfo): void {
  Sentry.captureException(error, {
    extra: {
      componentStack: errorInfo.componentStack,
    },
  });

  errorLogger.log(error, {
    componentStack: errorInfo.componentStack,
    type: 'ErrorBoundary'
  });
}
```

## Progressive Rollout with Vercel

1. Deploy to preview environment first
2. Test thoroughly
3. Deploy to production with gradual rollout:
   - Use Vercel's Edge Config for feature flags
   - Roll out to percentage of users
   - Monitor error rates
   - Increase percentage gradually

## Pre-Launch Checklist

- [ ] Error boundary wraps the app ✓
- [ ] Error logging is working ✓
- [ ] Git tag created for stable version ✓
- [ ] Critical flows have tests
- [ ] Error tracking service integrated (Sentry)
- [ ] Staging environment set up
- [ ] Rollback plan documented
- [ ] Monitoring dashboard configured
