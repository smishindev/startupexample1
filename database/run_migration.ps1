# Run this script to add password reset columns to the Users table
# PowerShell script for SQL Server migration

$serverInstance = "SergeyM\SQLEXPRESS"
$database = "startUp1"
$sqlFile = "D:\exampleProjects\startupexample1\database\add_password_reset_columns.sql"

Write-Host "Running SQL migration..." -ForegroundColor Yellow
Write-Host "Server: $serverInstance" -ForegroundColor Cyan
Write-Host "Database: $database" -ForegroundColor Cyan

# Method 1: Using Invoke-Sqlcmd (requires SqlServer module)
try {
    Import-Module SqlServer -ErrorAction Stop
    Invoke-Sqlcmd -ServerInstance $serverInstance -Database $database -InputFile $sqlFile
    Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "`n⚠️  SqlServer module not found. Using sqlcmd.exe instead..." -ForegroundColor Yellow
    
    # Method 2: Using sqlcmd.exe
    $result = sqlcmd -S $serverInstance -d $database -i $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host $result
        Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Migration failed!" -ForegroundColor Red
        Write-Host $result
        exit 1
    }
}

Write-Host "`nPassword reset columns have been added to the Users table:" -ForegroundColor Green
Write-Host "  - PasswordResetToken NVARCHAR(10) NULL" -ForegroundColor White
Write-Host "  - PasswordResetExpiry DATETIME2 NULL" -ForegroundColor White
