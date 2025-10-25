const emailService = require('./services/emailService');

async function testEmailService() {
    console.log('🧪 Testing Email Service...\n');

    // Test connection
    console.log('1. Testing SMTP connection...');
    const connectionTest = await emailService.testConnection();

    if (!connectionTest) {
        console.log('❌ SMTP connection failed. Please check your email configuration.');
        console.log('\n📝 To configure email service, set these environment variables:');
        console.log('   SMTP_HOST=smtp.gmail.com');
        console.log('   SMTP_PORT=587');
        console.log('   SMTP_USER=your-email@gmail.com');
        console.log('   SMTP_PASS=your-app-password');
        console.log('\n💡 For Gmail, you need to use an App Password, not your regular password.');
        console.log('   Go to: Google Account > Security > 2-Step Verification > App passwords');
        return;
    }

    console.log('✅ SMTP connection successful!\n');

    // Test sending email
    console.log('2. Testing password reset email...');
    const testEmail = 'test@example.com';
    const testToken = 'test-token-12345';
    const testUserName = 'Test User';

    const emailResult = await emailService.sendPasswordResetEmail(
        testEmail,
        testToken,
        testUserName
    );

    if (emailResult.success) {
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${emailResult.messageId}`);
    } else {
        console.log('❌ Failed to send test email:', emailResult.error);
    }

    console.log('\n🎉 Email service test completed!');
}

// Run the test
testEmailService().catch(console.error);
