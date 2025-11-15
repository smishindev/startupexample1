-- Add IsPreview column to AssessmentSubmissions table
-- This column distinguishes preview/test attempts from real graded attempts

USE [startUp1]
GO

-- Check if column already exists
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.AssessmentSubmissions') 
    AND name = 'IsPreview'
)
BEGIN
    -- Add the IsPreview column
    ALTER TABLE dbo.AssessmentSubmissions
    ADD IsPreview BIT NOT NULL DEFAULT 0;
    
    PRINT 'IsPreview column added successfully to AssessmentSubmissions table';
END
ELSE
BEGIN
    PRINT 'IsPreview column already exists in AssessmentSubmissions table';
END
GO

-- Update any existing records to have IsPreview = 0 (real attempts)
-- This is already the default, but just to be explicit
UPDATE dbo.AssessmentSubmissions
SET IsPreview = 0
WHERE IsPreview IS NULL;
GO

PRINT 'Migration completed successfully';
GO
