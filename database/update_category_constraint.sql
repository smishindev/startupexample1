-- Find and drop the existing Category CHECK constraint
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('dbo.Courses') 
AND definition LIKE '%Category%';

IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(MAX) = 'ALTER TABLE dbo.Courses DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
    EXEC sp_executesql @SQL;
    PRINT 'Dropped constraint: ' + @ConstraintName;
END

-- Add the new constraint with 'marketing' included
ALTER TABLE dbo.Courses 
ADD CHECK (Category IN ('programming', 'data_science', 'design', 'business', 'marketing', 'language', 'mathematics', 'science', 'arts', 'other'));

PRINT 'Successfully added new Category constraint with marketing value';
