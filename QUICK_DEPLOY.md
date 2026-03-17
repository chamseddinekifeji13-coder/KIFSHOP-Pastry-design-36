# 🚀 KIFSHOP Cash Register - Quick Deploy Guide

## ⏱️ 5-Minute Quick Start

### Prerequisites
- Git repository connected to GitHub
- Vercel account (free at vercel.com)
- Supabase account (free at supabase.com)

---

## Step 1: Get Supabase Keys (2 min)

1. Go to **[supabase.com](https://supabase.com)**
2. Create new project (or use existing)
3. Go to **Settings → API**
4. Copy these 3 values:
   - `Project URL` → Save as `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → Save as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → Save as `SUPABASE_SERVICE_ROLE_KEY`

### Generate CRON_SECRET (30 seconds)

Run this in terminal:
```bash
openssl rand -base64 32
```
Save the output → This is your `CRON_SECRET`

---

## Step 2: Deploy to Vercel (2 min)

### Via GitHub (Easiest)
1. Go to **[vercel.com/new](https://vercel.com/new)**
2. **Click "Import Git Repository"**
3. Select your **KIFSHOP repository**
4. **Framework:** Should auto-detect Next.js ✅
5. **Click "Deploy"** (takes ~1-2 min)

---

## Step 3: Add Environment Variables (1 min)

After deployment shows "Congratulations":

1. Go to **Vercel Dashboard → Your Project**
2. Click **Settings → Environment Variables**
3. **Add these 4 variables:**

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `CRON_SECRET` | Your generated secret |

4. **Click "Add"** for each one
5. Environment variables apply automatically to future deployments

---

## Step 4: Redeploy with Env Vars (30 seconds)

1. Go to **Deployments** tab
2. Click the **"..."** menu on latest deployment
3. Select **"Redeploy"**
4. Wait for build to complete (~1-2 min)

---

## Step 5: Test Your Deployment (1 min)

Once deployed, visit:
```
https://your-project.vercel.app
```

You should see:
- ✅ Dashboard with "KIFSHOP" title
- ✅ Status indicators showing "Connectée"
- ✅ Links to Cash Register, Stock, Reports
- ✅ No console errors

### Verify API Health Check:
```
https://your-project.vercel.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## 🎉 Done! Your App is Live!

Your KIFSHOP Cash Register is now deployed and accessible:
```
https://your-project.vercel.app
```

---

## 🔧 Troubleshooting

### "Build Failed"
❌ Check build logs in Vercel dashboard  
✅ Ensure all environment variables are set  
✅ Ensure package.json has no errors

### "Page Shows Error"
❌ Check browser console for errors  
✅ Verify environment variables are correct  
✅ Ensure Supabase project is active

### "API Returns 401"
❌ This is expected without proper auth setup  
✅ Health check should still return 200

### "Cron Job Not Running"
❌ Check that `CRON_SECRET` is set  
✅ Verify vercel.json has cron configuration  
✅ Check Function logs in Vercel

---

## 📚 Next Steps

- [ ] Configure Supabase database (run migration scripts)
- [ ] Set up authentication with Supabase Auth
- [ ] Test POS80 integration
- [ ] Configure printer settings
- [ ] Train staff on system

---

## 📞 Need Help?

- **Build Issues?** Check Vercel build logs
- **Database Issues?** Check Supabase dashboard
- **Code Issues?** Check browser console (F12)
- **Deployment Issues?** Read DEPLOYMENT_STATUS.md

---

## Quick Links

- 📘 Full Docs: `README.md`
- 🏗️ Architecture: `DEPLOYMENT_STATUS.md`
- ⚙️ Env Template: `.env.example`
- 🔐 Config: `vercel.json`

**Good luck! 🚀**
