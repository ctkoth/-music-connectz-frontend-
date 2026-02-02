# 🚀 Deploy Music ConnectZ to Cloudflare Pages

## Step 1: Push to GitHub

```powershell
cd "c:\Users\ctkot\OneDrive\Documents\music connectz"
git add .
git commit -m "Prepare for Cloudflare Pages deployment"
git push origin main
```

## Step 2: Deploy to Cloudflare Pages

1. Go to https://pages.cloudflare.com/
2. Click "Create a project"
3. Click "Connect to Git"
4. Select your GitHub repo: `music-connectz-frontend`
5. **Build settings:**
   - Build command: (leave blank)
   - Build output directory: `/`
   - Root directory: `/`
6. Click "Save and Deploy"

## Step 3: Add Custom Domain

1. After deploy completes, go to "Custom domains"
2. Click "Set up a custom domain"
3. Enter: `musicconnectz.com`
4. Follow DNS instructions from Cloudflare
5. Wait 5-10 minutes for SSL certificate

## Step 4: Update Backend URL (when ready)

Edit `stripe-config.js`:
```javascript
let backendUrl = 'https://api.musicconnectz.com';
```

## ✅ Current Stack

- **Frontend:** Cloudflare Pages (free, unlimited bandwidth)
- **Backend:** Currently on Vercel → migrate to Render when ready
- **Database:** Add Supabase when needed
- **Cost:** $0.75/mo (just domain)

## Next Steps

1. Deploy backend to Render: https://render.com/
2. Create Supabase DB: https://supabase.com/
3. Set up `api.musicconnectz.com` CNAME to Render
