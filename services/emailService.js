const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Use environment variables with fallback to hardcoded values
        const smtpConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || 'vishal0077@gmail.com',
                pass: process.env.SMTP_PASS || 'guut cccy vsoz wtxr'
            }
        };

        console.log('🔧 Email Service Configuration:', {
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            user: smtpConfig.auth.user
        });

        this.transporter = nodemailer.createTransport(smtpConfig);

        // Verify connection on initialization (non-blocking)
        this.initializeEmail().catch(err => {
            console.error('⚠️ Email service initialization warning:', err.message);
            console.log('📧 Emails may not work until SMTP is properly configured');
        });
    }

    async initializeEmail() {
        console.log('📧 Initializing email service...');
        const result = await this.testConnection();
        if (result) {
            console.log('✅ Email service ready!');
        }
        return result;
    }

    async sendPasswordResetEmail(email, resetToken, userName) {
        console.log('📧 ========================================');
        console.log('📧 CALLING sendPasswordResetEmail');
        console.log('📧 Email:', email);
        console.log('📧 User:', userName);
        console.log('📧 Token:', resetToken.substring(0, 10) + '...');
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        const htmlTemplate = this.generatePasswordResetTemplate(userName, resetUrl, email);

        const mailOptions = {
            from: `"${process.env.COMPANY_NAME || 'Cly App'}" <${process.env.SMTP_USER || 'vishal0077@gmail.com'}>`,
            to: email,
            subject: 'Reset Your Password - Cly App',
            html: htmlTemplate
        };

        console.log('📧 Attempting to send email to:', email);
        console.log('📧 Email configuration:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });
        console.log('📧 Reset URL:', resetUrl);

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent successfully!');
            console.log('Message ID:', result.messageId);
            console.log('Response:', result.response);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Error sending password reset email:');
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error command:', error.command);
            console.error('Error response:', error.response);
            console.error('Full error:', error);
            return { success: false, error: error.message };
        }
    }

    generatePasswordResetTemplate(userName, resetUrl, email = '') {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f8fafc;
                }
                
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                }
                
                .header {
                    background: linear-gradient(135deg, #EF6A22 0%, #FF8C42 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                
                .header-subtitle {
                    font-size: 16px;
                    opacity: 0.9;
                }
                
                .content {
                    padding: 40px 30px;
                }
                
                .greeting {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 20px;
                }
                
                .message {
                    font-size: 16px;
                    color: #4a5568;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                
                .reset-button {
                    display: inline-block;
                    background: linear-gradient(135deg, #EF6A22 0%, #FF8C42 100%);
                    color: white;
                    text-decoration: none;
                    padding: 16px 32px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    text-align: center;
                    margin: 20px 0;
                    box-shadow: 0 4px 12px rgba(239, 106, 34, 0.3);
                    transition: all 0.3s ease;
                }
                
                .reset-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(239, 106, 34, 0.4);
                }
                
                .security-note {
                    background-color: #f7fafc;
                    border-left: 4px solid #4299e1;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 0 8px 8px 0;
                }
                
                .security-note h3 {
                    color: #2d3748;
                    font-size: 16px;
                    margin-bottom: 10px;
                }
                
                .security-note p {
                    color: #4a5568;
                    font-size: 14px;
                    margin: 5px 0;
                }
                
                .footer {
                    background-color: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin-bottom: 15px;
                }
                
                .social-links {
                    margin: 20px 0;
                }
                
                .social-link {
                    display: inline-block;
                    margin: 0 10px;
                    color: #EF6A22;
                    text-decoration: none;
                    font-weight: 500;
                }
                
                .company-info {
                    color: #a0aec0;
                    font-size: 12px;
                    margin-top: 20px;
                }
                
                .divider {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
                    margin: 30px 0;
                }
                
                @media (max-width: 600px) {
                    .email-container {
                        margin: 10px;
                        border-radius: 8px;
                    }
                    
                    .header, .content, .footer {
                        padding: 20px;
                    }
                    
                    .greeting {
                        font-size: 20px;
                    }
                    
                    .reset-button {
                        display: block;
                        width: 100%;
                        text-align: center;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <!-- Header -->
                <div class="header">
                    <div class="logo">CLY APP</div>
                    <div class="header-subtitle">Reset Your Password</div>
                </div>
                
                <!-- Content -->
                <div class="content">
                    <div class="greeting">Hello ${userName || 'Valued Customer'}!</div>
                    
                    <div class="message">
                        We received a request to reset your password for your Cly App account. 
                        If you made this request, click the button below to reset your password.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="reset-button">Reset My Password</a>
                    </div>
                    
                    <div class="security-note">
                        <h3>🔒 Security Information</h3>
                        <p>• This link will expire in 1 hour for your security</p>
                        <p>• If you didn't request this password reset, please ignore this email</p>
                        <p>• Never share this link with anyone</p>
                        <p>• For security reasons, this link can only be used once</p>
                    </div>
                    
                    <div class="message">
                        If the button above doesn't work, you can copy and paste the following link into your browser:
                    </div>
                    
                    <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 14px; color: #4a5568; margin: 20px 0;">
                        ${resetUrl}
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <!-- Footer -->
                <div class="footer">
                    <div class="footer-text">
                        Need help? Contact our support team
                    </div>
                    
                    <div class="social-links">
                        <a href="#" class="social-link">Support</a>
                        <a href="#" class="social-link">Help Center</a>
                        <a href="#" class="social-link">Contact Us</a>
                    </div>
                    
                    <div class="company-info">
                        <p>© 2024 Cly App. All rights reserved.</p>
                        <p>This email was sent to ${email}. If you have any questions, please contact us.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async testConnection() {
        try {
            console.log('🔍 Testing email service connection...');
            const result = await this.transporter.verify();
            console.log('✅ Email service connection verified successfully!');
            return true;
        } catch (error) {
            console.error('❌ Email service connection failed!');
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Full error:', error);
            console.log('💡 Troubleshooting tips:');
            console.log('   1. Check if Gmail app password is correct');
            console.log('   2. Enable "Less secure app access" or use app password');
            console.log('   3. Check firewall/network restrictions on port 587');
            console.log('   4. Verify SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env variables');
            return false;
        }
    }
}

module.exports = new EmailService();
