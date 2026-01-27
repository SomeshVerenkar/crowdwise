# ====================================================
# CrowdWise Deployment Script
# ====================================================
# Quick deployment to production with a single command
# Usage: .\deploy.ps1 "Your commit message"
# ====================================================

param(
    [string]$CommitMessage = "Update: Deploy changes to production"
)

Write-Host "🚀 Starting CrowdWise Deployment..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "index.html")) {
    Write-Host "❌ Error: Not in project root directory!" -ForegroundColor Red
    exit 1
}

# Step 1: Check for changes
Write-Host "`n📋 Checking for changes..." -ForegroundColor Yellow
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✅ No changes to deploy. Working tree is clean." -ForegroundColor Green
    exit 0
}

# Step 2: Show what's changed
Write-Host "`n📝 Changes to be deployed:" -ForegroundColor Yellow
git status --short

# Step 3: Add all changes
Write-Host "`n➕ Adding all changes to git..." -ForegroundColor Yellow
git add .

# Step 4: Commit changes
Write-Host "`n💾 Committing changes..." -ForegroundColor Yellow
git commit -m "$CommitMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Push to GitHub
Write-Host "`n⬆️  Pushing to GitHub (main branch)..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Successfully pushed to GitHub!" -ForegroundColor Green

# Step 6: Check Netlify connection
Write-Host "`n🌐 Checking Netlify status..." -ForegroundColor Yellow
$netlifyStatus = netlify status 2>&1

if ($netlifyStatus -like "*linked to a project*") {
    Write-Host "✅ Netlify is connected. Auto-deployment should trigger shortly." -ForegroundColor Green
    Write-Host "`n⏳ Netlify will auto-deploy in 30-60 seconds..." -ForegroundColor Cyan
    Write-Host "   Check: https://app.netlify.com" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Netlify folder not linked." -ForegroundColor Yellow
    Write-Host "`n🔧 To fix, run: netlify link" -ForegroundColor Yellow
    Write-Host "   Or manually trigger deploy: netlify deploy --prod" -ForegroundColor Yellow
}

# Step 7: Summary
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`n📊 Deployment Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Changes committed to Git" -ForegroundColor Green
Write-Host "   ✅ Pushed to GitHub (main branch)" -ForegroundColor Green
Write-Host "   ⏳ Netlify auto-deploy triggered" -ForegroundColor Yellow
Write-Host "`n🌍 Your site: https://crowdwise.in" -ForegroundColor Cyan
Write-Host "   Wait 1-2 minutes, then hard refresh (Ctrl+Shift+R)" -ForegroundColor Gray
Write-Host "`n💡 Tip: Check deployment status at https://app.netlify.com" -ForegroundColor Gray
Write-Host ""
