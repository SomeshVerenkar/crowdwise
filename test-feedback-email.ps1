# Test feedback email notification
Write-Host "Testing feedback email notification..." -ForegroundColor Cyan

# Wait for server
Start-Sleep -Seconds 2

# Submit feedback
$body = @{
    message = "Test email notification - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    rating = 5
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/api/user-feedback" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    Write-Host "`nSuccess!" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Yellow
    Write-Host "`nCheck the server logs for email notification status." -ForegroundColor Cyan
} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
}
