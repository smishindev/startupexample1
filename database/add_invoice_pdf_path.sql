-- Migration: Add PdfPath column to Invoices table
-- Date: December 14, 2025
-- Purpose: Store file system path for invoice PDFs

USE [startUp1]
GO

-- Check if PdfPath column exists
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.Invoices') 
    AND name = 'PdfPath'
)
BEGIN
    -- Add PdfPath column
    ALTER TABLE dbo.Invoices
    ADD PdfPath NVARCHAR(500) NULL;
    
    PRINT '✅ Added PdfPath column to Invoices table';
    
    -- If existing PdfUrl data exists, you might want to copy it
    -- UPDATE dbo.Invoices SET PdfPath = PdfUrl WHERE PdfUrl IS NOT NULL;
END
ELSE
BEGIN
    PRINT 'ℹ️ PdfPath column already exists in Invoices table';
END
GO

-- Verify the change
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Invoices'
AND COLUMN_NAME IN ('PdfUrl', 'PdfPath')
ORDER BY COLUMN_NAME;

PRINT '✅ Migration completed successfully';
GO
