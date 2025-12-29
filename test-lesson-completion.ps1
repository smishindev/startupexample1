# Test lesson completion notification
$baseUrl = "http://localhost:3001"

# Login as student1
Write-Host "🔐 Logging in as student1..." -ForegroundColor Cyan
$loginBody = @{
    email = "student1@gmail.com"
    password = "Pass123!"
    rememberMe = $false
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$student1Token = $loginResponse.token
Write-Host "✅ Logged in successfully" -ForegroundColor Green
Write-Host ""

# Get course lessons
Write-Host "📚 Getting course lessons..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $student1Token"
    "Content-Type" = "application/json"
}

$courseId = "BF820EC3-0515-43C3-B6A5-891A928B3C69"
$courseContent = Invoke-RestMethod -Uri "$baseUrl/api/courses/$courseId/content" -Method GET -Headers $headers
$lesson = $courseContent.lessons | Select-Object -First 1

if (-not $lesson) {
    Write-Host "❌ No lessons found" -ForegroundColor Red
    exit
}

Write-Host "✅ Found lesson: $($lesson.title) (ID: $($lesson.id))" -ForegroundColor Green
Write-Host ""

# Complete the lesson
Write-Host "📝 Completing lesson..." -ForegroundColor Cyan
$completeBody = @{
    timeSpent = 60
} | ConvertTo-Json

try {
    $completeResponse = Invoke-RestMethod -Uri "$baseUrl/api/progress/lessons/$($lesson.id)/complete" -Method POST -Body $completeBody -Headers $headers
    Write-Host "✅ Lesson completed successfully!" -ForegroundColor Green
    Write-Host "Progress: $($completeResponse.progress)%" -ForegroundColor Yellow
    Write-Host ""

    Start-Sleep -Seconds 2

    # Check student notifications
    Write-Host "🔔 Checking student notifications..." -ForegroundColor Cyan
    $notifications = Invoke-RestMethod -Uri "$baseUrl/api/notifications?includeRead=false" -Method GET -Headers $headers
    Write-Host "📬 Unread notifications: $($notifications.notifications.Count)" -ForegroundColor Yellow
    
    if ($notifications.notifications.Count -gt 0) {
        $notifications.notifications | Select-Object -First 3 | ForEach-Object {
            Write-Host "  • [$($_.Type)] $($_.Title): $($_.Message)" -ForegroundColor White
        }
    }
    Write-Host ""

    # Check instructor notifications
    Write-Host "🔐 Logging in as instructor..." -ForegroundColor Cyan
    $instrLoginBody = @{
        email = "ins1@gmail.com"
        password = "Pass123!"
        rememberMe = $false
    } | ConvertTo-Json

    $instrLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $instrLoginBody -ContentType "application/json"
    $instrHeaders = @{
        "Authorization" = "Bearer $($instrLoginResponse.token)"
        "Content-Type" = "application/json"
    }

    $instrNotifications = Invoke-RestMethod -Uri "$baseUrl/api/notifications?includeRead=false" -Method GET -Headers $instrHeaders
    Write-Host "📬 Instructor unread notifications: $($instrNotifications.notifications.Count)" -ForegroundColor Yellow
    
    if ($instrNotifications.notifications.Count -gt 0) {
        $instrNotifications.notifications | Select-Object -First 3 | ForEach-Object {
            Write-Host "  • [$($_.Type)] $($_.Title): $($_.Message)" -ForegroundColor White
        }
    }
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test complete!" -ForegroundColor Green
Write-Host "✅ Test complete!" -ForegroundColor Green
