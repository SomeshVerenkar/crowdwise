# ====================================================
# Quick Deploy Script (No Questions Asked)
# ====================================================
# Fastest deployment - just commit and push
# Usage: .\deploy-quick.ps1
# ====================================================

Write-Host "⚡ QUICK DEPLOY STARTING..." -ForegroundColor Cyan

# Generate timestamp commit message
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$message = "Deploy: $timestamp"

git add . | Out-Null
git commit -m "$message" | Out-Null
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ DEPLOYED! Wait 1-2 min, then Ctrl+Shift+R to refresh" -ForegroundColor Green
    Write-Host "🌍 https://crowdwise.in" -ForegroundColor Cyan
} else {
    Write-Host "❌ DEPLOY FAILED!" -ForegroundColor Red
}
