# 🚀 Deployment Guide - CrowdWise India

## Quick Deploy (Recommended)

### Option 1: Quick Deploy Script
```powershell
.\deploy-quick.ps1
```
- Fastest method
- Auto-generates commit message
- Just runs and deploys

### Option 2: Deploy with Custom Message
```powershell
.\deploy.ps1 "Fix: Dudhsagar Falls closing time"
```
- Allows custom commit message
- Shows detailed deployment status

---

## Manual Deployment

### Frontend (Netlify)
```powershell
git add .
git commit -m "Your message"
git push origin main
```
Then wait 1-2 minutes for Netlify auto-deploy.

### Backend (If you have separate backend hosting)
```powershell
cd backend
# Deploy backend changes to your server
```

---

## First-Time Setup

### 1. Link Netlify (One-time)
```powershell
netlify link
```
Select your site: **crowdwise**

### 2. Verify Connection
```powershell
netlify status
```
Should show: "✓ Linked to crowdwise"

---

## Troubleshooting

### Changes Not Showing?

**1. Hard Refresh Browser**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

**2. Check Netlify Deployment**
- Visit: https://app.netlify.com
- Go to: Deploys tab
- Look for: Latest deploy status

**3. Manual Deploy (if auto-deploy fails)**
```powershell
netlify deploy --prod
```

### Netlify Not Connected?

**Connect GitHub to Netlify:**
1. Go to https://app.netlify.com
2. Select your site
3. Site Settings → Build & Deploy
4. Link repository: `SomeshVerenkar/crowdwise`
5. Branch: `main`
6. Publish directory: `.` (root)

---

## Common Commands

### Check what changed
```powershell
git status
```

### See recent commits
```powershell
git log --oneline -5
```

### Undo last commit (keep changes)
```powershell
git reset --soft HEAD~1
```

### Check Netlify status
```powershell
netlify status
```

### View deployment logs
```powershell
netlify open:admin
```

---

## Deployment Checklist

Before deploying, ensure:
- [ ] Tested locally (http://localhost:8000)
- [ ] No console errors in browser (F12)
- [ ] Backend working (if applicable)
- [ ] Committed all changes

After deploying:
- [ ] Wait 1-2 minutes
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check main features working
- [ ] Test on mobile (optional)

---

## Production URL

**Live Site:** https://crowdwise.in

**Netlify Dashboard:** https://app.netlify.com

**GitHub Repository:** https://github.com/SomeshVerenkar/crowdwise

---

## Tips

💡 **Tip 1:** Use `deploy-quick.ps1` for small fixes
💡 **Tip 2:** Use `deploy.ps1 "message"` for feature releases
💡 **Tip 3:** Always hard refresh after deploy (Ctrl+Shift+R)
💡 **Tip 4:** Check Netlify dashboard if changes don't appear

---

## Deployment Timeline

1. **Run deploy script** → Instant
2. **Git push** → 1-5 seconds
3. **Netlify detects push** → 5-10 seconds
4. **Netlify builds** → 20-40 seconds
5. **Netlify publishes** → 5-10 seconds
6. **Total time** → 1-2 minutes

**Then:** Hard refresh browser to see changes!
