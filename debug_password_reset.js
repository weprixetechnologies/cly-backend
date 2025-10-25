const passwordResetModel = require('./models/passwordResetModel');
const emailService = require('./services/emailService');

async function debugPasswordReset() {
    console.log('🔍 Debugging Password Reset System...\n');

    try {
        // Test 1: Check if password reset model works
        console.log('1. Testing password reset model...');
        const testToken = 'test-token-12345';
        const testUserId = 'test-user-123';
        const testEmail = 'test@example.com';
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Try to create a test token
        const tokenId = await passwordResetModel.createResetToken(
            testUserId, 
            testEmail, 
            testToken, 
            expiresAt
        );
        console.log('✅ Token created with ID:', tokenId);

        // Try to find the token
        const foundToken = await passwordResetModel.findValidToken(testToken);
        console.log('✅ Token found:', foundToken ? 'Yes' : 'No');

        // Clean up test token
        await passwordResetModel.markTokenAsUsed(testToken);
        console.log('✅ Token marked as used');

    } catch (error) {
        console.error('❌ Password reset model error:', error.message);
    }

    try {
        // Test 2: Check email service
        console.log('\n2. Testing email service...');
        const emailResult = await emailService.sendPasswordResetEmail(
            'test@example.com',
            'test-token-12345',
            'Test User'
        );
        console.log('✅ Email service result:', emailResult.success ? 'Success' : 'Failed');
        if (!emailResult.success) {
            console.error('   Error:', emailResult.error);
        }

    } catch (error) {
        console.error('❌ Email service error:', error.message);
    }

    console.log('\n🎉 Debug completed!');
}

debugPasswordReset().catch(console.error);
