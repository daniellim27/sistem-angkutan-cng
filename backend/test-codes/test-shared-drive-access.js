// Load environment variables
require('dotenv').config();

const { google } = require('googleapis');

async function testSharedDriveAccess() {
  console.log('🧪 Testing Shared Drive access...\n');

  try {
    // Initialize Google Drive API
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_DRIVE_KEY_FILE || './google-credentials.json',
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive'
      ]
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive API initialized');

    // Test 1: List Shared Drives
    console.log('\n📋 Testing Shared Drives access...');
    try {
      const sharedDrivesResponse = await drive.drives.list({
        fields: 'drives(id, name, capabilities)'
      });
      
      console.log(`✅ Found ${sharedDrivesResponse.data.drives?.length || 0} Shared Drives:`);
      sharedDrivesResponse.data.drives?.forEach((drive, index) => {
        console.log(`  ${index + 1}. ${drive.name} (ID: ${drive.id})`);
      });
    } catch (error) {
      console.error('❌ Failed to list Shared Drives:', error.message);
    }

    // Test 2: Check main folder access
    const mainFolderId = '1lj6Xt8t29Sp5uBLKCvhG7wNK5LwGyWHT';
    console.log(`\n📁 Testing access to main folder: ${mainFolderId}`);
    try {
      const folderResponse = await drive.files.get({
        fileId: mainFolderId,
        fields: 'id, name, parents, driveId, shared',
        supportsAllDrives: true
      });
      
      console.log('✅ Main folder details:');
      console.log(`  Name: ${folderResponse.data.name}`);
      console.log(`  Drive ID: ${folderResponse.data.driveId}`);
      console.log(`  Shared: ${folderResponse.data.shared}`);
      console.log(`  Parents: ${folderResponse.data.parents?.join(', ') || 'Root'}`);
    } catch (error) {
      console.error('❌ Failed to access main folder:', error.message);
    }

    // Test 3: Try to list files in main folder
    console.log(`\n📂 Testing file listing in main folder...`);
    try {
      const filesResponse = await drive.files.list({
        q: `parents in '${mainFolderId}' and trashed=false`,
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 5
      });
      
      console.log(`✅ Found ${filesResponse.data.files?.length || 0} files in main folder:`);
      filesResponse.data.files?.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.mimeType})`);
      });
    } catch (error) {
      console.error('❌ Failed to list files in main folder:', error.message);
    }

    // Test 4: Try to create a test folder
    console.log(`\n📁 Testing folder creation...`);
    try {
      const testFolderMetadata = {
        name: `Test-Folder-${Date.now()}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [mainFolderId]
      };

      const testFolder = await drive.files.create({
        resource: testFolderMetadata,
        fields: 'id, name',
        supportsAllDrives: true
      });

      console.log(`✅ Successfully created test folder: ${testFolder.data.name} (ID: ${testFolder.data.id})`);
      
      // Clean up - delete the test folder
      await drive.files.delete({
        fileId: testFolder.data.id,
        supportsAllDrives: true
      });
      console.log('✅ Test folder deleted');
      
    } catch (error) {
      console.error('❌ Failed to create test folder:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSharedDriveAccess();
