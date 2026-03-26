# How to Set Up Secrets in Vercel

## Step 1: Get Your Credentials

### From Supabase
1. Go to https://supabase.com/dashboard
2. Select your project → Settings → API
3. Copy these values:
   - **Project URL** (looks like: `https://xxx.supabase.co`)
   - **anon public** (starts with `eyJ`)
   - **service_role secret** (starts with `eyJ`, longer than anon)

### Generate CRON_SECRET
```bash
openssl rand -hex 32
```
Save this value - you'll need it.

---

## Step 2: Add to Vercel

### Option A: Web Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Select your **KIFSHOP-Pastry-design-36** project
3. Click **Settings** (top right)
4. Go to **Environment Variables**
5. Click **Add New**

Fill in for each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | Your Project URL | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key | Production, Preview, Development |
| `CRON_SECRET` | Your generated secret | Production, Preview, Development |
| `QZ_PRIVATE_KEY` | (leave empty for now) | Production, Preview, Development |
| `QZ_CERTIFICATE` | (leave empty for now) | Production, Preview, Development |

6. Click **Save**
7. Done! Redeploy to apply

### Option B: Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Add secrets
vercel env add SUPABASE_SERVICE_ROLE_KEY
# Paste your service role key when prompted

vercel env add CRON_SECRET
# Paste your generated CRON_SECRET when prompted

vercel env add SUPABASE_URL
# Paste your Supabase URL when prompted

# Deploy
vercel deploy --prod
```

---

## Step 3: Verify Setup

After deploying, check that secrets are working:

1. Go to your Vercel deployment
2. Click **Deployments** tab
3. Click the latest deployment
4. Go to **Environment** tab
5. Verify variables are set (but hidden for security)

---

## Step 4: Test in Production

1. Visit your production URL: https://your-domain.vercel.app
2. Open browser DevTools → Network tab
3. Check that API calls to `/api/shop-config` return 200 (not 500)
4. If errors, check Vercel deployment logs

### View Logs
In Vercel Dashboard:
1. Click your project
2. Go to **Deployments**
3. Click latest deployment
4. Click **Logs** tab
5. Look for any errors

---

## Troubleshooting

### "500 Error on /api/shop-config"
- Check if `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Verify keys are correct (copy-paste with no spaces)
- Check Vercel deployment logs

### "Cron job failed"
- Check if `CRON_SECRET` is set
- Verify it matches what you configured
- Check Vercel logs for detailed error

### "Function timed out"
- Database might be slow
- Check Supabase query logs
- Increase timeout in route handler if needed

---

## For Development (Local)

Create `.env.local` in project root:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Never commit this file!** It's already in `.gitignore`.

---

## Security Reminders

✅ DO:
- Treat `SUPABASE_SERVICE_ROLE_KEY` as a password
- Use different keys for dev/staging/prod
- Rotate keys every 6 months
- Check git history if key was exposed

❌ DON'T:
- Share secrets via email or Slack
- Commit `.env.local` to git
- Use same key for all environments
- Log secrets in error messages

---

## Need Help?

- Vercel Docs: https://vercel.com/docs/concepts/projects/environment-variables
- Supabase Docs: https://supabase.com/docs/guides/api
- Project Docs: See `README_SESSION.md`
