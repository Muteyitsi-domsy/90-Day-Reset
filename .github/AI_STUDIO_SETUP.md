# Google AI Studio Configuration Guide

This guide will help you configure Google AI Studio to push changes to a dedicated branch, eliminating the double-repo workflow.

## Overview

Instead of:
- AI Studio → Studio Repo → Manual Merge → Production Repo → Vercel

We'll have:
- AI Studio → Production Repo (`ai-studio-updates` branch) → PR Review → `main` → Vercel

## Setup Steps

### 1. Configure AI Studio Repository Settings

1. Go to your Google AI Studio project
2. Navigate to **Settings** or **Repository Settings**
3. Update the connected repository:
   - **Repository URL**: `https://github.com/Muteyitsi-domsy/90-Day-Reset.git`
   - **Branch**: `ai-studio-updates` (instead of `main`)

### 2. Set Up Branch Protection on GitHub (Important!)

1. Go to your GitHub repository: https://github.com/Muteyitsi-domsy/90-Day-Reset
2. Click **Settings** → **Branches**
3. Under "Branch protection rules", click **Add rule**
4. Configure the rule:
   - **Branch name pattern**: `main`
   - ✅ Check: **Require a pull request before merging**
   - ✅ Check: **Require approvals** (optional, set to 1 if you want formal review)
   - Click **Create** or **Save changes**

This ensures no one (including AI Studio) can push directly to `main`.

### 3. Test the New Workflow

1. Make a small change in Google AI Studio (e.g., add a comment or adjust a prompt)
2. AI Studio will push to the `ai-studio-updates` branch
3. You'll see a notification on GitHub to create a pull request
4. Review the changes in the PR
5. Merge the PR to `main`
6. Vercel automatically deploys the changes

## Daily Workflow

### When AI Studio Makes Changes:

```bash
# 1. Check for new changes
git fetch origin

# 2. See what changed
git log main..origin/ai-studio-updates --oneline
git diff main..origin/ai-studio-updates

# 3. Create PR via GitHub web UI (or use gh CLI)
gh pr create --base main --head ai-studio-updates --title "AI Studio updates" --body "Changes from Google AI Studio"

# 4. Review and merge the PR on GitHub
```

### Using GitHub CLI (Optional but Faster)

If you have `gh` CLI installed:

```bash
# Create PR directly from command line
gh pr create --base main --head ai-studio-updates --title "AI Studio: [describe changes]"

# View PR
gh pr view

# Merge PR
gh pr merge --merge
```

## Troubleshooting

### AI Studio Still Pushing to Old Repo

If AI Studio can't be reconfigured to point to the new repo:
1. Update the old studio repo's settings to push to this repo
2. Set up a webhook or GitHub Action to auto-sync
3. See README.md for GitHub Actions alternative (Option B)

### Can't Find Repository Settings in AI Studio

The location varies, but typically found at:
- Project Settings → Git Integration
- Project Settings → GitHub Connection
- Settings → Connected Repository

Look for options to change:
- Repository URL
- Default branch
- Push settings

### Need to Unlink Old Repository

If you need to disconnect the old repo but AI Studio won't let you:
1. Contact Google AI Studio support
2. Or: Use the GitHub Actions auto-sync as a workaround (see README Option B)

## Benefits of This Setup

✅ **Single source of truth** - Production repo is the main repo
✅ **Review before deploy** - All AI Studio changes go through PR review
✅ **Automatic deployment** - Merging to `main` triggers Vercel deploy
✅ **Clean git history** - No more manual merge commits
✅ **Rollback capability** - Easy to revert bad changes via PR

## Next Steps

After setup is complete:
1. Delete or archive the old studio repository
2. Update any documentation referencing the old workflow
3. Test the workflow with a small change
