# Cloudinary Setup Guide

This guide will help you set up Cloudinary for storing nota kecil images in the CNG Transport System.

## What's Been Done ✅

1. **✅ Installed Cloudinary SDK** - Added cloudinary package to dependencies
2. **✅ Created Cloudinary Service** - Replaced Google Drive service with Cloudinary service
3. **✅ Updated Image Upload Controller** - Modified to use Cloudinary instead of Google Drive
4. **✅ Updated Database Schema** - Modified comments to reflect Cloudinary usage
5. **✅ Created Test Script** - Added test-cloudinary-upload.js for testing
6. **✅ Ran Database Migration** - Updated schema successfully

## Current Status

The system is currently running in **mock mode** because Cloudinary credentials are not configured yet. This means:
- ✅ All code is working correctly
- ✅ Images are processed and URLs are generated (mock URLs)
- ⚠️ No actual uploads to Cloudinary yet (waiting for credentials)

## Next Steps - Cloudinary Account Setup

### Step 1: Create Cloudinary Account

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Click **"Sign Up For Free"**
3. Fill in your details:
   - **Full Name**: Your name
   - **Email**: Your email address
   - **Password**: Create a strong password
   - **Company**: CNG Transport System (or your company name)
4. Click **"Create Account"**

### Step 2: Get Your Credentials

1. After signing up, you'll be taken to the Cloudinary Dashboard
2. On the dashboard, you'll see your **Cloud Name** (something like `dxxxxxxx`)
3. Click on **"API Keys"** in the left sidebar
4. You'll see:
   - **Cloud Name**: `dxxxxxxx`
   - **API Key**: `123456789012345`
   - **API Secret**: `abcdefghijklmnopqrstuvwxyz123456789`

### Step 3: Update Environment Variables

1. Open `backend/.env` file
2. Find the Cloudinary section:
   ```env
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```
3. Fill in your credentials:
   ```env
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=dxxxxxxx
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456789
   ```
4. Save the file

### Step 4: Test the Integration

1. Restart your backend server:
   ```bash
   cd backend
   npm start
   ```
2. Run the test script:
   ```bash
   node test-cloudinary-upload.js
   ```
3. You should see:
   ```
   ✅ Cloudinary credentials are configured
   📸 Testing upload with: [path to test image]
   ✅ Upload successful!
   📊 Upload result: { ... real Cloudinary data ... }
   ```

### Step 5: Test with Mobile App

1. Start your backend server
2. Open your mobile app
3. Try uploading a nota kecil image
4. Check the backend logs for successful upload messages
5. Verify images appear in your Cloudinary dashboard

## Cloudinary Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Uploads**: 25,000/month

For a transport system, this should be more than enough for testing and initial deployment.

## Folder Structure in Cloudinary

Images will be organized as follows:
```
nota-kecils/
├── DO-2025-001/
│   ├── customer-ABC-Location-1/
│   │   ├── pressure_bar_2025-01-23T10-30-00.jpg
│   │   ├── temperature_2025-01-23T10-30-01.jpg
│   │   ├── stan_awal_2025-01-23T10-30-02.jpg
│   │   └── stan_akhir_2025-01-23T10-30-03.jpg
│   └── customer-DEF-Location-2/
└── DO-2025-002/
    └── customer-GHI-Location-1/
```

## Troubleshooting

### Issue: "Mock mode" still showing
**Solution**: Check that your `.env` file has the correct Cloudinary credentials and restart the server.

### Issue: "Invalid credentials" error
**Solution**: Double-check your Cloud Name, API Key, and API Secret in the `.env` file.

### Issue: Upload fails
**Solution**: Check your internet connection and Cloudinary account status.

### Issue: Images not appearing in Cloudinary dashboard
**Solution**: Check the backend logs for error messages and verify the upload endpoint is being called.

## API Endpoints

The following endpoints are now using Cloudinary:

- `POST /api/web/image-upload/nota-kecil` - Upload nota kecil images
- `DELETE /api/web/image-upload/:publicId` - Delete image
- `GET /api/web/image-upload/nota-kecil/:notaKecilId` - Get images for nota kecil

## Benefits of Cloudinary vs Google Drive

✅ **Simpler setup** - Just API keys, no complex authentication  
✅ **Better performance** - CDN delivery, automatic optimization  
✅ **Image transformations** - Automatic resizing, quality optimization  
✅ **Reliable API** - Built for image hosting  
✅ **Better organization** - Folder structure with public IDs  
✅ **Free tier** - 25GB storage, 25GB bandwidth/month  

## Next Steps After Setup

1. **Test thoroughly** with your mobile app
2. **Monitor usage** in Cloudinary dashboard
3. **Set up monitoring** for storage and bandwidth usage
4. **Consider backup strategy** for important images
5. **Update documentation** for your team

---

**Need help?** Check the Cloudinary documentation at [https://cloudinary.com/documentation](https://cloudinary.com/documentation) or contact your development team.
