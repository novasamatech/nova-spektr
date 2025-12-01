# Cloudflare Workers PR Preview Deployment Guide

This guide explains how to set up and use Cloudflare Workers for automatic PR preview deployments of the Nova Spektr renderer application.

## Overview

The PR preview system automatically builds and deploys the renderer application to Cloudflare Workers whenever a pull request is opened or updated. This allows developers and reviewers to test changes in a live environment before merging.

### Architecture

- **Build Process**: The GitHub Actions workflow builds the renderer using `pnpm build:staging`
- **Deployment**: Static assets are deployed to Cloudflare Workers using Wrangler CLI
- **Serving**: A Cloudflare Worker serves the static files with proper caching and security headers
- **URL Format**: Each PR gets a unique URL: `https://nova-spektr-pr-{PR_NUMBER}.{account-subdomain}.workers.dev`

### Benefits

- **Fast Global CDN**: Cloudflare's edge network ensures low latency worldwide
- **Automatic Updates**: Preview URLs update automatically when new commits are pushed
- **No Infrastructure Management**: Fully serverless, no servers to maintain
- **Cost Effective**: Free tier includes generous limits for development use

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://www.cloudflare.com/)
2. **Wrangler CLI**: Install globally or use via GitHub Actions (already configured)
3. **GitHub Repository Access**: Ability to add secrets to the repository

## Initial Setup

### Step 1: Create Cloudflare Account and Get API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use the **Edit Cloudflare Workers** template or create a custom token with:
   - **Account** → **Cloudflare Workers** → **Edit**
   - **Zone** → **Zone Settings** → **Read** (if using custom domain)
