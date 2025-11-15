-- Add Status column to AssessmentSubmissions table
USE [startUp1]
GO

-- Check if column exists before adding
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'AssessmentSubmissions' 
    AND COLUMN_NAME = 'Status'
)
BEGIN
    ALTER TABLE dbo.AssessmentSubmissions 
    ADD Status NVARCHAR(20) NOT NULL DEFAULT 'completed' 
    CHECK (Status IN ('in_progress', 'completed', 'abandoned'));
    
    PRINT 'Status column added successfully to AssessmentSubmissions table';
END
ELSE
BEGIN
    PRINT 'Status column already exists';
END
GO

PRINT 'Migration completed successfully';
GO
