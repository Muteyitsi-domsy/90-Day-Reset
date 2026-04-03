# Security Documentation

## 90-Day Identity Reset App - Security Implementation Guide

**Last Updated:** January 16, 2026
**Security Level:** Enterprise-Grade
**Data Classification:** Highly Sensitive (Personal Health Information)

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Content Security Policy (CSP)](#content-security-policy-csp)
3. [Security Headers](#security-headers)
4. [Data Encryption](#data-encryption)
5. [Authentication & Authorization](#authentication--authorization)
6. [Input Validation](#input-validation)
7. [Rate Limiting](#rate-limiting)
8. [API Security](#api-security)
9. [Credential Rotation Schedule](#credential-rotation-schedule)
10. [Security Checklist](#security-checklist)

---

## Security Overview

This application implements multiple layers of security to protect sensitive user data including journal entries, mood tracking, and personal reflections.

### Security Layers

1. **Transport Security:** HTTPS with HSTS
2. **Authentication:** Firebase Authentication with strong password requirements
3. **Authorization:** Firestore Security Rules (user-scoped access)
4. **Data Encryption:** AES-256 encryption for localStorage
5. **Input Validation:** Comprehensive validation with Zod schemas
6. **Access Control:** PIN lock with rate limiting
7. **Content Security:** CSP headers to prevent XSS
8. **API Security:** CORS whitelisting, request validation, rate limiting

---

## Content Security Policy (CSP)

### Current CSP Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://aistudiocdn.com;
  style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
  img-src 'self' data: https: blob:;
  font-src 'self' data: https:;
  connect-src 'self' https://*.googleapis.com https://*.firebase.com https://*.firebaseio.com https://sentry.io https://*.sentry.io https://emailjs.com https://api.emailjs.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

### Directive Explanations

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Only allow resources from same origin by default |
| `script-src` | `'self' 'unsafe-inline' cdn.tailwindcss.com aistudiocdn.com` | Allow scripts from app and whitelisted CDNs |
| `style-src` | `'self' 'unsafe-inline' cdn.tailwindcss.com` | Allow styles from app and Tailwind CDN |
| `img-src` | `'self' data: https: blob:` | Allow images from all HTTPS sources (for user uploads) |
| `connect-src` | Whitelisted domains | Only allow API calls to Firebase, Sentry, EmailJS |
| `frame-src` | `'none'` | Prevent embedding in iframes (clickjacking protection) |
| `object-src` | `'none'` | Block Flash, Java, and other plugins |
| `frame-ancestors` | `'none'` | Prevent page from being embedded |
| `upgrade-insecure-requests` | (enabled) | Automatically upgrade HTTP to HTTPS |

### Why `'unsafe-inline'` is Used

⚠️ **Note:** We use `'unsafe-inline'` for scripts and styles due to:
1. Inline theme script for FOUC prevention (Flash of Unstyled Content)
2. Tailwind CDN generates inline styles dynamically
3. React library loaded via import maps

**Mitigation:**
- All inline scripts are minimal and reviewed
- External scripts whitelisted explicitly
- Future improvement: Migrate to nonce-based CSP

---

## Security Headers

### Headers Implemented

All security headers are configured in `vercel.json` and applied to all routes.

#### 1. X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
**Purpose:** Prevents MIME type sniffing attacks
**Protection:** Forces browsers to respect declared Content-Type

#### 2. X-Frame-Options
```
X-Frame-Options: DENY
```
**Purpose:** Prevents clickjacking attacks
**Protection:** Blocks the app from being embedded in iframes

#### 3. X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```
**Purpose:** Enables browser's XSS filter (legacy browsers)
**Protection:** Blocks page if XSS attack detected

#### 4. Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
**Purpose:** Controls referrer information sent
**Protection:** Prevents leaking sensitive URLs to third parties

#### 5. Permissions-Policy
```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```
**Purpose:** Restricts browser features
**Protection:** Prevents unauthorized access to device sensors

#### 6. Strict-Transport-Security (HSTS)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
**Purpose:** Forces HTTPS for 1 year
**Protection:** Prevents downgrade attacks and cookie hijacking

---

## Data Encryption

### localStorage Encryption (AES-256)

**What's Encrypted:**
- ✅ Journal entries (daily reflections, summaries)
- ✅ User profile (name, arc, manifesto, streak)
- ✅ Mood journal entries (emotional states, notes)
- ❌ Settings (theme, preferences - not sensitive)

**Encryption Specs:**
- **Algorithm:** AES-256-CBC
- **Key Size:** 256 bits
- **Key Derivation:** PBKDF2 (1,000 iterations)
- **Library:** CryptoJS

**Key Derivation:**
```
Key = PBKDF2(
  passphrase = userId + deviceSalt + userAgent,
  salt = randomSalt,
  iterations = 1000
)
```

**Security Properties:**
- Unique key per user + device combination
- Keys cleared on logout
- Automatic migration from unencrypted data
- Can't decrypt without correct key

### Firestore Data

**Encryption at Rest:**
- Firebase automatically encrypts all data at rest
- Encryption handled by Google Cloud Platform

**Encryption in Transit:**
- All Firebase connections use TLS 1.2+
- Certificate pinning enabled

---

## Authentication & Authorization

### Password Requirements

**Minimum Requirements:**
- ✅ 12 characters minimum (NIST recommended)
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ No common weak passwords

**Strength Meter:**
- Weak: < 40 points
- Fair: 40-59 points
- Good: 60-79 points
- Strong: 80+ points

### PIN Lock Security

**PIN Specifications:**
- **Length:** 6 characters (upgraded from 4)
- **Charset:** Alphanumeric (A-Z, 0-9)
- **Combinations:** 2.1 billion (vs 456k for 4-char)

**Rate Limiting:**
- **Max PIN Attempts:** 5 (before lockout)
- **Lockout Duration:** 15 minutes
- **Recovery Code Attempts:** 3 (before lockout)

### Recovery Code

**Specifications:**
- **Length:** 7 digits (upgraded from 6)
- **Possible Values:** 10 million
- **Expiration:** 15 minutes
- **Delivery:** Email via EmailJS
- **Rate Limited:** Yes (3 attempts)

### Firestore Security Rules

```javascript
match /users/{userId} {
  // Users can only access their own data
  allow read, write: if request.auth != null && request.auth.uid == userId;

  match /journalEntries/{entryId} {
    allow read, write: if request.auth.uid == userId;
  }

  match /moodEntries/{entryId} {
    allow read, write: if request.auth.uid == userId;
  }
}
```

---

## Input Validation

### Validation Library

All inputs validated using **Zod** schemas for type safety and security.

### Validated Fields

#### Email
- **Regex:** RFC 5322 compliant
- **Max Length:** 254 characters
- **Sanitization:** Trimmed, lowercased

#### Password
- **Min Length:** 12 characters
- **Complexity:** Uppercase + lowercase + number
- **Check Against:** Common weak passwords list

#### Display Name
- **Min Length:** 2 characters
- **Max Length:** 100 characters
- **Allowed Chars:** Letters, spaces, hyphens, apostrophes
- **Sanitization:** Trimmed, validated regex

#### PIN
- **Length:** Exactly 6 characters
- **Format:** Uppercase alphanumeric only

#### Journal Entry
- **Min Length:** 1 character
- **Max Length:** 50,000 characters
- **Type:** Plain text (sanitized)

#### API Prompts
- **Max Length:** 10,000 characters
- **Validation:** Type checking, size limits
- **Config Parameters:** Bounded (temperature 0-2, tokens 100-4096)

---

## Rate Limiting

### API Endpoints

**Vertex AI / Gemini API:**
- **Daily Limit:** 50 requests per user
- **Monthly Cap:** $100 spending
- **Storage:** In-memory (to be migrated to Vercel KV)

⚠️ **Known Issue:** Rate limits reset on serverless cold starts
📝 **Planned Fix:** Migrate to Vercel KV for persistent storage

### Authentication

**PIN Attempts:**
- **Max Attempts:** 5 per 15 minutes
- **Lockout Duration:** 15 minutes
- **Storage:** localStorage (per user/device)

**Recovery Code:**
- **Max Attempts:** 3 per session
- **Lockout Duration:** 15 minutes
- **Expiration:** 15 minutes per code

**Password Reset:**
- **Firebase Default:** Automatic rate limiting

---

## API Security

### CORS Configuration

**Allowed Origins:**
```javascript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',           // Local development
  'http://localhost:3000',           // Alternative local port
  'https://90-day-reset.vercel.app', // Production
];
```

**CORS Headers:**
- Only allowed origins receive CORS headers
- Credentials allowed only for whitelisted origins
- Methods restricted to POST, OPTIONS only

### Request Validation

**Vertex AI Endpoint:**
- Prompt: Max 10,000 characters
- Request Type: Enum validation (onboarding, analysis, summary, hunch, general)
- Temperature: 0.0 - 2.0
- Max Tokens: 100 - 4,096
- Top-P: 0.0 - 1.0

**Gemini Endpoint:**
- Action: Enum validation (generate_weekly_summary, generate_monthly_summary)
- Entries: Array validation, max 100 entries
- Entry Size: Max 50,000 characters each

---

## Credential Rotation Schedule

### API Keys

**Rotation Frequency:** Every 90 days

**Keys to Rotate:**
1. Firebase API Key (if using restricted keys)
2. Gemini API Key
3. Google Cloud Service Account Key
4. EmailJS API Keys
5. Sentry DSN (if compromised)

**Rotation Procedure:**
1. Generate new key in respective console
2. Add to Vercel environment variables
3. Test in staging environment
4. Deploy to production
5. Monitor for errors
6. Delete old key after 7 days

### Certificate Management

**TLS Certificates:**
- Managed automatically by Vercel
- Auto-renew via Let's Encrypt
- No manual intervention required

---

## Security Checklist

### Before Production Launch

- [ ] Rotate all exposed API keys
- [ ] Review Firestore security rules
- [ ] Test CSP in production environment
- [ ] Verify HSTS preload submission
- [ ] Enable Sentry data scrubbing
- [ ] Test rate limiting under load
- [ ] Review all console.log statements (remove sensitive data)
- [ ] Verify localStorage encryption working
- [ ] Test password reset flow
- [ ] Test PIN recovery flow
- [ ] Audit external dependencies for vulnerabilities (`npm audit`)
- [ ] Enable Firebase App Check (optional)
- [ ] Set up monitoring alerts (Sentry, Vercel)

### Monthly Maintenance

- [ ] Review Sentry error logs
- [ ] Check API usage and costs
- [ ] Review Firestore security rules
- [ ] Scan for dependency vulnerabilities
- [ ] Review CSP violation reports (if any)

### Quarterly Maintenance

- [ ] Rotate API keys and credentials
- [ ] Review and update security policies
- [ ] Penetration testing (optional)
- [ ] Dependency updates
- [ ] Security training review

---

## Incident Response

### If Credentials Are Compromised

1. **Immediately rotate** all affected credentials
2. **Review access logs** in Firebase/Vercel
3. **Check for** unauthorized data access
4. **Notify users** if data was accessed
5. **Update security measures** to prevent recurrence
6. **Document incident** for future reference

### If XSS Vulnerability Discovered

1. **Immediately deploy** CSP fix
2. **Review all** user-generated content
3. **Sanitize** affected data
4. **Notify users** if needed
5. **Update** input validation

### If Data Breach Occurs

1. **Contain** the breach immediately
2. **Assess** scope of data exposed
3. **Notify** affected users within 72 hours
4. **Report** to authorities if required (GDPR, CCPA)
5. **Implement** additional security measures
6. **Document** full incident report

---

## Audit Logging

### What is Logged

All security-relevant events are logged to an immutable audit trail:

**Authentication Events:**
- Login attempts (successful and failed)
- Logout events
- Password resets
- Account signups

**MFA Events:**
- MFA enabled/disabled
- TOTP verification (success/failure)
- Backup code usage

**PIN Events:**
- PIN set/changed/removed
- Failed PIN attempts
- Lockout events
- Recovery code requests

**Data Events:**
- Journal entry creation/updates/deletions
- Mood entry creation/updates/deletions
- User profile modifications

**Journey Events:**
- Journey pause/resume
- Journey completion

### Audit Log Retention

- **Retention Period:** 90 days
- **Storage:** Firestore collection (`auditLogs`)
- **Access:** Users can only view their own audit logs
- **Immutability:** Logs cannot be modified or deleted after creation

### Security Features

- **Append-only:** Audit logs cannot be modified or deleted
- **User-scoped:** Users can only access their own logs
- **Device fingerprinting:** Each event includes device ID
- **Severity levels:** info, warning, critical
- **Automatic alerts:** Critical events logged to console

### Example Use Cases

- Review failed login attempts
- Track MFA backup code usage
- Monitor data access patterns
- Investigate suspicious activity
- Comply with security audits

---

## Contact & Reporting

**Security Issues:** Report to app maintainer immediately
**Documentation Updates:** Update this file with any security changes
**Version:** 1.0.0 (January 2026)

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [Vercel Security](https://vercel.com/docs/security)
