-- Add Billing Address Fields and Email Verification to Users Table
-- Migration Script for Payment System Prerequisites
-- Created: November 20, 2025

USE [startUp1]
GO

PRINT '🔧 Adding billing fields and email verification to Users table...';

-- Check if columns already exist before adding
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'BillingStreetAddress')
BEGIN
    ALTER TABLE dbo.Users ADD BillingStreetAddress NVARCHAR(255) NULL;
    PRINT '✅ Added BillingStreetAddress column';
END
ELSE
    PRINT '⚠️ BillingStreetAddress column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'BillingCity')
BEGIN
    ALTER TABLE dbo.Users ADD BillingCity NVARCHAR(100) NULL;
    PRINT '✅ Added BillingCity column';
END
ELSE
    PRINT '⚠️ BillingCity column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'BillingState')
BEGIN
    ALTER TABLE dbo.Users ADD BillingState NVARCHAR(100) NULL;
    PRINT '✅ Added BillingState column';
END
ELSE
    PRINT '⚠️ BillingState column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'BillingPostalCode')
BEGIN
    ALTER TABLE dbo.Users ADD BillingPostalCode NVARCHAR(20) NULL;
    PRINT '✅ Added BillingPostalCode column';
END
ELSE
    PRINT '⚠️ BillingPostalCode column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'BillingCountry')
BEGIN
    ALTER TABLE dbo.Users ADD BillingCountry NVARCHAR(100) NULL;
    PRINT '✅ Added BillingCountry column';
END
ELSE
    PRINT '⚠️ BillingCountry column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'PhoneNumber')
BEGIN
    ALTER TABLE dbo.Users ADD PhoneNumber NVARCHAR(20) NULL;
    PRINT '✅ Added PhoneNumber column';
END
ELSE
    PRINT '⚠️ PhoneNumber column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'TaxId')
BEGIN
    ALTER TABLE dbo.Users ADD TaxId NVARCHAR(50) NULL;
    PRINT '✅ Added TaxId column (for business customers)';
END
ELSE
    PRINT '⚠️ TaxId column already exists';

-- Email verification fields
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'EmailVerificationCode')
BEGIN
    ALTER TABLE dbo.Users ADD EmailVerificationCode NVARCHAR(10) NULL;
    PRINT '✅ Added EmailVerificationCode column';
END
ELSE
    PRINT '⚠️ EmailVerificationCode column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'EmailVerificationExpiry')
BEGIN
    ALTER TABLE dbo.Users ADD EmailVerificationExpiry DATETIME2 NULL;
    PRINT '✅ Added EmailVerificationExpiry column';
END
ELSE
    PRINT '⚠️ EmailVerificationExpiry column already exists';

PRINT '';
PRINT '✅ Billing fields migration completed successfully!';
PRINT '';
PRINT '📊 Summary of new fields:';
PRINT '   - BillingStreetAddress: Address line 1';
PRINT '   - BillingCity: City name';
PRINT '   - BillingState: State/Province';
PRINT '   - BillingPostalCode: ZIP/Postal code';
PRINT '   - BillingCountry: Country name';
PRINT '   - PhoneNumber: Contact phone';
PRINT '   - TaxId: Tax/VAT ID for businesses';
PRINT '   - EmailVerificationCode: 6-digit verification code';
PRINT '   - EmailVerificationExpiry: Code expiry timestamp';

GO
