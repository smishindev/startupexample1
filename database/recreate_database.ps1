# PowerShell script to recreate the database with schema.sql
# This will DROP the existing database and create a fresh one

$serverInstance = "SergeyM\SQLEXPRESS"
$database = "startUp1"
$schemaFile = "D:\exampleProjects\startupexample1\database\schema.sql"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DATABASE RECREATION SCRIPT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "⚠️  WARNING: This will DROP and RECREATE the database!" -ForegroundColor Yellow
Write-Host "Server: $serverInstance" -ForegroundColor White
Write-Host "Database: $database" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Type 'YES' to continue"
if ($confirmation -ne 'YES') {
    Write-Host "`n❌ Operation cancelled." -ForegroundColor Red
    exit 0
}

Write-Host "`n[1/3] Dropping existing database..." -ForegroundColor Yellow

# Drop and create database using sqlcmd (connects to master database)
$dropCreateScript = @"
USE master;
GO

-- Drop database if exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'$database')
BEGIN
    ALTER DATABASE [$database] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [$database];
    PRINT 'Database dropped successfully.';
END
GO

-- Create new database
CREATE DATABASE [$database];
GO

PRINT 'Database created successfully.';
GO
"@

# Save the script to a temp file
$tempFile = Join-Path $env:TEMP "recreate_db.sql"
$dropCreateScript | Out-File -FilePath $tempFile -Encoding UTF8

try {
    # Run the drop/create script
    $result = sqlcmd -S $serverInstance -d master -i $tempFile -b
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Failed to drop/create database!" -ForegroundColor Red
        Write-Host $result
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        exit 1
    }
    
    Write-Host "✅ Database dropped and created successfully!" -ForegroundColor Green
    
    # Clean up temp file
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "`n[2/3] Running schema.sql..." -ForegroundColor Yellow

# Run the schema.sql file
try {
    $result = sqlcmd -S $serverInstance -d $database -i $schemaFile -b
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Failed to run schema.sql!" -ForegroundColor Red
        Write-Host $result
        exit 1
    }
    
    Write-Host "✅ Schema created successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ Error running schema: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/3] Verifying database structure..." -ForegroundColor Yellow

# Verify tables were created
$verifyScript = @"
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) AS ColumnCount
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
"@

$verifyFile = Join-Path $env:TEMP "verify_db.sql"
$verifyScript | Out-File -FilePath $verifyFile -Encoding UTF8

try {
    $result = sqlcmd -S $serverInstance -d $database -i $verifyFile -h -1
    
    Write-Host "`nDatabase Tables:" -ForegroundColor Cyan
    Write-Host $result
    
    Remove-Item $verifyFile -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "`n⚠️  Could not verify tables" -ForegroundColor Yellow
    Remove-Item $verifyFile -ErrorAction SilentlyContinue
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ DATABASE RECREATION COMPLETED!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Database: $database" -ForegroundColor White
Write-Host "Server: $serverInstance" -ForegroundColor White
Write-Host "`nYou can now start the backend server.`n" -ForegroundColor Cyan
