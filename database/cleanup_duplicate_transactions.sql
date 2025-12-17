-- Cleanup duplicate pending transactions
-- This script identifies and removes duplicate pending transactions,
-- keeping only the most recent one for each user+course combination

-- Step 1: Identify duplicates (for review)
SELECT 
    UserId,
    CourseId,
    COUNT(*) as DuplicateCount,
    MIN(CreatedAt) as OldestDate,
    MAX(CreatedAt) as NewestDate
FROM dbo.Transactions
WHERE Status = 'pending'
GROUP BY UserId, CourseId
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Step 2: Delete old duplicate pending transactions, keep only the newest
-- (Only for transactions older than 1 hour to avoid interfering with active payments)
WITH RankedTransactions AS (
    SELECT 
        Id,
        UserId,
        CourseId,
        Status,
        CreatedAt,
        ROW_NUMBER() OVER (
            PARTITION BY UserId, CourseId 
            ORDER BY CreatedAt DESC
        ) as RowNum
    FROM dbo.Transactions
    WHERE Status = 'pending'
    AND CreatedAt < DATEADD(HOUR, -1, GETUTCDATE()) -- Only old transactions
)
DELETE FROM dbo.Transactions
WHERE Id IN (
    SELECT Id FROM RankedTransactions WHERE RowNum > 1
);

-- Step 3: Show remaining pending transactions
SELECT 
    t.Id,
    t.UserId,
    u.Email,
    t.CourseId,
    c.Title as CourseTitle,
    t.Amount,
    t.Status,
    t.CreatedAt,
    DATEDIFF(HOUR, t.CreatedAt, GETUTCDATE()) as HoursOld
FROM dbo.Transactions t
LEFT JOIN dbo.Users u ON t.UserId = u.Id
LEFT JOIN dbo.Courses c ON t.CourseId = c.Id
WHERE t.Status = 'pending'
ORDER BY t.CreatedAt DESC;

-- Cleanup summary
SELECT 
    'Total Transactions' as Metric,
    COUNT(*) as Count
FROM dbo.Transactions
UNION ALL
SELECT 
    'Pending Transactions',
    COUNT(*)
FROM dbo.Transactions
WHERE Status = 'pending'
UNION ALL
SELECT 
    'Completed Transactions',
    COUNT(*)
FROM dbo.Transactions
WHERE Status = 'completed'
UNION ALL
SELECT 
    'Failed Transactions',
    COUNT(*)
FROM dbo.Transactions
WHERE Status = 'failed';
