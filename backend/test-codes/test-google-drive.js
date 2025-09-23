// Test script for Google Drive integration
require('dotenv').config();
const googleDriveService = require('./src/services/googleDriveService');

async function testGoogleDrive() {
  try {
    console.log('🧪 Testing Google Drive integration...');
    
    // Test folder creation
    console.log('📁 Testing folder creation...');
    const folderStructure = await googleDriveService.createFolderStructure(
      'JACK-2025-001',
      'Test Customer',
      1
    );
    
    console.log('✅ Folder structure created:', folderStructure);
    
    // Test listing files in main folder
    console.log('📋 Testing file listing...');
    const files = await googleDriveService.listFilesInFolder(googleDriveService.mainFolderId);
    console.log('✅ Files in main folder:', files.length);
    
    console.log('🎉 Google Drive integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Google Drive test failed:', error.message);
    console.log('💡 Make sure you have:');
    console.log('   1. Created google-credentials.json file');
    console.log('   2. Shared the main folder with the service account');
    console.log('   3. Set GOOGLE_DRIVE_KEY_FILE in .env');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testGoogleDrive();
}

module.exports = testGoogleDrive;

