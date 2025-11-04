# Email Service Troubleshooting Guide

## Common Issues with Nodemailer on Live Server

### Issue: Emails Not Sending on Live Server

#### 1. **Check Server Logs**

When the server starts, you should see:
```
🔧 Email Service Configuration: { host: 'smtp.gmail.com', ... }
🔍 Testing email service connection...
✅ Email service connection verified successfully!
```

If you see connection errors, the problem is with the SMTP configuration.

#### 2. **Gmail App Password Issues**

**Problem**: Gmail app passwords can expire or be revoked.

**Solution**:
1. Go to https://myaccount.google.com/apppasswords
2. Generate a new app password for "Mail"
3. Update the `SMTP_PASS` environment variable or the hardcoded password

**Example .env file**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
```

#### 3. **Port 587 Blocked by Firewall**

**Problem**: Many hosting providers block SMTP port 587.

**Solutions**:

A. **Use Port 465 (SSL)**:
```env
SMTP_PORT=465
SMTP_SECURE=true
```

B. **Use Alternative Email Service**:
   - Use SendGrid (port 587 works better)
   - Use AWS SES
   - Use Mailgun

#### 4. **Network Restrictions**

**Problem**: Some VPS/dedicated servers have strict outbound firewall rules.

**Solution**: Contact your hosting provider to allow outbound SMTP connections on ports 587 and 465.

#### 5. **Environment Variables Not Loaded**

**Problem**: On live server, environment variables might not be loaded.

**Solution**: 
1. Check if `.env` file is present in production
2. Use system environment variables in production:
   ```bash
   export SMTP_USER="your-email@gmail.com"
   export SMTP_PASS="your-app-password"
   ```

#### 6. **2-Factor Authentication Required**

Gmail now requires 2FA for app passwords. Make sure:
1. 2-Step Verification is enabled on your Google Account
2. App password is generated correctly
3. App password hasn't been revoked

### Alternative Email Services

If Gmail doesn't work, consider these alternatives:

#### **SendGrid** (Recommended for Production)
```javascript
transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
        user: 'apikey', // Literally the string "apikey"
        pass: 'your-sendgrid-api-key'
    }
});
```

**Benefits**:
- More reliable than Gmail
- Better deliverability
- Higher sending limits
- Professional email service

#### **AWS SES**
```javascript
transporter = nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    auth: {
        user: 'your-access-key',
        pass: 'your-secret-key'
    }
});
```

#### **Mailgun**
```javascript
transporter = nodemailer.createTransport({
    host: 'smtp.mailgun.org',
    port: 587,
    auth: {
        user: 'your-mailgun-username',
        pass: 'your-mailgun-password'
    }
});
```

### Quick Diagnostic Steps

1. **Test Email Connection on Server**:
   ```javascript
   // Add this to your index.js temporarily
   const emailService = require('./services/emailService');
   emailService.testConnection();
   ```

2. **Check Email Configuration**:
   Look for these logs in your server console:
   ```
   🔧 Email Service Configuration: { ... }
   📧 Attempting to send email to: user@example.com
   ✅ Password reset email sent successfully!
   ```

3. **Monitor Error Messages**:
   The enhanced error logging will show:
   - Error message
   - Error code (specific to the issue)
   - Error response from server
   - SMTP command that failed

### Setting Up Environment Variables

#### For Local Development:

Create `.env` file in `/backend` directory:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=vishal0077@gmail.com
SMTP_PASS=your-app-password-here
FRONTEND_URL=https://api.cursiveletters.in
COMPANY_NAME=Cly App
```

#### For Production:

Set environment variables on your server:
```bash
# On Linux/Unix
export SMTP_USER="your-email@gmail.com"
export SMTP_PASS="your-app-password"

# Or add to /etc/environment (for system-wide)
```

Or use your hosting platform's environment variable settings (most platforms like Heroku, Vercel, AWS, etc. provide this in their dashboards).

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `EAUTH` | Authentication failed | Check username/password |
| `ETIMEDOUT` | Connection timeout | Check firewall/network |
| `ECONNREFUSED` | Connection refused | Server is blocking the port |
| `EENCODING` | Encoding error | Check email content for special characters |

### Testing Email Service

Add this test endpoint to your router temporarily:

```javascript
// In your index.js or a test file
app.get('/test-email', async (req, res) => {
    const emailService = require('./services/emailService');
    const result = await emailService.testConnection();
    
    res.json({
        success: result,
        message: result ? 'Email service is working!' : 'Email service connection failed'
    });
});
```

Then visit: `http://your-server:3300/test-email`

### Recommended Production Setup

For production, use a professional email service:

1. **SendGrid** (easiest, most reliable)
   - Free tier: 100 emails/day
   - Easy setup
   - Good documentation

2. **AWS SES** (cost-effective)
   - Very cheap
   - Requires AWS account
   - Need to verify sending domain

3. **Mailgun** (developer-friendly)
   - Free tier: 5,000 emails/month
   - Good API
   - Easy integration

### Next Steps

1. Check your server logs for email connection status
2. Verify Gmail app password is correct and valid
3. Try using port 465 with SSL if 587 is blocked
4. Consider switching to SendGrid for production

