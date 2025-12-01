# EmailJS Setup Guide for Password Reset

Your password reset feature is now fully implemented! You just need to configure EmailJS to send actual emails.

## Step 1: Create an EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account (200 emails/month for free)
3. Verify your email address

## Step 2: Add an Email Service

1. In the EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the instructions to connect your email account
5. **Copy the Service ID** (you'll need this later)

## Step 3: Create an Email Template

1. In the EmailJS dashboard, go to **Email Templates**
2. Click **Create New Template**
3. Use this template content:

**Template Name:** PIN Recovery Code

**Subject:** Your PIN Recovery Code

**Body:**
```
Hello {{to_name}},

You requested to reset your PIN for the 90-Day Identity Reset App.

Your recovery code is:

{{recovery_code}}

This code will expire in 15 minutes.

If you didn't request this, please ignore this email.

Best regards,
90-Day Identity Reset App
```

4. **Copy the Template ID** (you'll need this later)

## Step 4: Get Your Public Key

1. In the EmailJS dashboard, go to **Account** → **General**
2. **Copy your Public Key**

## Step 5: Update Your Code

Open `components/PinLockScreen.tsx` and find these lines (around line 94-102):

```typescript
await emailjs.send(
    'YOUR_SERVICE_ID',     // Replace with your EmailJS service ID
    'YOUR_TEMPLATE_ID',    // Replace with your EmailJS template ID
    {
        to_email: email,
        to_name: email.split('@')[0],
        recovery_code: code,
    },
    'YOUR_PUBLIC_KEY'      // Replace with your EmailJS public key
);
```

Replace:
- `'YOUR_SERVICE_ID'` with your actual Service ID (e.g., `'service_abc123'`)
- `'YOUR_TEMPLATE_ID'` with your actual Template ID (e.g., `'template_xyz789'`)
- `'YOUR_PUBLIC_KEY'` with your actual Public Key (e.g., `'user_123456789'`)

## Step 6: Test It Out!

1. Set up a PIN in Settings with your email address
2. Lock the app
3. Click "Forgot PIN?"
4. Enter your email
5. Check your inbox for the recovery code
6. Enter the code and set a new PIN

## Troubleshooting

### Email not arriving?
- Check your spam folder
- Verify your EmailJS service is properly connected
- Check the EmailJS dashboard for failed sends
- Make sure the email address in UserProfile matches the one you're entering

### Error messages?
- Check the browser console for detailed error messages
- Verify all three IDs are correct in PinLockScreen.tsx
- Make sure you're using the public key, not the private key

### Recovery code expired?
- Codes expire after 15 minutes for security
- Simply request a new code

## Security Notes

- Recovery codes are 6 digits and expire after 15 minutes
- Codes are stored locally only (not sent to any server)
- If email doesn't match the one on file, reset will be rejected
- Users must enter email when setting up PIN for recovery to work

## Need Help?

Check EmailJS documentation: https://www.emailjs.com/docs/
