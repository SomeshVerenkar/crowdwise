# 🚀 Deploy CrowdWise to crowdwise.in - Zero Cost Guide

**Domain:** crowdwise.in  
**Total Cost:** ₹0/month  
**Time Required:** 30-45 minutes

---

## 🎯 Best FREE Hosting Options for crowdwise.in

### **Option 1: Netlify + Render (RECOMMENDED - Easiest)**

#### ✅ Why This Combo:
- **Netlify**: Frontend (100GB bandwidth/month FREE)
- **Render**: Backend API (750 hours/month FREE)
- Both have automatic SSL
- Auto-deploy from Git
- No credit card required

---

## 📦 Step 1: Prepare Your Code (5 minutes)

### A. Create Git Repository

```bash
# Navigate to your project
cd C:\WheelocityDashboards\tourist-crowd-tracker

# Initialize Git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Production ready - crowdwise.in"

# Create GitHub repo and push
# Go to github.com → New Repository → "crowdwise"
git remote add origin https://github.com/YOUR_USERNAME/crowdwise.git
git branch -M main
git push -u origin main
```

### B. Update Google Analytics ID

1. Go to https://analytics.google.com
2. Create property: "CrowdWise.in"
3. Copy Measurement ID (e.g., `G-ABC123XYZ`)
4. Update in `index.html` line 40-44:
   - Replace `G-XXXXXXXXXX` with your real ID

---

## 🌐 Step 2: Deploy Frontend to Netlify (10 minutes)

### A. Sign Up & Deploy

1. **Go to:** https://app.netlify.com/signup
2. **Sign up** with GitHub (free account)
3. Click **"Add new site"** → **"Import an existing project"**
4. Connect to GitHub → Select `crowdwise` repository
5. **Configure build settings:**
   - Build command: (leave empty)
   - Publish directory: `.` (root)
   - Click **"Deploy site"**

### B. Configure Custom Domain

1. After deployment, go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `crowdwise.in`
4. Netlify will show DNS records

### C. Update DNS at Your Registrar

Go to your domain registrar (GoDaddy/Namecheap/etc) and add:

**A Record:**
```
Type: A
Name: @
Value: 75.2.60.5
TTL: 3600
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: YOUR-SITE-NAME.netlify.app
TTL: 3600
```

**For API subdomain:**
```
Type: CNAME
Name: api
Value: YOUR-BACKEND-APP.onrender.com (we'll get this in next step)
TTL: 3600
```

Wait 15-30 minutes for DNS propagation.

---

## 🔧 Step 3: Deploy Backend to Render (15 minutes)

### A. Prepare Backend for Deployment

Create `backend/package.json` if you don't have one:

```json
{
  "name": "crowdwise-backend",
  "version": "2.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "node-fetch": "^2.6.7",
    "node-cron": "^3.0.3",
    "nodemailer": "^6.9.8",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### B. Push Backend Separately (Optional - Mono-repo approach)

Actually, Render can deploy from a subfolder! Just push everything.

### C. Deploy to Render

1. **Go to:** https://render.com/
2. **Sign up** with GitHub (free)
3. Click **"New +"** → **"Web Service"**
4. Connect GitHub → Select `crowdwise` repository
5. **Configure:**
   - Name: `crowdwise-api`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free** (750 hours/month)

6. **Add Environment Variables:**
   Click "Environment" tab and add:
   ```
   NODE_ENV=production
   PORT=3002
   OPENWEATHER_API_KEY=bb862ba4c130cfa3b60af919266dbdd4
   FRONTEND_URL=https://crowdwise.in
   ```

7. Click **"Create Web Service"**

### D. Get Your API URL

After deployment completes, Render gives you:
```
https://crowdwise-api.onrender.com
```

Copy this URL!

### E. Update DNS for api.crowdwise.in

Go back to your domain registrar:

```
Type: CNAME
Name: api
Value: crowdwise-api.onrender.com
TTL: 3600
```

---

## ⚡ Step 4: Enable CORS on Backend (5 minutes)

Update `backend/server.js` to allow your domain:

```javascript
// Replace the CORS line
app.use(cors({
    origin: [
        'http://localhost:8080',
        'https://crowdwise.in',
        'https://www.crowdwise.in'
    ],
    credentials: true
}));
```

Commit and push:
```bash
git add backend/server.js
git commit -m "Update CORS for crowdwise.in"
git push
```

Render will auto-deploy the update.

---

## 🧪 Step 5: Test Production Site (5 minutes)

### A. Wait for DNS Propagation

Check if your domain is ready:
```bash
# In PowerShell
nslookup crowdwise.in
nslookup api.crowdwise.in
```

Should show your Netlify/Render IPs.

### B. Test Website

1. Visit: https://crowdwise.in
2. Check:
   - ✅ All 25 destinations load
   - ✅ Search works
   - ✅ Click a destination → details modal opens
   - ✅ Set Alert → should work (check browser console for API calls)
   - ✅ Feedback widget appears after 5 seconds
   - ✅ Mobile responsive

### C. Check API

Test your backend:
```
https://api.crowdwise.in/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-01-23T..."
}
```

---

## 🎯 Step 6: Start Data Scheduler (2 minutes)

Activate automatic data collection:

```bash
# In PowerShell
curl -X POST https://api.crowdwise.in/api/scheduler/start
```

This starts cron jobs to collect data every 2-6 hours.

---

## 📊 Step 7: Setup Google Search Console (5 minutes)

### A. Verify Ownership

1. Go to: https://search.google.com/search-console
2. Add property: `crowdwise.in`
3. Verify via DNS TXT record or HTML file upload

### B. Submit Sitemap

1. In Search Console, go to **Sitemaps**
2. Enter: `https://crowdwise.in/sitemap.xml`
3. Click **Submit**

