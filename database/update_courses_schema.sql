-- Update Courses table to add missing columns for instructor functionality
USE startUp1;
GO

-- First, let's check what columns exist (for reference)
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'Courses';

-- Add missing columns to Courses table
ALTER TABLE Courses
ADD status NVARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE Courses  
ADD price DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE Courses
ADD rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5);

ALTER TABLE Courses
ADD enrollmentCount INT DEFAULT 0;

ALTER TABLE Courses
ADD category NVARCHAR(100);

ALTER TABLE Courses
ADD level NVARCHAR(20) DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE Courses
ADD duration INT DEFAULT 0; -- in minutes

ALTER TABLE Courses
ADD thumbnail NVARCHAR(500);

ALTER TABLE Courses
ADD publishedAt DATETIME2;

PRINT 'Successfully added missing columns to Courses table';

-- No need to update existing records as we set DEFAULT values
PRINT 'Database schema updated successfully';