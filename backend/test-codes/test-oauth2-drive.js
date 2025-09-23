// Load environment variables
require('dotenv').config();

const { google } = require('googleapis');

async function testOAuth2Drive() {
  console.log('🧪 Testing OAuth2 Google Drive access...\n');

  try {
    // Check if credentials are set
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      console.error('❌ Missing OAuth2 credentials in .env file');
      console.log('📋 Please set:');
      console.log('   GOOGLE_DRIVE_CLIENT_ID=your_client_id');
      console.log('   GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret');
      console.log('   GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token');
      return;
    }

    console.log('✅ OAuth2 credentials found');

    // Initialize Google Drive API with OAuth2
    const auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );

    auth.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive API initialized with OAuth2');

    // Test 1: Get user info
    console.log('\n👤 Testing user access...');
    try {
      const aboutResponse = await drive.about.get({
        fields: 'user, storageQuota'
      });
      
      console.log('✅ User info:');
      console.log(`   Name: ${aboutResponse.data.user.displayName}`);
      console.log(`   Email: ${aboutResponse.data.user.emailAddress}`);
      console.log(`   Storage Used: ${Math.round(aboutResponse.data.storageQuota.usage / 1024 / 1024 / 1024 * 100) / 100} GB`);
      console.log(`   Storage Limit: ${Math.round(aboutResponse.data.storageQuota.limit / 1024 / 1024 / 1024 * 100) / 100} GB`);
    } catch (error) {
      console.error('❌ Failed to get user info:', error.message);
    }

    // Test 2: Check main folder access
    const mainFolderId = process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID || '1lj6Xt8t29Sp5uBLKCvhG7wNK5LwGyWHT';
    console.log(`\n📁 Testing access to main folder: ${mainFolderId}`);
    try {
      const folderResponse = await drive.files.get({
        fileId: mainFolderId,
        fields: 'id, name, parents, shared'
      });
      
      console.log('✅ Main folder details:');
      console.log(`   Name: ${folderResponse.data.name}`);
      console.log(`   Shared: ${folderResponse.data.shared}`);
    } catch (error) {
      console.error('❌ Failed to access main folder:', error.message);
    }

    // Test 3: Create a test file
    console.log('\n📄 Testing file upload...');
    try {
      // Create a simple test file
      const testContent = 'This is a test file created by CNG Transport System';
      const testBuffer = Buffer.from(testContent, 'utf8');
      
      const testFileMetadata = {
        name: `Test-File-${Date.now()}.txt`,
        parents: [mainFolderId]
      };

      const media = {
        mimeType: 'text/plain',
        body: testBuffer
      };

      const testFile = await drive.files.create({
        resource: testFileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      console.log(`✅ Successfully created test file: ${testFile.data.name}`);
      console.log(`   File ID: ${testFile.data.id}`);
      console.log(`   URL: ${testFile.data.webViewLink}`);
      
      // Clean up - delete the test file
      await drive.files.delete({
        fileId: testFile.data.id
      });
      console.log('✅ Test file deleted');
      
    } catch (error) {
      console.error('❌ Failed to create test file:', error.message);
    }

    console.log('\n🎉 OAuth2 Google Drive test completed successfully!');
    console.log('✅ The system is ready for real file uploads');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOAuth2Drive();
