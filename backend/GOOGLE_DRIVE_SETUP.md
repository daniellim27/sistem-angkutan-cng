# Google Drive Integration Setup

This document explains how to set up Google Drive integration for image storage in the CNG Transport System.

## Prerequisites

1. Google Cloud Platform account
2. Google Drive API enabled
3. Service account with Drive API permissions

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note down your project ID

### 2. Enable Google Drive API

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and enable it

### 3. Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the details:
   - Name: `cng-transport-gdrive`
   - Description: `Service account for CNG Transport System Google Drive integration`
4. Click "Create and Continue"
5. Skip role assignment for now
6. Click "Done"

### 4. Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the JSON file
6. Rename it to `google-credentials.json`
7. Place it in the `backend/` directory

### 5. Share Main Folder with Service Account

1. Open the main Google Drive folder: https://drive.google.com/drive/folders/1lj6Xt8t29Sp5uBLKCvhG7wNK5LwGyWHT
2. Click "Share" button
3. Add the service account email (from the JSON file) as a collaborator
4. Give it "Editor" permissions
5. Click "Send"

### 6. Environment Variables

Add these to your `.env` file:

```env
# Google Drive Configuration
GOOGLE_DRIVE_KEY_FILE=./google-credentials.json
GOOGLE_DRIVE_MAIN_FOLDER_ID=1lj6Xt8t29Sp5uBLKCvhG7wNK5LwGyWHT
GOOGLE_DRIVE_BASE_FOLDER_NAME=CNG Transport System
GOOGLE_DRIVE_NOTA_KECILS_FOLDER=Nota Kecils
```

### 7. Run Database Migration

```bash
npm run migrate
```

This will add the new image URL columns to the `nota_kecils` table.

## Folder Structure

The system will create the following folder structure in Google Drive:

```
CNG Transport System/
├── Nota Kecils/
│   ├── 2025/
│   │   ├── 01-January/
│   │   │   ├── JACK-2025-001/
│   │   │   │   ├── Customer-ABC-Location-1/
│   │   │   │   │   ├── Pressure-Bar/
│   │   │   │   │   ├── Temperature/
│   │   │   │   │   ├── Stan-Awal/
│   │   │   │   │   └── Stan-Akhir/
│   │   │   │   └── Customer-DEF-Location-2/
│   │   │   └── JACK-2025-002/
│   │   └── 02-February/
│   └── Archive/
```

## API Endpoints

### Upload Images
```
POST /api/web/image-upload/nota-kecil
Content-Type: multipart/form-data

Fields:
- images: File[] (multiple image files)
- deliveryOrderId: string
- customerName: string
- locationIndex: number
- notaKecilId: string (optional)
```

### Get Images
```
GET /api/web/image-upload/nota-kecil/:notaKecilId
```

### Delete Image
```
DELETE /api/web/image-upload/:fileId
```

## Testing

1. Start the backend server
2. Test the upload endpoint with Postman or similar tool
3. Check if images appear in the correct Google Drive folder
4. Verify the database is updated with the new URLs

## Troubleshooting

### Common Issues

1. **"File not found" error**: Make sure `google-credentials.json` is in the correct location
2. **"Permission denied" error**: Ensure the service account has access to the main folder
3. **"API not enabled" error**: Verify Google Drive API is enabled in your project
4. **"Invalid credentials" error**: Check if the service account key is valid and not expired

### Debug Mode

Set `NODE_ENV=development` to see detailed logs:

```bash
NODE_ENV=development npm start
```

## Security Notes

1. Never commit `google-credentials.json` to version control
2. Use environment variables for sensitive configuration
3. Regularly rotate service account keys
4. Monitor API usage in Google Cloud Console
5. Set up proper IAM permissions for the service account

## Cost Considerations

- Google Drive API has quotas and limits
- Monitor usage in Google Cloud Console
- Consider implementing rate limiting for high-volume usage
- Archive old images to reduce storage costs

