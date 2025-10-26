# Email Logging Test Guide

## What Logs You Should See

### 1. **When Server Starts:**
```
🔧 Email Service Configuration: { host: 'smtp.gmail.com', ... }
📧 Initializing email service...
🔍 Testing email service connection...
✅ Email service connection verified successfully!
✅ Email service ready!
```

### 2. **When Password Reset is Requested:**
```
🚀 Starting password reset email process...
📧 Email: user@example.com
👤 User: John Doe
📧 ========================================
📧 CALLING sendPasswordResetEmail
📧 Email: user@example.com
📧 User: John Doe
📧 Token: abc123def4...
📧 Attempting to send email to: user@example.com
📧 Email configuration: { from: '...', to: '...', subject: '...' }
📧 Reset URL: http://...
✅ Password reset email sent successfully!
Message ID: ...
Response: 250 2.0.0 OK...
✅ Email sent successfully!
```

### 3. **If Email Fails:**
```
📧 ========================================
📧 CALLING sendPasswordResetEmail
📧 Email: user@example.com
...
❌ Error sending password reset email:
Error message: ...
Error code: ...
Error command: ...
Error response: ...
Full error: ...
❌ Email failed to send: ...
```

### 4. **If No Logs Appear:**

This means the controller isn't being called at all! Check:
1. Is the route properly configured?
2. Is the endpoint being hit?
3. Check network logs/API calls

## Testing Steps:

1. **Check if server started correctly:**
   - Look for email configuration logs
   - Look for "Email service ready!" message

2. **Trigger a password reset:**
   - Go to forgot password page
   - Enter a valid email
   - Submit the form

3. **Check logs for the sequence:**
   - "Starting password reset email process..."
   - "CALLING sendPasswordResetEmail"
   - "Attempting to send email to..."
   - Either success or error message

## Common Issues:

### No logs at all (not even "Starting password reset...")
**Problem**: Route not being called or endpoint not hit
**Solution**: Check if the API request is reaching the server

### Logs start but stop at "CALLING sendPasswordResetEmail"
**Problem**: Nodemailer transporter issue
**Solution**: Check SMTP configuration

### Logs show error with "EAUTH"
**Problem**: Authentication failed
**Solution**: Check Gmail app password

### Logs show "ETIMEDOUT" or "ECONNREFUSED"
**Problem**: Network/firewall issue
**Solution**: Check if port 587 is open or use port 465 with SSL

