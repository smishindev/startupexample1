# Test Email Notifications
# This script tests all 6 notification types with email delivery

Write-Host "=== Email Notification System Test ===" -ForegroundColor Cyan
Write-Host ""

# Login and get token
Write-Host "1. Logging in as student1..." -ForegroundColor Yellow
$loginBody = @{
    email = "student1@gmail.com"
    password = "Aa123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "Login successful" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Login failed" -ForegroundColor Red
    exit 1
}

# Send test notifications
Write-Host "2. Sending all 6 test notifications..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $testResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/notifications/test-all-types" `
        -Method POST `
        -Headers $headers
    
    Write-Host "Test notifications sent!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Cyan
    $testResponse.results | ForEach-Object {
        $icon = if ($_.success) { "OK" } else { "FAIL" }
        Write-Host "  $icon $($_.type): $($_.message)"
    }
    Write-Host ""
    Write-Host "Check email inbox: s.mishin.dev@gmail.com" -ForegroundColor Yellow
    Write-Host "Check notification bell in app" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "Failed to send test notifications" -ForegroundColor Red
    exit 1
}

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
