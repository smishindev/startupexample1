-- ============================================================
-- Create 1000 Test Courses with Enrollments and Payments
-- For testing purposes with student1@gmail.com
-- ============================================================

USE [startUp1]
GO

-- Declare variables
DECLARE @StudentId UNIQUEIDENTIFIER;
DECLARE @InstructorId UNIQUEIDENTIFIER;
DECLARE @Counter INT = 1;
DECLARE @CourseId UNIQUEIDENTIFIER;
DECLARE @TransactionId UNIQUEIDENTIFIER;
DECLARE @EnrollmentId UNIQUEIDENTIFIER;
DECLARE @InvoiceNumber NVARCHAR(50);

-- Find the student user ID
SELECT @StudentId = Id 
FROM dbo.Users 
WHERE Email = 'student1@gmail.com';

-- Check if student exists
IF @StudentId IS NULL
BEGIN
    PRINT '❌ ERROR: Student with email student1@gmail.com not found!';
    PRINT 'Please create this user first before running this script.';
    RETURN;
END

PRINT '✅ Found student: student1@gmail.com (ID: ' + CAST(@StudentId AS NVARCHAR(50)) + ')';

-- Get the first instructor in the system (or you can specify a particular instructor)
SELECT TOP 1 @InstructorId = Id 
FROM dbo.Users 
WHERE Role = 'instructor';

-- If no instructor exists, get an admin
IF @InstructorId IS NULL
BEGIN
    SELECT TOP 1 @InstructorId = Id 
    FROM dbo.Users 
    WHERE Role = 'admin';
END

-- If still no instructor, use any user
IF @InstructorId IS NULL
BEGIN
    SELECT TOP 1 @InstructorId = Id 
    FROM dbo.Users 
    WHERE Id != @StudentId;
END

IF @InstructorId IS NULL
BEGIN
    PRINT '❌ ERROR: No instructor found in the system!';
    RETURN;
END

PRINT '✅ Using instructor ID: ' + CAST(@InstructorId AS NVARCHAR(50));
PRINT '';
PRINT '🚀 Starting to create 1000 test courses with enrollments and payments...';
PRINT '';

-- Arrays for random data
DECLARE @Categories TABLE (Name NVARCHAR(30));
INSERT INTO @Categories VALUES 
    ('programming'), ('data_science'), ('design'), ('business'), 
    ('marketing'), ('language'), ('mathematics'), ('science'), 
    ('arts'), ('other');

DECLARE @Levels TABLE (Name NVARCHAR(20));
INSERT INTO @Levels VALUES ('beginner'), ('intermediate'), ('advanced'), ('expert');

-- Begin transaction
BEGIN TRANSACTION;

