<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1d0vy4Dl1AlhdXPkKKPRr0JM7MRSOiLNC

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```bash
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

**Note:** When running locally, the weekly summary feature will not work because it requires a deployed serverless function. All other features (daily entries, onboarding, etc.) will work fine.

## Deploy to Vercel

**Prerequisites:** Vercel account connected to your GitHub repository

### Initial Setup

1. Push your code to GitHub
2. Import your repository in Vercel
3. Vercel will automatically detect this as a Vite app

### Configure Environment Variables (CRITICAL for weekly summaries!)

The app requires **two environment variables**:

1. **For client-side features** (daily entries, onboarding, final summary):
   - Name: `VITE_GEMINI_API_KEY`
   - Value: Your Gemini API key

2. **For serverless API** (weekly summaries):
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key (same key)

**To add these in Vercel:**

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add both variables:
   - Add `VITE_GEMINI_API_KEY` = your key
   - Add `GEMINI_API_KEY` = your key
4. Select all environments (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your app (Deployments tab → click ⋯ → Redeploy)

### Get a Gemini API Key

1. Visit https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and use it for both environment variables above

### Verify Deployment

After deployment, test the weekly summary feature:
- Journal for 7 days
- On day 7, you should see a "Generate Weekly Summary" button
- If you see "Error generating summary", check that `GEMINI_API_KEY` is set in Vercel
