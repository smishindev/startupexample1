-- Add Stripe Customer ID column to Users table
-- This column stores the Stripe customer ID for each user

USE startUp1;
GO

-- Check if column already exists
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Users' 
    AND COLUMN_NAME = 'StripeCustomerId'
)
BEGIN
    ALTER TABLE dbo.Users
    ADD StripeCustomerId NVARCHAR(255) NULL;
    
    PRINT '✅ Added StripeCustomerId column to Users table';
END
ELSE
BEGIN
    PRINT '⚠️ StripeCustomerId column already exists';
END
GO

-- Create index for faster lookups
IF NOT EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'IX_Users_StripeCustomerId' 
    AND object_id = OBJECT_ID('dbo.Users')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_StripeCustomerId
    ON dbo.Users(StripeCustomerId);
    
    PRINT '✅ Created index on StripeCustomerId';
END
ELSE
BEGIN
    PRINT '⚠️ Index IX_Users_StripeCustomerId already exists';
END
GO

PRINT '✅ Migration completed successfully';
