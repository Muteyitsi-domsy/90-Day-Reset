# Privacy Policy

**90-Day Identity Reset App (Renew90)**
**Effective Date:** January 22, 2026
**Last Updated:** January 22, 2026

---

## Introduction

Welcome to the 90-Day Identity Reset App ("Renew90," "the App," "we," "our," or "us"). We respect your privacy and are committed to protecting your personal data, including your journal entries, mood data, and personal reflections.

This Privacy Policy explains how we collect, use, store, and protect your information when you use our journaling application. By using the App, you consent to the practices described in this policy.

**Important:** This app handles sensitive personal information. We have implemented enterprise-grade security measures to protect your data. Creating an account is **completely optional**—you can use the app entirely offline with local storage without providing any personal information.

---

## Table of Contents

1. [Information We Collect](#information-we-collect)
2. [How We Use Your Information](#how-we-use-your-information)
3. [AI-Generated Content and Limitations](#ai-generated-content-and-limitations)
4. [Data Security Measures](#data-security-measures)
5. [Data Storage and Encryption](#data-storage-and-encryption)
6. [Third-Party Services](#third-party-services)
7. [Admin Access](#admin-access)
8. [Data Retention](#data-retention)
9. [Your Rights and Choices](#your-rights-and-choices)
10. [USA Privacy Compliance](#usa-privacy-compliance)
11. [Children's Privacy](#childrens-privacy)
12. [International Data Transfers](#international-data-transfers)
13. [Changes to This Policy](#changes-to-this-policy)
14. [Contact Us](#contact-us)

---

## Information We Collect

### 1. Account Information
- **Email address** - For account recovery and optional notifications
- **Display name** - To personalize your experience
- **Password** - Encrypted and never stored in plain text
- **Authentication data** - Firebase authentication tokens

### 2. Journal and Mood Data
- **Daily journal entries** - Your personal reflections and thoughts
- **Weekly/monthly summaries** - AI-generated insights based on your entries
- **Mood entries** - Your emotional state, energy levels, and notes
- **Crisis detection data** - Analysis for concerning language patterns (for your safety)

### 3. Security Data
- **PIN codes** - If you enable PIN lock (hashed, never stored in plain text)
- **Multi-Factor Authentication (MFA) data** - If you enable MFA:
  - TOTP secret (encrypted)
  - Backup recovery codes (hashed)
  - MFA setup date
- **Audit logs** - Security events such as:
  - Login/logout events
  - Failed authentication attempts
  - Data modifications
  - Security setting changes
  - Device fingerprints (for security monitoring)

### 4. Usage Information
- **Journey progress** - Days completed, streaks, milestones
- **Settings preferences** - Theme, notification preferences
- **Device information** - Browser type, operating system (for security and compatibility)
- **IP address** - For security monitoring and fraud prevention (not permanently stored)

### 5. AI Analysis Data
- **API request data** - Prompts sent to AI services for analysis
- **Generated insights** - AI-generated reflections and summaries

---

## How We Use Your Information

### Primary Uses
1. **Journaling Service** - To provide core journaling and reflection features
2. **AI Analysis** - To generate personalized insights and summaries using Google Gemini AI
3. **Progress Tracking** - To track your 90-day journey, streaks, and milestones
4. **Crisis Detection** - To identify concerning language and provide mental health resources
5. **App Improvement** - To improve the app using aggregate, anonymized data only

### Security Uses
1. **Authentication** - To verify your identity and secure your account
2. **Fraud Prevention** - To detect and prevent unauthorized access
3. **Security Monitoring** - To track security events via audit logs
4. **Account Recovery** - To help you regain access if you forget your password or PIN

### Communication (Optional)
1. **PIN Recovery** - To send recovery codes via email if you enable PIN lock
2. **Password Reset** - To send password reset emails if requested
3. **Important Updates** - To notify you of critical security or service changes

**We will NEVER:**
- ❌ Sell your personal data to third parties
- ❌ Use your journal entries for marketing
- ❌ Share your mood data with advertisers
- ❌ Analyze your data for purposes other than providing the service
- ❌ Share your information without your explicit consent (except as required by law)
- ❌ Rent or trade your personal information

---

## AI-Generated Content and Limitations

### Important AI Disclaimer

**The App uses Google Gemini AI to analyze your journal entries and generate insights, reports, and prompts. You acknowledge and agree that:**

⚠️ **AI CAN MAKE MISTAKES** - Artificial intelligence technology, while advanced, is not infallible. AI-generated content may contain errors, inaccuracies, or inappropriate suggestions.

⚠️ **VERIFY ALL INFORMATION** - Any insights, patterns, suggestions, or analysis provided by AI features should be independently verified. Do not rely solely on AI-generated reports or recommendations for important decisions.

⚠️ **NOT PROFESSIONAL ADVICE** - AI-generated content is NOT medical, psychological, therapeutic, or professional advice of any kind. The insights are algorithmic interpretations and should be used for personal reflection only.

⚠️ **LIMITATIONS OF AI ANALYSIS** - AI may:
- Misinterpret context, tone, or meaning in your entries
- Generate insights that are not relevant to your situation
- Fail to detect important patterns or concerns
- Produce inconsistent results for similar content
- Not understand cultural, personal, or situational nuances

⚠️ **YOUR RESPONSIBILITY** - You are solely responsible for:
- Evaluating the accuracy and appropriateness of AI-generated content
- Deciding whether to act on any AI suggestions
- Seeking professional help when needed (AI is not a substitute)
- Using your own judgment when interpreting insights

### How AI Analysis Works
1. Your journal entry text is sent to Google Gemini API for analysis
2. The API processes patterns, themes, and emotional content
3. Generated insights are returned and displayed to you
4. Your prompts are processed securely and are not used for AI model training

### Opting Out
You may disable AI analysis at any time in Settings → Insight Frequency → None. When disabled, no journal content is sent to external AI services.

---

## Data Security Measures

We implement **enterprise-grade security** to protect your sensitive data:

### 1. Encryption at Rest
- **AES-256-CBC encryption** for all sensitive data stored locally
- **PBKDF2 key derivation** (1,000 iterations) for encryption keys
- **Encrypted fields:**
  - Journal entries
  - Mood entries
  - User profile data
  - MFA secrets

### 2. Encryption in Transit
- **TLS 1.2+ encryption** for all data transmitted between your device and our servers
- **HSTS (HTTP Strict Transport Security)** enforces HTTPS for 1 year
- **Certificate pinning** for Firebase connections

### 3. Authentication Security
- **Strong password requirements:**
  - Minimum 12 characters
  - Complexity rules (uppercase, lowercase, numbers)
  - Weak password blacklist
- **Optional PIN lock** (6-character alphanumeric, 2.1 billion combinations)
- **Rate limiting** - 5 PIN attempts before 15-minute lockout
- **Optional Multi-Factor Authentication (MFA):**
  - Industry-standard TOTP (RFC 6238)
  - Compatible with Google Authenticator, Authy, Microsoft Authenticator
  - 10 hashed backup recovery codes

### 4. Database Security
- **Firestore Security Rules** with 13 validation functions
- **User-scoped access** - You can only access your own data
- **Field-level validation** - Input sanitization and type checking
- **Document size limits** - Prevent abuse and ensure performance

### 5. API Security
- **CORS whitelisting** - Only approved origins can access APIs
- **Input validation** - All user inputs sanitized and validated
- **Request size limits** - Maximum 10,000 characters per prompt
- **Rate limiting** - 50 API requests per user per day

### 6. Content Security Policy (CSP)
- **11-directive CSP** to prevent Cross-Site Scripting (XSS) attacks
- **X-Frame-Options: DENY** to prevent clickjacking
- **Permissions-Policy** to block access to device sensors

### 7. Audit Logging
- **Immutable audit trail** - All security events logged to append-only collection
- **90-day retention** - Security logs kept for 90 days
- **Event tracking:**
  - Authentication events (login, logout, failures)
  - MFA events (enable, disable, verification)
  - PIN events (set, change, lockout)
  - Data operations (create, update, delete)
  - Security setting changes

### 8. Privacy-Preserving Error Tracking
- **Sentry data scrubbing** - Sensitive data removed from error reports:
  - Email addresses redacted
  - Passwords redacted
  - Journal content redacted
  - Authentication tokens redacted
  - Firebase UIDs redacted

### 9. Crisis Detection Privacy
- **Enhanced pattern matching** - 130+ keyword patterns to detect crisis language
- **Negation detection** - Reduces false positives (e.g., "I don't want to die")
- **No external sharing** - Crisis detection happens locally, results not shared

---

## Data Storage and Encryption

### Local Storage (Your Device)
- **Encrypted with AES-256-CBC** - All sensitive data encrypted before storage
- **Unique encryption keys** - Derived from your userId + device salt + browser fingerprint
- **Auto-migration** - Old unencrypted data automatically migrated to encrypted format
- **Stored data:**
  - Journal entries (encrypted)
  - Mood entries (encrypted)
  - User profile (encrypted)
  - Settings (not encrypted - not sensitive)

### Cloud Storage (Firestore)
- **Google Cloud Platform encryption** - All data encrypted at rest by Firebase
- **TLS encryption** - All data encrypted in transit
- **User-scoped collections** - Your data isolated from other users
- **Geographic location:** Data stored in Firebase default region (US by default, configurable)

### Session Storage
- **Firebase authentication tokens** - Stored securely in browser
- **Session management** - Automatic logout on inactivity (configurable)

---

## Third-Party Services

We use the following trusted third-party services to provide our application:

### 1. Firebase (Google Cloud)
**Purpose:** Authentication, database, hosting
**Data shared:** Email, encrypted user data, authentication tokens
**Privacy policy:** https://firebase.google.com/support/privacy
**Security:** Enterprise-grade, SOC 2 Type II certified

### 2. Google Gemini API
**Purpose:** AI-powered journal analysis and insights
**Data shared:** Journal entry text, analysis prompts
**Privacy policy:** https://policies.google.com/privacy
**Data retention:** We do not store your prompts on Google's servers permanently
**Note:** Journal entries are sent to Gemini API for analysis. We use Google's API with their privacy commitments.

### 3. Sentry
**Purpose:** Error tracking and performance monitoring
**Data shared:** Error messages (with sensitive data scrubbed), browser info, session replays (with masking)
**Privacy policy:** https://sentry.io/privacy/
**Security:** All sensitive data (emails, passwords, journal content) automatically removed before sending

### 4. EmailJS
**Purpose:** Sending PIN recovery codes via email (optional feature)
**Data shared:** Email address, recovery codes (temporary)
**Privacy policy:** https://www.emailjs.com/legal/privacy-policy/
**Note:** Only used if you enable PIN lock and request recovery

### 5. Vercel
**Purpose:** Application hosting and CDN
**Data shared:** HTTP request logs, performance metrics
**Privacy policy:** https://vercel.com/legal/privacy-policy
**Security:** TLS encryption, DDoS protection, SOC 2 certified

**Third-Party Commitments:**
- All third-party services are SOC 2 certified or equivalent
- All services comply with GDPR and CCPA
- We have data processing agreements with all service providers
- We regularly review third-party security practices

---

## Admin Access

If you use cloud backup, project administrators can technically access data for debugging and support purposes. However:
- We do not actively read your journal entries
- Access is only used for legitimate support and technical purposes
- All admin access is logged and monitored
- Access requires documented justification

**Note:** If you prefer complete privacy, use the app without creating an account (local storage only mode).

---

## Data Retention

### Active Account Data
- **Journal entries:** Retained as long as your account is active
- **Mood entries:** Retained as long as your account is active
- **User profile:** Retained as long as your account is active
- **Settings:** Retained as long as your account is active

### Security Data
- **Audit logs:** Retained for 90 days, then automatically deleted
- **Authentication logs:** Retained for 90 days
- **Error logs (Sentry):** Retained for 90 days

### Local Storage Data
- Data stored locally can be cleared via browser settings or the app's delete function
- Local data is never automatically transmitted to our servers without your action

### Account Deletion
When you delete your account:
1. **Immediate deletion:**
   - Journal entries
   - Mood entries
   - User profile
   - Authentication data
   - MFA data
   - Local encrypted storage

2. **Retained for up to 30 days** (backup retention):
   - Audit logs (for security compliance)
   - Backup copies (automatically purged after 30 days)

3. **Retained for up to 90 days** (legal/security):
   - Critical security logs (if required by law or ongoing investigation)

**Right to erasure:** You can request complete data deletion at any time by emailing privacy@renew90.app.

---

## Your Rights and Choices

### Your Data Rights (GDPR, CCPA)

You have the following rights regarding your personal data:

1. **Right to Access** - Request a copy of all data we have about you
2. **Right to Rectification** - Correct inaccurate or incomplete data
3. **Right to Erasure** - Request deletion of your data ("right to be forgotten")
4. **Right to Portability** - Export your data in machine-readable format
5. **Right to Restrict Processing** - Limit how we use your data
6. **Right to Object** - Object to processing of your data
7. **Right to Withdraw Consent** - Opt-out of optional features at any time

### How to Exercise Your Rights

**Export your data:**
- Use the in-app export feature to download all journal entries, mood data, and summaries

**Delete your account:**
- Go to Settings → Delete Account
- All data will be permanently deleted within 30 days

**Request data access/deletion:**
- Email [your contact email] with subject "Data Request"
- We will respond within 30 days

### Your Choices

**Optional Features:**
- **AI Analysis** - Disable in Settings → Insight Frequency → None
- **PIN Lock** - Enable/disable in Settings → Security
- **Multi-Factor Authentication** - Enable/disable in Settings → Security → Two-Factor Authentication
- **Email Notifications** - Manage in Settings

**Data Collection:**
- **Audit Logging** - Cannot be disabled (required for security)
- **Error Tracking** - Cannot be disabled (required for app stability)
- **Analytics** - We do NOT use analytics or tracking cookies

---

## USA Privacy Compliance

We comply with applicable United States federal and state privacy laws.

### California Consumer Privacy Act (CCPA) / California Privacy Rights Act (CPRA)

If you are a California resident, you have specific rights under the CCPA/CPRA:

**Your Rights:**
1. **Right to Know** - Request disclosure of personal information collected, used, and shared
2. **Right to Delete** - Request deletion of your personal information
3. **Right to Correct** - Request correction of inaccurate personal information
4. **Right to Opt-Out** - Opt out of the sale or sharing of personal information
5. **Right to Non-Discrimination** - Not be discriminated against for exercising your rights
6. **Right to Limit Use** - Limit use of sensitive personal information

**Our Practices:**
- We do **NOT** sell your personal information
- We do **NOT** share your personal information for cross-context behavioral advertising
- We do **NOT** use sensitive personal information for purposes other than providing the service

**To Exercise Your Rights:** Email privacy@renew90.app with subject "California Privacy Request" or use the in-app data management features.

### Virginia Consumer Data Protection Act (VCDPA)

Virginia residents have similar rights including access, correction, deletion, data portability, and opt-out rights.

### Colorado Privacy Act (CPA)

Colorado residents have rights to access, correct, delete, and obtain a portable copy of their data.

### Connecticut Data Privacy Act (CTDPA)

Connecticut residents have rights including access, correction, deletion, portability, and opt-out of targeted advertising.

### Utah Consumer Privacy Act (UCPA)

Utah residents have rights to access, delete, and obtain a portable copy of their data.

### Other State Laws

We monitor and comply with emerging state privacy laws. Regardless of your state of residence, we provide all users with:
- Access to their data via in-app export features
- Ability to delete their data at any time
- Transparency about data collection and use
- Choice regarding optional features like AI analysis

### Federal Compliance

We comply with applicable federal laws including:
- **FTC Act Section 5** - Unfair or deceptive practices
- **COPPA** - We do not knowingly collect data from children under 13
- **ECPA** - Electronic Communications Privacy Act protections

---

## Children's Privacy

The 90-Day Identity Reset App is **not intended for children under 18 years of age.**

We do not knowingly collect personal information from children under 13 (as required by COPPA) or children under 18 (our service restriction). If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at privacy@renew90.app, and we will delete the information.

**Age Verification:** By using this app, you confirm you are 18 years or older.

---

## International Data Transfers

Our services are hosted in the United States (Firebase/Google Cloud default region).

If you are located outside the United States:
- Your data will be transferred to and stored in the United States
- We comply with GDPR for EU/EEA users
- We comply with CCPA for California residents
- Data transfers use standard contractual clauses (SCCs)
- All data transfers are encrypted (TLS 1.2+)

**EU/EEA Users:** By using our service, you consent to the transfer of your data to the United States. We use appropriate safeguards (SCCs) and ensure all service providers are GDPR-compliant.

---

## Changes to This Policy

We may update this Privacy Policy from time to time to reflect:
- Changes in our security practices
- New features or services
- Legal or regulatory requirements
- Feedback from users

**Notification of Changes:**
- **Material changes:** We will notify you via email or prominent in-app notice
- **Minor changes:** We will update the "Last Updated" date at the top of this policy
- **Your consent:** Continued use of the app after changes constitutes acceptance

**Version History:**
- v1.0.0 (January 16, 2026) - Initial privacy policy with enterprise-grade security features

We encourage you to review this Privacy Policy periodically.

---

## Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or your personal data:

**Privacy Inquiries:** privacy@renew90.app
**General Administration:** admin@renew90.app
**General Support:** support@renew90.app

**Security Issues:** If you discover a security vulnerability, please report it immediately to security@renew90.app with subject "Security Issue - URGENT"

**Response Time:** We aim to respond to all privacy inquiries within 7 business days.

You can also reach us through the app's Contact page in the Menu.

---

## Summary of Key Points

✅ **Your data is encrypted** - AES-256 encryption for local storage, TLS for transmission
✅ **Strong authentication** - 12+ character passwords, optional PIN lock, optional MFA
✅ **You own your data** - Export or delete anytime (Menu → Data & Privacy)
✅ **No selling of data** - We never sell your personal information
✅ **Transparent third parties** - All service providers disclosed
✅ **Security-first design** - Enterprise-grade security measures
✅ **Your rights protected** - GDPR, CCPA, and state privacy laws compliant
✅ **Privacy-preserving AI** - Your journal entries used only for your insights
✅ **AI limitations disclosed** - AI can make mistakes; verify all information
✅ **Audit trail** - Complete visibility into security events
✅ **Crisis detection privacy** - Analysis happens locally, not shared externally
✅ **Optional cloud** - Use entirely offline with local storage only

---

## Legal Basis for Processing (GDPR)

If you are in the EU/EEA, we process your personal data under the following legal bases:

1. **Contract** - To provide the journaling service you signed up for
2. **Legitimate Interest** - For security monitoring, fraud prevention, and service improvement
3. **Consent** - For optional features like MFA, AI analysis, email notifications
4. **Legal Obligation** - To comply with legal requirements (e.g., security breach notification)

You may withdraw consent at any time for optional features.

---

**By using the 90-Day Identity Reset App, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.**

Last Updated: January 22, 2026
Version: 2.0.0
