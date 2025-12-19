# Vertex AI Setup Guide

This guide will help you migrate from the Gemini API to Vertex AI to eliminate quota restrictions and implement better cost controls.

## Why Vertex AI?

- **No quota limits**: Unlike the free Gemini API which has strict quotas (15 RPM), Vertex AI provides unlimited access
- **Pay-as-you-go**: Only pay for what you use (~$0.00001875 per 1K input tokens, ~$0.000075 per 1K output tokens)
- **Built-in cost protection**: Rate limiting (50 requests/user/day) and monthly budget cap ($100/month)
- **Better reliability**: Enterprise-grade infrastructure with higher availability

## Prerequisites

- Google Cloud account
- Billing enabled on your Google Cloud project
- Node.js installed locally

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your **Project ID** (you'll need this later)

## Step 2: Enable Vertex AI API

1. In Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Vertex AI API"
3. Click **Enable**

## Step 3: Create Service Account

1. Navigate to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Enter details:
   - Name: `vertex-ai-service-account`
   - Description: `Service account for Vertex AI API access`
4. Click **Create and Continue**
5. Grant the following role:
   - **Vertex AI User** (roles/aiplatform.user)
6. Click **Continue** then **Done**

## Step 4: Create Service Account Key

1. Find your newly created service account in the list
2. Click the three dots (⋮) > **Manage keys**
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create**
6. A JSON file will download - **keep this secure!**

## Step 5: Configure Environment Variables

### For Local Development:

Create a `.env.local` file in your project root:

```env
# Vertex AI Configuration
VITE_USE_VERTEX_AI=true
VITE_VERTEX_API_URL=/api/vertex-ai

# Vercel Serverless Function Environment Variables (add these to Vercel)
VERTEX_PROJECT_ID=your-project-id
VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

**Important**: The `GOOGLE_APPLICATION_CREDENTIALS_JSON` should contain the entire contents of the JSON key file you downloaded in Step 4, minified to a single line.

### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `VERTEX_PROJECT_ID` | your-project-id | Your Google Cloud Project ID |
| `VERTEX_LOCATION` | us-central1 | Vertex AI region (or your preferred region) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | {...} | Full JSON key content (minified) |

4. Add these to your `.env.local` for the frontend:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `VITE_USE_VERTEX_AI` | true | Enable Vertex AI (set to false to use Gemini API) |
| `VITE_VERTEX_API_URL` | /api/vertex-ai | Path to your Vercel serverless function |

## Step 6: Enable Billing (Required)

1. Navigate to **Billing** in Google Cloud Console
2. Link a billing account to your project
3. Set up budget alerts (recommended):
   - Go to **Billing** > **Budgets & alerts**
   - Create a budget (e.g., $100/month)
   - Set alerts at 50%, 90%, and 100%

**Note**: The code has a hard cap at $100/month to prevent runaway costs, but you should also set up Google Cloud budget alerts as an additional safety measure.

## Step 7: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try creating a journal entry or generating a summary

3. Check the browser console for logs like:
   ```
   {
     requestType: 'analysis',
     userId: 'user-123',
     inputTokens: 234,
     outputTokens: 145,
     cost: '0.000015',
     monthlySpend: '0.02',
     responseTime: '1234ms',
     model: 'gemini-1.5-flash'
   }
   ```

## Cost Optimization Tips

### Built-in Protections:

- **Rate Limiting**: 50 AI requests per user per day (resets at midnight)
- **Monthly Cap**: $100 total spending per month
- **Smart Model Selection**: Flash model for most requests, Pro model only for complex summaries

### Additional Recommendations:

1. **Enable Caching**: The app already caches AI responses to avoid duplicate requests
2. **Monitor Usage**: Check the Vertex AI console regularly for usage patterns
3. **Set Lower Caps**: Edit `MAX_COST_PER_MONTH` in `api/vertex-ai.ts` to a lower value if needed
4. **Disable Auto-Analysis**: Users can turn off automatic journal analysis in settings

## Cost Estimates

Based on typical usage patterns:

- **Per journal entry analysis**: ~$0.000015 (1.5¢ per 1000 entries)
- **Per weekly summary**: ~$0.00003 (3¢ per 1000 summaries)
- **Per final summary**: ~$0.00008 (8¢ per 1000 summaries)

**Example**: A user completing a full 90-day journey with daily entries:
- 90 journal analyses: ~$0.00135
- 12 weekly summaries: ~$0.00036
- 3 monthly summaries: ~$0.00009
- 1 final summary: ~$0.00008
- **Total per user**: ~$0.00188 (~$0.19 per 100 users)

## Troubleshooting

### Error: "Authentication failed"
- Verify your `GOOGLE_APPLICATION_CREDENTIALS_JSON` is correct
- Ensure the service account has "Vertex AI User" role
- Check that the JSON is properly minified (no line breaks)

### Error: "Daily limit reached"
- User has exceeded 50 requests/day
- Wait until midnight UTC for reset
- Or increase `DAILY_LIMIT_PER_USER` in `api/vertex-ai.ts`

### Error: "Service temporarily unavailable"
- Monthly budget cap has been reached
- Check current spend in logs
- Wait until next month or increase `MAX_COST_PER_MONTH`

### API calls still using Gemini
- Verify `VITE_USE_VERTEX_AI=true` in your `.env.local`
- Clear your build cache: `npm run build`
- Check browser console for feature flag status

## Rollback to Gemini API

If you need to switch back to the Gemini API:

1. Set `VITE_USE_VERTEX_AI=false` in your `.env.local`
2. Ensure `VITE_GEMINI_API_KEY` is set
3. Rebuild and restart your app

The app will automatically fall back to Gemini API with rate limiting.

## Monitoring Costs

### Check Vertex AI Usage:

1. Go to [Vertex AI Console](https://console.cloud.google.com/vertex-ai)
2. Navigate to **Usage** to see request counts and costs
3. Review **Quotas** to ensure you're within limits

### Check Application Logs:

The serverless function logs cost information for every request. In Vercel:

1. Go to your project dashboard
2. Navigate to **Deployments** > Select deployment > **Functions**
3. Click on the `/api/vertex-ai` function
4. View logs to see per-request cost tracking

## Security Best Practices

1. **Never commit service account keys**: Add `*.json` to `.gitignore`
2. **Use environment variables**: Store credentials only in environment variables
3. **Rotate keys regularly**: Generate new service account keys every 90 days
4. **Limit permissions**: Service account should only have "Vertex AI User" role
5. **Enable audit logging**: Track who's using your API in Google Cloud Console

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Review Vercel function logs
3. Verify all environment variables are set correctly
4. Ensure billing is enabled on your Google Cloud project
5. Check Vertex AI API quota limits in Google Cloud Console

## Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Pricing](https://cloud.google.com/vertex-ai/pricing)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