BEGIN TRY
    -- Loop to create 1000 courses
    WHILE @Counter <= 1000
    BEGIN
        -- Generate new course ID
        SET @CourseId = NEWID();
        SET @TransactionId = NEWID();
        SET @EnrollmentId = NEWID();
        SET @InvoiceNumber = 'INV-TEST-' + RIGHT('00000' + CAST(@Counter AS NVARCHAR(5)), 5);
        
        -- Insert Course
        INSERT INTO dbo.Courses (
            Id,
            Title,
            Description,
            Thumbnail,
            InstructorId,
            Category,
            Level,
            Duration,
            Price,
            Rating,
            EnrollmentCount,
            Prerequisites,
            LearningOutcomes,
            Tags,
            IsPublished,
            CreatedAt,
            UpdatedAt
        )
        VALUES (
            @CourseId,
            'Test Course ' + CAST(@Counter AS NVARCHAR(10)),
            'This is a comprehensive test course #' + CAST(@Counter AS NVARCHAR(10)) + ' designed for automated testing purposes. It covers various topics and provides hands-on experience with real-world scenarios.',
            '/images/test-course-' + CAST(@Counter AS NVARCHAR(10)) + '.jpg',
            @InstructorId,
            (SELECT TOP 1 Name FROM @Categories ORDER BY NEWID()), -- Random category
            (SELECT TOP 1 Name FROM @Levels ORDER BY NEWID()), -- Random level
            (30 + (@Counter % 300)) * 60, -- Duration between 30-330 hours (in minutes)
            CAST((29.99 + (@Counter % 200)) AS DECIMAL(10,2)), -- Price between $29.99 and $229.99
            CAST((3.0 + (@Counter % 20) * 0.1) AS DECIMAL(3,2)), -- Rating between 3.0 and 5.0
            1, -- Initial enrollment count
            '["Basic computer skills", "English proficiency"]', -- Prerequisites JSON
            '["Master the fundamentals", "Build real projects", "Get certified"]', -- Learning outcomes JSON
            '["test", "course-' + CAST(@Counter AS NVARCHAR(10)) + '", "automated"]', -- Tags JSON
            1, -- Published
            DATEADD(DAY, -(@Counter % 365), GETUTCDATE()), -- Stagger creation dates over past year
            GETUTCDATE()
        );
        
        -- Insert Enrollment
        INSERT INTO dbo.Enrollments (
            Id,
            UserId,
            CourseId,
            EnrolledAt,
            CompletedAt,
            Status
        )
        VALUES (
            @EnrollmentId,
            @StudentId,
            @CourseId,
            DATEADD(DAY, -(@Counter % 365), GETUTCDATE()), -- Match course creation date
            NULL, -- Not completed yet
            'active'
        );
        
        -- Insert Transaction (completed payment)
        INSERT INTO dbo.Transactions (
            Id,
            UserId,
            CourseId,
            Amount,
            Currency,
            Status,
            StripePaymentIntentId,
            StripeChargeId,
            StripeCustomerId,
            PaymentMethod,
            PaymentMethodLast4,
            PaymentMethodBrand,
            RefundReason,
            RefundAmount,
            Metadata,
            CreatedAt,
            CompletedAt,
            RefundedAt,
            UpdatedAt
        )
        VALUES (
            @TransactionId,
            @StudentId,
            @CourseId,
            CAST((29.99 + (@Counter % 200)) AS DECIMAL(10,2)), -- Same as course price
            'USD',
            'completed', -- Payment completed
            'pi_test_' + CAST(@Counter AS NVARCHAR(10)) + '_' + REPLACE(CAST(NEWID() AS NVARCHAR(36)), '-', ''),
            'ch_test_' + CAST(@Counter AS NVARCHAR(10)) + '_' + REPLACE(CAST(NEWID() AS NVARCHAR(36)), '-', ''),
            'cus_test_student1',
            'card',
            '4242', -- Test card last 4 digits
            'visa',
            NULL, -- No refund
            NULL,
            '{"test": true, "course_number": ' + CAST(@Counter AS NVARCHAR(10)) + '}',
            DATEADD(DAY, -(@Counter % 365), GETUTCDATE()),
            DATEADD(MINUTE, 2, DATEADD(DAY, -(@Counter % 365), GETUTCDATE())), -- Completed 2 minutes after creation
            NULL,
            GETUTCDATE()
        );
        
        -- Insert Invoice
        INSERT INTO dbo.Invoices (
            Id,
            TransactionId,
            InvoiceNumber,
            Amount,
            TaxAmount,
            TotalAmount,
            Currency,
            BillingName,
            BillingEmail,
            BillingAddress,
            TaxRate,
            TaxId,
            PdfUrl,
            PdfGeneratedAt,
            CreatedAt,
            UpdatedAt
        )
        VALUES (
            NEWID(),
            @TransactionId,
            @InvoiceNumber,
            CAST((29.99 + (@Counter % 200)) AS DECIMAL(10,2)), -- Base amount
            CAST((29.99 + (@Counter % 200)) * 0.10 AS DECIMAL(10,2)), -- 10% tax
            CAST((29.99 + (@Counter % 200)) * 1.10 AS DECIMAL(10,2)), -- Total with tax
            'USD',
            'Test Student One',
            'student1@gmail.com',
            '{"street": "123 Test St", "city": "Test City", "state": "TC", "zip": "12345", "country": "USA"}',
            10.00, -- 10% tax rate
            NULL,
            '/invoices/test/' + @InvoiceNumber + '.pdf',
            DATEADD(MINUTE, 5, DATEADD(DAY, -(@Counter % 365), GETUTCDATE())),
            DATEADD(DAY, -(@Counter % 365), GETUTCDATE()),
            GETUTCDATE()
        );
        
        -- Progress indicator every 100 courses
        IF @Counter % 100 = 0
        BEGIN
            PRINT '✅ Created ' + CAST(@Counter AS NVARCHAR(10)) + ' courses with enrollments and payments...';
        END
        
        SET @Counter = @Counter + 1;
    END
    
    -- Commit the transaction
    COMMIT TRANSACTION;
    
    PRINT '';
    PRINT '🎉 SUCCESS! Created 1000 test courses with:';
    PRINT '   - 1000 Courses (all published)';
    PRINT '   - 1000 Enrollments (for student1@gmail.com)';
    PRINT '   - 1000 Transactions (all completed)';
    PRINT '   - 1000 Invoices (all generated)';
    PRINT '';
    PRINT '📊 Summary:';
    PRINT '   Student: student1@gmail.com (ID: ' + CAST(@StudentId AS NVARCHAR(50)) + ')';
    PRINT '   All courses are published and paid for';
    PRINT '   Invoice numbers: INV-TEST-00001 to INV-TEST-01000';
    PRINT '';
    
END TRY
BEGIN CATCH
    -- Rollback on error
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    PRINT '';
    PRINT '❌ ERROR occurred during course creation:';
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
    PRINT '';
    
    -- Re-throw the error
    THROW;
END CATCH

GO

-- Verify the results
PRINT '';
PRINT '📋 Verification:';
PRINT '';

SELECT 
    'Total Courses' AS Metric,
    COUNT(*) AS Count
FROM dbo.Courses
WHERE Title LIKE 'Test Course %'
UNION ALL
SELECT 
    'Student Enrollments' AS Metric,
    COUNT(*) AS Count
FROM dbo.Enrollments e
INNER JOIN dbo.Users u ON e.UserId = u.Id
WHERE u.Email = 'student1@gmail.com'
UNION ALL
SELECT 
    'Completed Transactions' AS Metric,
    COUNT(*) AS Count
FROM dbo.Transactions t
INNER JOIN dbo.Users u ON t.UserId = u.Id
WHERE u.Email = 'student1@gmail.com' AND t.Status = 'completed'
UNION ALL
SELECT 
    'Generated Invoices' AS Metric,
    COUNT(*) AS Count
FROM dbo.Invoices
WHERE InvoiceNumber LIKE 'INV-TEST-%';

PRINT '';
PRINT '✅ Script execution complete!';
PRINT '';

GO
