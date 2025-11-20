-- Create Payment System Tables (Transactions and Invoices)
-- Migration Script for Payment System Prerequisites
-- Created: November 20, 2025

USE [startUp1]
GO

PRINT '🔧 Creating payment system tables...';
PRINT '';

-- Drop existing tables if they exist (in correct order)
IF OBJECT_ID('dbo.Invoices', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.Invoices;
    PRINT '🗑️ Dropped existing Invoices table';
END

IF OBJECT_ID('dbo.Transactions', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.Transactions;
    PRINT '🗑️ Dropped existing Transactions table';
END

PRINT '';

-- Create Transactions Table
CREATE TABLE dbo.Transactions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id),
    Amount DECIMAL(10,2) NOT NULL,
    Currency NVARCHAR(3) NOT NULL DEFAULT 'USD',
    Status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Stripe Integration Fields
    StripePaymentIntentId NVARCHAR(255) NULL,
    StripeChargeId NVARCHAR(255) NULL,
    StripeCustomerId NVARCHAR(255) NULL,
    
    -- Payment Details
    PaymentMethod NVARCHAR(50) NOT NULL, -- 'card', 'bank_transfer', etc.
    PaymentMethodLast4 NVARCHAR(4) NULL, -- Last 4 digits of card
    PaymentMethodBrand NVARCHAR(20) NULL, -- 'visa', 'mastercard', etc.
    
    -- Refund Information
    RefundReason NVARCHAR(MAX) NULL,
    RefundAmount DECIMAL(10,2) NULL,
    
    -- Metadata
    Metadata NVARCHAR(MAX) NULL, -- JSON for additional data
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    RefundedAt DATETIME2 NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

PRINT '✅ Created Transactions table';

-- Create Invoices Table
CREATE TABLE dbo.Invoices (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TransactionId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Transactions(Id),
    
    -- Invoice Details
    InvoiceNumber NVARCHAR(50) NOT NULL UNIQUE,
    
    -- Amounts
    Amount DECIMAL(10,2) NOT NULL,
    TaxAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    TotalAmount DECIMAL(10,2) NOT NULL, -- Total will be calculated in application
    
    -- Currency
    Currency NVARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Billing Information (snapshot at purchase time)
    BillingName NVARCHAR(200) NULL,
    BillingEmail NVARCHAR(255) NULL,
    BillingAddress NVARCHAR(MAX) NULL, -- JSON with full address
    
    -- Tax Information
    TaxRate DECIMAL(5,2) NULL, -- Tax percentage applied
    TaxId NVARCHAR(50) NULL, -- Customer's tax ID if provided
    
    -- PDF Storage
    PdfUrl NVARCHAR(500) NULL,
    PdfGeneratedAt DATETIME2 NULL,
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

PRINT '✅ Created Invoices table';
PRINT '';

-- Create Indexes for Performance
CREATE INDEX IX_Transactions_UserId ON dbo.Transactions(UserId);
CREATE INDEX IX_Transactions_CourseId ON dbo.Transactions(CourseId);
CREATE INDEX IX_Transactions_Status ON dbo.Transactions(Status);
CREATE INDEX IX_Transactions_CreatedAt ON dbo.Transactions(CreatedAt DESC);
CREATE INDEX IX_Transactions_StripePaymentIntentId ON dbo.Transactions(StripePaymentIntentId);

PRINT '✅ Created indexes on Transactions table';

CREATE INDEX IX_Invoices_TransactionId ON dbo.Invoices(TransactionId);
CREATE INDEX IX_Invoices_InvoiceNumber ON dbo.Invoices(InvoiceNumber);
CREATE INDEX IX_Invoices_CreatedAt ON dbo.Invoices(CreatedAt DESC);

PRINT '✅ Created indexes on Invoices table';
PRINT '';

PRINT '📊 Payment system tables created successfully!';
PRINT '';
PRINT '📋 Table Details:';
PRINT '   ┌─ Transactions';
PRINT '   │   ├─ Stores all payment transactions';
PRINT '   │   ├─ Links to Users and Courses';
PRINT '   │   ├─ Tracks Stripe payment IDs';
PRINT '   │   ├─ Handles refunds and status tracking';
PRINT '   │   └─ Includes payment method details';
PRINT '   │';
PRINT '   └─ Invoices';
PRINT '       ├─ One invoice per transaction';
PRINT '       ├─ Unique invoice numbers';
PRINT '       ├─ Calculates tax automatically';
PRINT '       ├─ Stores billing snapshot';
PRINT '       └─ PDF storage support';
PRINT '';
PRINT '✅ Migration completed successfully!';

GO
