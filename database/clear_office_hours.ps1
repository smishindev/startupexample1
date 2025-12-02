# Clear Office Hours Data
# PowerShell script to clean up all office hours schedules and queue entries

$serverInstance = "localhost,61299"
$database = "startUp1"
$username = "mishin_learn_user"
$password = "MishinLearn2024!"
$sqlFile = ".\clear_office_hours_data.sql"

Write-Host "Clearing Office Hours data..." -ForegroundColor Yellow
Write-Host "Server: $serverInstance" -ForegroundColor Cyan
Write-Host "Database: $database" -ForegroundColor Cyan
Write-Host ""

# Using sqlcmd with SQL Server authentication
$result = sqlcmd -S $serverInstance -U $username -P $password -d $database -i $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host $result
    Write-Host ""
    Write-Host "✅ Office Hours data cleared successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to clear data!" -ForegroundColor Red
    Write-Host $result
    exit 1
}
