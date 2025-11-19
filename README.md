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

## Development Workflow with Google AI Studio

This project uses a two-repository workflow:

1. **AI Studio Repository** (`studio` remote) - Connected to Google AI Studio for rapid prototyping
2. **Production Repository** (`origin` remote) - Connected to Vercel for deployment

### Current Workflow

```bash
# Check your remotes
git remote -v

# Should show:
# origin    https://github.com/Muteyitsi-domsy/90-Day-Reset.git
# studio    <your-studio-repo-url>
```

### Syncing Changes from AI Studio

When you make changes in Google AI Studio, they're automatically pushed to the `studio` remote. To bring them into production:

```bash
# 1. Fetch changes from studio
git fetch studio

# 2. Review what changed
git log main..studio/main --oneline

# 3. Merge studio changes into your local main
git checkout main
git merge studio/main

# 4. Test locally
npm run dev

# 5. Push to production (triggers Vercel deployment)
git push origin main
```

### Recommended: Streamlined Single-Repo Workflow

To eliminate the double-work, consider one of these approaches:

#### Option A: Make AI Studio push directly to origin (Recommended)
1. In Google AI Studio settings, change the connected repository to your main production repo
2. Set up branch protection on `main` to require pull requests
3. AI Studio pushes to a feature branch like `ai-studio-updates`
4. You review and merge via PR

#### Option B: Use GitHub Actions for Auto-Sync
Create `.github/workflows/sync-studio.yml`:

```yaml
name: Sync from AI Studio
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Add studio remote
        run: git remote add studio <your-studio-repo-url>

      - name: Fetch and merge
        run: |
          git fetch studio
          git merge studio/main --no-edit

      - name: Push to main
        run: git push origin main
```

#### Option C: Use Git Hooks for Auto-Push
Create a post-receive hook that automatically pushes studio changes to origin.

### Working with Prompts

Daily prompts are managed in `services/promptGenerator.ts`. The system includes:
- **Anti-repetition logic**: Tracks last 5 prompts to avoid duplicates
- **Persistent rotation**: Uses localStorage to maintain state across sessions
- **Arc-based prompts**: Different prompt sets for healing, unstuck, and healed arcs
- **Month-based progression**: Prompts evolve as users progress through their 90-day journey

To modify prompts, edit the `PROMPTS` object in `promptGenerator.ts`.
