const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Test Google Drive upload with the specific testOCR1.png file
async function testGoogleDriveUpload() {
  console.log('🧪 Testing Google Drive upload with testOCR1.png...');
  
  try {
    // Initialize Google Drive service
    const auth = new google.auth.GoogleAuth({
      keyFile: './google-credentials.json',
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive service initialized');

    // Read the test file
    const filePath = path.join(__dirname, 'uploads', 'nota_kecil', 'testOCR1.png');
    console.log('📁 Reading file from:', filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath);
    console.log('📸 File size:', fileContent.length, 'bytes');

    // Upload to Google Drive
    const fileName = `testOCR1_${Date.now()}.png`;
    const folderId = '1lj6Xt8t29Sp5uBLKCvhG7wNK5LwGyWHT'; // Main folder ID

    console.log('⬆️ Uploading to Google Drive...');
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId]
      },
      media: {
        mimeType: 'image/png',
        body: fs.createReadStream(filePath)
      }
    });

    console.log('✅ Upload successful!');
    console.log('📄 File ID:', uploadResponse.data.id);
    console.log('📄 File name:', uploadResponse.data.name);

    // Make file public
    await drive.permissions.create({
      fileId: uploadResponse.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const publicUrl = `https://drive.google.com/uc?export=view&id=${uploadResponse.data.id}`;
    console.log('🌐 Public URL:', publicUrl);

    return {
      success: true,
      fileId: uploadResponse.data.id,
      fileName: uploadResponse.data.name,
      publicUrl: publicUrl
    };

  } catch (error) {
    console.error('❌ Google Drive upload failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testGoogleDriveUpload().then(result => {
  console.log('\n📊 Test Result:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
