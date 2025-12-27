# Gmail Email Service Setup Guide

**Easy alternative to SendGrid - Use your existing Gmail account!**

**Time**: 5-10 minutes  
**Cost**: FREE  
**Requirements**: Gmail account (or Google Workspace)

---

## Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Click **"2-Step Verification"**
3. Follow steps to enable (if not already enabled)

---

## Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords

2. **Select app**: Choose **"Mail"**

3. **Select device**: Choose **"Other (Custom name)"**
   - Enter: `Mishin Learn Platform`

4. Click **"Generate"**

5. **Copy the 16-character password** (example: `abcd efgh ijkl mnop`)
   - ⚠️ **Save it now** - you can't see it again!

---

## Step 3: Install Nodemailer

```powershell
cd server
npm install nodemailer
npm install --save-dev @types/nodemailer
```

---

## Step 4: Replace EmailService

**Backup current service:**
```powershell
Rename-Item server/src/services/EmailService.ts EmailService.sendgrid.ts.bak
```

**Use new Gmail service:**
```powershell
# Rename the nodemailer version to active
Rename-Item server/src/services/EmailService.nodemailer.ts EmailService.ts
```

---

## Step 5: Update .env File

```env
# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**Replace**:
- `your-email@gmail.com` with your Gmail address
- `abcd efgh ijkl mnop` with the 16-char app password from Step 2

---

## Step 6: Restart Server

```powershell
# Stop server (Ctrl+C) then restart
cd server
npm run dev
```

**Look for**:
```
✅ Gmail email service configured
✅ Gmail SMTP ready to send emails
```

---

## Step 7: Test It!

1. Register a new account on your platform
2. Check console - should say "✅ Email sent to..."
3. **Check your email inbox** for verification code
4. Success! 🎉

---

## Gmail Sending Limits

| Tier | Daily Limit |
|------|-------------|
| **Free Gmail** | **500 emails/day** |
| **Google Workspace** | **2,000 emails/day** |

**More than enough for development and small-scale production!**

---

## Troubleshooting

### "Invalid credentials" error
- Double-check app password (no spaces)
- Ensure 2FA is enabled
- Try generating a new app password

### Emails not arriving
- Check spam folder
- Verify GMAIL_USER is correct
- Check server console for errors

### "Connection timeout"
- Check firewall settings
- Try different network (some block SMTP port 587)

---

## Security Notes

✅ **App passwords are safer than your real password**  
✅ **Can be revoked anytime** (https://myaccount.google.com/apppasswords)  
✅ **Limited to email sending only**  
✅ **Never commit .env file to git** (already in .gitignore)

---

## Comparison: Gmail vs SendGrid

| Feature | Gmail (Free) | SendGrid (Free) |
|---------|--------------|-----------------|
| Setup time | 5 min ✅ | 15 min (with verification) |
| Daily limit | 500 | 100 |
| Signup required | Use existing Gmail ✅ | New account |
| Email verification | None ✅ | Required |
| Deliverability | Excellent | Excellent |
| Cost | FREE | FREE |

**Gmail wins for development!** 🏆

---

## When to Switch to SendGrid?

Consider switching when:
- Need > 500 emails/day
- Want dedicated IP address
- Need advanced analytics
- Want email templates management
- Going to production at scale

But Gmail is **perfect for now**! ✅
