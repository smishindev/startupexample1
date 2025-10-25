# 🚨 DATABASE SAFETY RULES - NEVER VIOLATE THESE

## ❌ CRITICAL MISTAKES MADE (October 25, 2025)

**INCIDENT:** Accidentally ran schema.sql with DROP TABLE commands against working database with data, destroying all tables except 3 that had dependency errors.

**WHAT WENT WRONG:**
1. Ran full schema.sql (designed for fresh setup) against existing database
2. Schema.sql starts with DROP TABLE commands that deleted 40+ tables
3. Did not check database state before running destructive operations
4. Did not create backup before schema changes
5. Assumed database was "incomplete" without verifying

---

## 🛡️ MANDATORY SAFETY PROTOCOLS

### 1. **NEVER RUN DROP COMMANDS WITHOUT EXPLICIT PERMISSION**
- ❌ NEVER run schema.sql with DROP statements against existing database
- ❌ NEVER assume database is "empty" or "test" without confirmation
- ✅ ALWAYS create migrations for schema changes (add_*.sql)
- ✅ ALWAYS ask user before ANY destructive operation

### 2. **ALWAYS CHECK BEFORE MODIFYING**
```sql
-- Check what exists FIRST
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;

-- Count rows in tables BEFORE any changes
SELECT COUNT(*) FROM TableName;
```

### 3. **MIGRATION-ONLY APPROACH FOR EXISTING DATABASES**
- ✅ CREATE migrations that ADD/ALTER, never DROP
- ✅ Check IF NOT EXISTS before creating
- ✅ Use ALTER TABLE for modifications
- ❌ NEVER use DROP/TRUNCATE without explicit backup

### 4. **BACKUP PROTOCOL**
```sql
-- Create backup before ANY schema change
BACKUP DATABASE [startUp1] 
TO DISK = 'D:\backups\startUp1_YYYYMMDD_HHMM.bak'
WITH FORMAT, INIT, NAME = 'Pre-migration backup';
```

### 5. **ASK FIRST, EXECUTE SECOND**
When dealing with database operations:
1. Show the user what tables exist
2. Explain what the operation will do
3. Ask explicit permission for destructive operations
4. Get confirmation before executing

### 6. **PRODUCTION DATABASE RULES**
- ❌ NEVER run untested scripts
- ❌ NEVER use DROP commands
- ❌ NEVER skip backups
- ✅ ALWAYS use transactions with ROLLBACK capability
- ✅ ALWAYS test on development copy first
- ✅ ALWAYS have rollback plan

---

## ✅ CORRECT APPROACH FOR SCHEMA CHANGES

### Adding New Tables (Like Video Lessons):
```sql
-- ✅ CORRECT
IF OBJECT_ID('dbo.VideoLessons', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VideoLessons (...);
END

-- ❌ WRONG
DROP TABLE dbo.VideoLessons;
CREATE TABLE dbo.VideoLessons (...);
```

### Modifying Existing Tables:
```sql
-- ✅ CORRECT
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID('Users') 
               AND name = 'NewColumn')
BEGIN
    ALTER TABLE Users ADD NewColumn NVARCHAR(100) NULL;
END

-- ❌ WRONG
ALTER TABLE Users ADD NewColumn NVARCHAR(100) NULL; -- Fails if exists
```

---

## 📋 PRE-EXECUTION CHECKLIST

Before ANY database script execution:

- [ ] Check current table count and names
- [ ] Verify this is correct database/environment
- [ ] Read script completely for DROP/TRUNCATE/DELETE
- [ ] Confirm with user if ANY data loss risk
- [ ] Create backup if modifying existing database
- [ ] Use transactions for reversibility
- [ ] Test on development copy first

---

## 💡 REMEMBER:

> **"In production, there are no second chances. One DROP command can destroy months of work and user data. ALWAYS assume the database has critical data. ALWAYS ask before ANY destructive operation."**

This document must be reviewed before EVERY database operation.

Last Updated: October 25, 2025
Incident: Accidental table drops in startUp1 database
