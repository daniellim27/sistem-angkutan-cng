// Load environment variables
require('dotenv').config();

const { google } = require('googleapis');

async function createSharedDrive() {
  console.log('🔧 Creating Google Shared Drive...\n');

  try {
    // Initialize Google Drive API
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_DRIVE_KEY_FILE || './google-credentials.json',
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive API initialized');

    // Create Shared Drive
    const sharedDriveMetadata = {
      name: 'CNG Transport System Files',
      description: 'Shared drive for CNG Transport System nota kecil images and documents'
    };

    console.log('🚀 Creating Shared Drive...');
    const sharedDrive = await drive.drives.create({
      requestId: `shared-drive-${Date.now()}`, // Required for Shared Drive creation
      resource: sharedDriveMetadata
    });

    console.log('✅ Shared Drive created successfully!');
    console.log(`📁 Drive Name: ${sharedDrive.data.name}`);
    console.log(`🆔 Drive ID: ${sharedDrive.data.id}`);
    console.log(`🔗 Drive URL: https://drive.google.com/drive/folders/${sharedDrive.data.id}`);

    // Create the main folder structure in the Shared Drive
    console.log('\n📁 Creating folder structure in Shared Drive...');
    
    const mainFolderMetadata = {
      name: 'Nota Kecils',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [sharedDrive.data.id]
    };

    const mainFolder = await drive.files.create({
      resource: mainFolderMetadata,
      fields: 'id, name',
      supportsAllDrives: true
    });

    console.log(`✅ Created main folder: ${mainFolder.data.name} (ID: ${mainFolder.data.id})`);

    // Update the .env file with the new Shared Drive ID
    console.log('\n📝 Updating .env file...');
    const fs = require('fs');
    const path = require('path');
    
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update the main folder ID to point to the Shared Drive folder
    envContent = envContent.replace(
      /GOOGLE_DRIVE_MAIN_FOLDER_ID=.*/,
      `GOOGLE_DRIVE_MAIN_FOLDER_ID=${mainFolder.data.id}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with new folder ID');

    console.log('\n🎉 Setup Complete!');
    console.log('📋 Next steps:');
    console.log('1. Restart the backend server');
    console.log('2. Test the upload functionality');
    console.log('3. The new Shared Drive ID is:', sharedDrive.data.id);

  } catch (error) {
    console.error('❌ Failed to create Shared Drive:', error.message);
    
    if (error.message.includes('insufficient authentication scopes')) {
      console.log('\n💡 Solution: Update the service account scopes in Google Cloud Console:');
      console.log('1. Go to Google Cloud Console');
      console.log('2. Navigate to IAM & Admin → Service Accounts');
      console.log('3. Edit your service account');
      console.log('4. Add these scopes:');
      console.log('   - https://www.googleapis.com/auth/drive');
      console.log('   - https://www.googleapis.com/auth/drive.file');
    }
  }
}

// Run the script
createSharedDrive();