Google will start indexing your site within 24-48 hours.

---

## ✅ Final Checklist

Before announcing:

- [ ] Domain resolves: `crowdwise.in` → Netlify
- [ ] API subdomain resolves: `api.crowdwise.in` → Render
- [ ] SSL certificates active (both show 🔒 in browser)
- [ ] All 25 destinations display correctly
- [ ] Search functionality works
- [ ] Alerts can be created
- [ ] Feedback widget appears
- [ ] Google Analytics tracking (check Real-Time)
- [ ] Sitemap submitted to Google
- [ ] No console errors in browser
- [ ] Mobile responsive (test on phone)
- [ ] Backend scheduler running

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| **Netlify** | Free (100GB/month) | ₹0 |
| **Render** | Free (750hrs/month) | ₹0 |
| **Domain** | Yearly renewal | Already owned |
| **SSL** | Auto (Let's Encrypt) | ₹0 |
| **APIs** | Free tiers | ₹0 |
| **Total** | | **₹0/month** ✅ |

---

## 🚨 Render Free Tier Limitation

**Important:** Render free tier sleeps after 15 minutes of inactivity.

**Solution 1:** Use UptimeRobot (free) to ping your API every 5 minutes:
- Sign up: https://uptimerobot.com
- Add monitor: `https://api.crowdwise.in/health`
- Check interval: 5 minutes

**Solution 2:** Upgrade to Render paid plan ($7/month) for always-on

---

## 🎉 You're Live!

Your website is now accessible at:
- 🌐 **Frontend:** https://crowdwise.in
- 🔧 **API:** https://api.crowdwise.in
- 📊 **Analytics:** https://analytics.google.com

---

## 📈 Post-Launch Actions

### Week 1:
1. Monitor Analytics daily
2. Share on social media:
   - Twitter/X
   - Reddit: r/IndiaTravel, r/travel, r/backpacking
   - Facebook travel groups
3. Submit to directories:
   - ProductHunt
   - Indie Hackers
   - Travel websites

### Week 2-4:
1. Write blog post: "How to avoid crowds at Indian tourist spots"
2. Create Instagram reels showing crowd levels
3. Reach out to travel bloggers
4. Create YouTube video demo

### Month 2+:
1. Collect user feedback
2. Improve accuracy based on data
3. Add requested features
4. Consider monetization (ads, premium)

---

## 🆘 Troubleshooting

### Issue: Site not loading
- Check DNS with `nslookup crowdwise.in`
- Wait 30 mins for DNS propagation
- Clear browser cache

### Issue: API not connecting
- Check CORS settings in backend
- Verify `api.crowdwise.in` resolves correctly
- Check Render logs for errors

### Issue: Analytics not tracking
- Verify Google Analytics ID in index.html
- Check browser console for gtag errors
- Wait 24 hours for data to appear

---

## 🎯 Expected Traffic Growth

| Timeline | Visitors/Month | Source |
|----------|----------------|--------|
| Week 1 | 50-100 | Testing, friends |
| Month 1 | 500-1K | Social media shares |
| Month 3 | 2K-5K | Google organic search |
| Month 6 | 10K+ | Ranking + word of mouth |

---

**Ready to deploy? Let's do this! 🚀**

Any questions during deployment, just ask!
