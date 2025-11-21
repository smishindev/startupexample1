# Database Recreation Guide

## ⚠️ CRITICAL: Complete Database Recreation Process

This guide explains how to properly drop and recreate the `startUp1` database without encountering user permission errors.

---

## Why This Guide Exists

When you drop and recreate a SQL Server database:
- ✅ The database is created
- ✅ Tables are created from schema.sql
- ❌ **SQL Server login is NOT recreated** (stored at server level)
- ❌ **Database user is NOT recreated** (stored per-database)
- ❌ **Application fails to connect** (Login failed for user 'mishin_learn_user')

**This guide prevents that error.**

---

## Complete Recreation Process

### Step 1: Drop and Recreate Database

```powershell
sqlcmd -S localhost\SQLEXPRESS -E -Q "DROP DATABASE IF EXISTS [startUp1]; CREATE DATABASE [startUp1];"
```

**What this does:**
- Drops the existing startUp1 database (if exists)
- Creates a fresh empty startUp1 database
- **Does NOT create logins or users**

---

### Step 2: Execute Schema to Create Tables

```powershell
sqlcmd -S localhost\SQLEXPRESS -E -i "database\schema.sql"
```

**What this does:**
- Creates all 27+ tables (Users, Courses, Lessons, Transactions, etc.)
- Creates all indexes and foreign keys
- Creates all CHECK constraints
- **Does NOT create database users**

**Expected output:**
```
✅ Mishin Learn Database Schema created successfully!
📊 Core Tables: Users, Courses, Lessons, Enrollments, UserProgress...
💳 Payment System: Transactions, Invoices, Stripe Integration
🚀 Database is ready for Mishin Learn Platform!
```

---

### Step 3: Create Database User (CRITICAL STEP)

**Option A: Using SQL Script (Recommended)**

```powershell
sqlcmd -S localhost\SQLEXPRESS -E -i "database\create_db_user.sql"
```

**Expected output:**
```
🔐 Creating SQL Server login and database user...
✅ Created SQL Server login: mishin_learn_user
✅ Created database user: mishin_learn_user
✅ Granted db_owner role to mishin_learn_user
🎉 Database user setup complete!
```

**Option B: Using Command Line (Alternative)**

```powershell
# Create SQL Server login
sqlcmd -S localhost\SQLEXPRESS -E -Q "IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'mishin_learn_user') CREATE LOGIN [mishin_learn_user] WITH PASSWORD = 'MishinLearn2024!';"

# Create database user and grant permissions
sqlcmd -S localhost\SQLEXPRESS -E -Q "USE [startUp1]; IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'mishin_learn_user') CREATE USER [mishin_learn_user] FOR LOGIN [mishin_learn_user]; ALTER ROLE db_owner ADD MEMBER [mishin_learn_user];"
```

---

### Step 4: Verify Connection

Start the backend server:

```powershell
cd server
npm run dev
```

**Expected output:**
```
✅ AI Tutoring Service initialized with OpenAI API
⚠️ SendGrid API key not configured. Emails will be logged to console.
✅ Stripe Service initialized
🔄 Connecting to SQL Server...
✅ Successfully connected to SQL Server
🚀 Mishin Learn Server running on http://localhost:3001
```

**If you see this error:**
```
❌ Failed to connect to SQL Server: Login failed for user 'mishin_learn_user'
```

**Then you skipped Step 3!** Go back and run the user creation script.

---

## Quick Reference Commands

### Complete Recreation (Copy-Paste All)

```powershell
# Navigate to project root
cd D:\exampleProjects\startupexample1

# Drop and recreate database
sqlcmd -S localhost\SQLEXPRESS -E -Q "DROP DATABASE IF EXISTS [startUp1]; CREATE DATABASE [startUp1];"

# Create tables
sqlcmd -S localhost\SQLEXPRESS -E -i "database\schema.sql"

# Create user
sqlcmd -S localhost\SQLEXPRESS -E -i "database\create_db_user.sql"

# Start server
cd server
npm run dev
```

---

## Understanding SQL Server Security

### Server-Level vs Database-Level

| Component | Scope | Survives DB Drop? | Created By |
|-----------|-------|-------------------|------------|
| **SQL Server Login** | Server-wide | ✅ Yes | `CREATE LOGIN` |
| **Database User** | Per-database | ❌ No | `CREATE USER` |
| **Table Data** | Database | ❌ No | `INSERT` statements |
| **Schema** | Database | ❌ No | `CREATE TABLE` |

### Why We Need Both

1. **SQL Server Login** (`mishin_learn_user`)
   - Allows authentication to SQL Server
   - Stored in `master` database
   - Persists even when application database is dropped

2. **Database User** (`mishin_learn_user`)
   - Maps login to specific database
   - Grants permissions within database
   - **Deleted when database is dropped**

3. **Role Membership** (`db_owner`)
   - Grants full permissions within database
   - Must be reassigned after database recreation

---

## Troubleshooting

### Error: "Login failed for user 'mishin_learn_user'"

**Cause:** Database user not created after database recreation

**Solution:**
```powershell
sqlcmd -S localhost\SQLEXPRESS -E -i "database\create_db_user.sql"
```

---

### Error: "Cannot open database 'startUp1'"

**Cause:** Database not created yet

**Solution:**
```powershell
sqlcmd -S localhost\SQLEXPRESS -E -Q "CREATE DATABASE [startUp1];"
sqlcmd -S localhost\SQLEXPRESS -E -i "database\schema.sql"
```

---

### Error: "There is already an object named 'Users'"

**Cause:** Tables already exist (schema already run)

**Solution:** Either:
- Drop and recreate database first
- Or skip schema execution

---

## Environment Variables

Your `server/.env` should have:

```env
DB_SERVER=localhost
DB_PORT=61299
DB_DATABASE=startUp1
DB_USER=mishin_learn_user
DB_PASSWORD=MishinLearn2024!
DB_TRUSTED_CONNECTION=false
```

**Note:** Port 61299 is your SQL Server instance port. This is correct and should not be changed.

---

## Summary

**ALWAYS follow this order:**
1. Drop database (optional)
2. Create database
3. Execute schema.sql
4. **Execute create_db_user.sql** ⚠️ **CRITICAL STEP**
5. Start application

**Never skip Step 4!** This is the most common mistake when recreating the database.

---

## Automation Script (Future Enhancement)

For future convenience, we could create a PowerShell script:

```powershell
# recreate_database.ps1
Write-Host "🔧 Starting database recreation..." -ForegroundColor Cyan

# Drop and recreate
sqlcmd -S localhost\SQLEXPRESS -E -Q "DROP DATABASE IF EXISTS [startUp1]; CREATE DATABASE [startUp1];"
Write-Host "✅ Database recreated" -ForegroundColor Green

# Execute schema
sqlcmd -S localhost\SQLEXPRESS -E -i "database\schema.sql"
Write-Host "✅ Schema executed" -ForegroundColor Green

# Create user
sqlcmd -S localhost\SQLEXPRESS -E -i "database\create_db_user.sql"
Write-Host "✅ User created" -ForegroundColor Green

Write-Host "🎉 Database recreation complete!" -ForegroundColor Green
```

Save as `database/recreate_database.ps1` and run:
```powershell
.\database\recreate_database.ps1
```

---

*Last Updated: November 21, 2025*