5. Copy the API token (you'll need it for GitHub secrets)

### Step 2: Get Your Account ID

1. In Cloudflare Dashboard, select your account
2. The Account ID is visible in the right sidebar
3. Copy the Account ID

### Step 3: Get Your Account Subdomain (Optional)

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Your account subdomain is shown (e.g., `your-account.workers.dev`)
3. This is used to construct preview URLs

### Step 4: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

   - **`CLOUDFLARE_API_TOKEN`**: The API token from Step 1
   - **`CLOUDFLARE_ACCOUNT_ID`**: The Account ID from Step 2
   - **`CLOUDFLARE_ACCOUNT_SUBDOMAIN`** (optional): Your account subdomain for prettier URLs

### Step 5: Verify Configuration

The workflow is configured in `.github/workflows/pr-preview-workers.yml`. It will:

1. Trigger on pull request events (opened, synchronize, reopened)
2. Build the renderer with staging configuration
3. Deploy to Cloudflare Workers with a PR-specific name
4. Comment on the PR with the preview URL

## How It Works

### Build Process

The workflow runs the following steps:

```bash
pnpm clean:build          # Clean previous builds
pnpm renderer:staging     # Build renderer with staging config
pnpm postbuild:staging    # Run post-build scripts
```

The build output is placed in `release/build/` directory, which contains:
- `index.html` - Main HTML file
- JavaScript bundles (`.js`, `.mjs`)
- CSS files
- Static assets (images, fonts, etc.)

### Deployment Process

1. **Wrangler Deployment**: Uses `wrangler deploy` command with:
   - Environment: `preview` (from `wrangler.toml`)
   - Worker name: `nova-spektr-pr-{PR_NUMBER}`
   - Static assets: Served from `release/build/` directory

2. **Worker Configuration**: The worker (`workers/index.ts`) handles:
   - Serving static files with correct MIME types
   - SPA routing (serves `index.html` for non-file paths)
   - Security headers (CSP, X-Frame-Options, etc.)
   - Caching headers (aggressive caching for static assets)

### URL Structure

Each PR gets a unique deployment:
- **Worker URL**: `https://nova-spektr-pr-{PR_NUMBER}.{account-subdomain}.workers.dev`
- The URL is automatically commented on the PR after successful deployment

## Configuration Files

### `wrangler.toml`

Main configuration file for Cloudflare Workers:

```toml
name = "nova-spektr-pr-preview"
main = "workers/index.ts"
compatibility_date = "2024-01-01"

[env.preview]
name = "nova-spektr-pr-preview"
[site]
bucket = "./release/build"
```

Key settings:
- **`name`**: Base name for workers
- **`main`**: Entry point for the worker script
- **`[env.preview]`**: Preview environment configuration
- **`[site]`**: Static assets directory

### `workers/index.ts`

The Worker script that serves static files. Key features:

- **Path Resolution**: Handles SPA routing by serving `index.html` for non-file requests
- **MIME Types**: Automatically sets correct Content-Type headers
- **Caching**: Aggressive caching for static assets, shorter TTL for HTML
- **Security**: Adds security headers to all responses
- **CORS**: Allows cross-origin requests if needed

**Note**: The worker uses the `ASSETS` binding which is automatically created when using `[site]` in `wrangler.toml`. If you encounter issues with the `ASSETS` binding, you may need to:
1. Use Cloudflare Pages instead (recommended for static sites): `wrangler pages deploy release/build`
2. Use R2 storage for assets and update the worker accordingly
3. Verify Wrangler version compatibility (v3+ recommended)

## Usage

### Automatic Deployment

The workflow runs automatically when:
- A new pull request is opened
- New commits are pushed to an existing PR
- A PR is reopened

### Manual Deployment

You can also trigger the workflow manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy PR Preview to Cloudflare Workers**
3. Click **Run workflow**

### Testing Locally

To test the worker locally before deploying:

```bash
# Install Wrangler CLI (if not already installed)
npm install -g wrangler

# Build the renderer
pnpm build:staging

# Run worker locally
wrangler dev --env preview
```

The worker will be available at `http://localhost:8787` (or the port shown in the output).

## Maintenance

### Cleaning Up Old Deployments

Old PR preview deployments are not automatically deleted. To clean up:

1. Go to Cloudflare Dashboard → **Workers & Pages**
2. Find workers named `nova-spektr-pr-*`
3. Delete workers for closed/merged PRs manually

**Future Enhancement**: Consider adding a cleanup workflow that runs on PR close/merge.

### Monitoring

- **Cloudflare Dashboard**: View worker analytics, logs, and errors
- **GitHub Actions**: Check workflow runs for deployment status
- **PR Comments**: Preview URLs are automatically posted to PRs

### Troubleshooting

#### Build Fails

**Issue**: Build step fails in GitHub Actions

**Solutions**:
- Check build logs for specific errors
- Verify `CHAINS_FILE` and `TOKENS_FILE` environment variables
- Ensure all dependencies are installed correctly

#### Deployment Fails

**Issue**: Wrangler deployment fails

**Solutions**:
- Verify `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are set
- Check API token has correct permissions
- Ensure account has available Workers quota

#### Preview URL Not Working

**Issue**: Preview URL returns 404 or error

**Solutions**:
- Wait a few minutes for deployment to propagate
- Check Cloudflare Dashboard for worker status
- Verify the worker name matches the PR number
- Check worker logs in Cloudflare Dashboard

#### Assets Not Loading

**Issue**: Page loads but assets (CSS, JS, images) are missing

**Solutions**:
- Verify `release/build` directory contains all assets
- Check worker logs for 404 errors
- Ensure base path is correctly configured (should be empty `base: ''`)
- Verify MIME types are set correctly in `workers/index.ts`

#### SPA Routing Not Working

**Issue**: Direct navigation to routes returns 404

**Solutions**:
- Verify the worker serves `index.html` for non-file requests
- Check that HashRouter is being used (it should work with any base path)
- Test with `wrangler dev` locally to debug routing

## Best Practices

### Security

- **API Tokens**: Store tokens as GitHub secrets, never commit to repository
- **CORS**: Configure CORS headers appropriately for your use case
- **CSP**: Consider adding Content Security Policy headers if needed
- **Rate Limiting**: Cloudflare automatically provides DDoS protection

### Performance

- **Caching**: Static assets are cached aggressively (1 year)
- **CDN**: Cloudflare's global network ensures fast delivery
- **Compression**: Enable compression in `vite.config.renderer.ts` for production builds

### Cost Optimization

- **Free Tier**: Cloudflare Workers free tier includes:
  - 100,000 requests per day
  - 10ms CPU time per request
- **Monitoring**: Keep an eye on usage in Cloudflare Dashboard
- **Cleanup**: Regularly delete old PR preview deployments

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. Add domain to Cloudflare
2. Update `wrangler.toml` with route configuration:
   ```toml
   [env.preview]
   routes = [
     { pattern = "preview.yourdomain.com", zone_name = "yourdomain.com" }
   ]
   ```

### Environment Variables

To add environment variables:

1. Update `wrangler.toml`:
   ```toml
   [env.preview.vars]
   MY_VAR = "value"
   ```

2. Or use secrets:
   ```bash
   wrangler secret put MY_SECRET --env preview
   ```

### KV Storage (Optional)

For storing deployment metadata:

1. Create KV namespace:
   ```bash
   wrangler kv:namespace create "PR_DEPLOYMENTS" --env preview
   ```

2. Update `wrangler.toml` with the namespace ID

3. Use in worker code:
   ```typescript
   await env.PR_DEPLOYMENTS.put(key, value);
   ```

### R2 Storage (Optional)

For larger assets or file storage:

1. Create R2 bucket:
   ```bash
   wrangler r2 bucket create pr-preview-assets
   ```

2. Update `wrangler.toml` with bucket binding

3. Use in worker code:
   ```typescript
   const object = await env.PR_ASSETS.get(key);
   ```

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers Examples](https://github.com/cloudflare/workers-examples)
- [GitHub Actions for Cloudflare](https://github.com/cloudflare/wrangler-action)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Cloudflare Workers documentation
3. Check GitHub Actions workflow logs
4. Contact the development team

