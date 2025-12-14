# Invoice PDF Generation - Testing Guide

**Date**: December 14, 2025  
**Feature**: Phase 3 - Invoice PDF Generation

---

## 🚀 Quick Test Steps

### 1. Start Servers

**Terminal 1 - Backend:**
```powershell
cd D:\exampleProjects\startupexample1\server
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd D:\exampleProjects\startupexample1\client
npm run dev
```

---

### 2. Make a Test Purchase

1. Open browser: `http://localhost:5173`
2. Login with your test account
3. Navigate to a **paid course** (Price > $0)
4. Click **"Purchase Course - $X.XX"** button
5. You should be redirected to checkout page
6. Fill in test card details:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: `12/26` (any future date)
   - **CVC**: `123`
   - **Name**: Your name
7. Click **"Pay"**
8. Wait for redirect to success page with confetti 🎉

---

### 3. Check Server Logs

In the **backend terminal**, look for these logs:

```
✅ Payment intent created: pi_... for user ...
✅ Payment success processed for payment intent pi_...
✅ Invoice generated: INV-1734... (PDF: /uploads/invoices/invoice_INV-...pdf)
✅ Enrollment confirmed for user ... in course ...
```

**If you see "Invoice generated" with PDF path** → ✅ PDF created successfully!

---

### 4. Verify PDF File Exists

Check the file system:

```powershell
# List invoice PDFs
Get-ChildItem D:\exampleProjects\startupexample1\server\uploads\invoices\*.pdf | Select-Object Name, Length, LastWriteTime

# Or view the directory
explorer D:\exampleProjects\startupexample1\server\uploads\invoices
```

**Expected**: You should see a file like `invoice_INV-1734123456-ABCD1234.pdf`

---

### 5. View Invoice in Transactions Page

1. Navigate to: `http://localhost:5173/profile/transactions`
   - OR click your avatar → "Transactions"
2. Find your recent purchase
3. Check the **"Invoice"** column:
   - Should show: Invoice number (e.g., `INV-1734123456-ABCD1234`)
   - Should have a **download icon** (⬇️) button

---

### 6. Download and Open PDF

1. Click the **download icon** next to the invoice number
2. Browser should download the PDF file
3. Open the PDF and verify:

**Expected PDF Content:**
```
┌─────────────────────────────────────────┐
│ Mishin Learn                            │
│ Smart Learning Platform                 │
│                                         │
│                          INVOICE        │
│              Invoice #: INV-1734...     │
│              Date: December 14, 2025    │
│                                         │
│ Bill To:                                │
│ [Your Name]                             │
│ [Your Email]                            │
│                                         │
│ Description              Amount         │
│ ─────────────────────────────────────  │
│ Course: [Course Title]   $X.XX         │
│                                         │
│ Subtotal:                $X.XX         │
│ Tax:                     $0.00         │
│ Total:                   $X.XX         │
│                                         │
│ Payment Method: Card                    │
│                                         │
│ Thank you for your purchase!            │
│ For support, contact us at              │
│ support@mishinlearn.com                 │
│ https://mishinlearn.com                 │
└─────────────────────────────────────────┘
```

---

## ✅ Success Criteria

- [ ] PDF file created in `server/uploads/invoices/`
- [ ] Server logs show "Invoice generated" message
- [ ] Invoice appears in Transactions page
- [ ] Download button works (triggers download)
- [ ] PDF opens and displays correctly
- [ ] PDF contains: Invoice number, date, customer info, course details, amounts
- [ ] PDF has professional formatting (logo, colors, layout)

---

## 🐛 Troubleshooting

### Issue: No invoice in Transactions page

**Solution**: 
- Check if `InvoiceId` field is populated in the transaction
- Verify backend query includes `i.Id as InvoiceId`
- Check server logs for "Invoice generated" message

### Issue: Download button does nothing

**Check**:
1. Browser console for errors (F12 → Console)
2. Network tab - look for 403/404 errors
3. Verify you're logged in (token exists)

### Issue: PDF file not found error

**Verify**:
```powershell
# Check directory exists
Test-Path D:\exampleProjects\startupexample1\server\uploads\invoices
# If false, create it:
New-Item -Path D:\exampleProjects\startupexample1\server\uploads\invoices -ItemType Directory -Force
```

### Issue: PDF generation error in logs

**Check**:
- PDFKit installed: `npm list pdfkit` (in server directory)
- User has FirstName and LastName in database
- Course has Title in database

---

## 📝 Manual Backend Test (Optional)

If you want to test the endpoint directly:

```powershell
# Get your auth token from localStorage in browser console:
# localStorage.getItem('token')

# Replace {TOKEN} and {INVOICE_ID} with actual values
curl -H "Authorization: Bearer {TOKEN}" http://localhost:3001/api/payments/invoice/{INVOICE_ID}/download --output test-invoice.pdf
```

---

## 🎯 Next Steps After Testing

If all tests pass:
- ✅ Mark Phase 3 as complete
- 🎉 Invoice PDF generation is working!
- 📋 Move to Phase 4 (Refund UI) or Phase 5 (Error Handling)

If tests fail:
- Share the error message/logs
- We'll debug together

---

**Ready to test? Start the servers and follow steps 1-6!** 🚀
