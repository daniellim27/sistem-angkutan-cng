# Simple Image Upload Guide

This guide explains how to use the new simple image upload system for nota kecil photos.

## 🎯 **What Changed**

Instead of uploading 4 images at once (which was causing busboy errors), we now upload **one image at a time**. This is much more reliable and easier to handle.

## 📱 **Mobile App Implementation**

### **Old Way (Problematic):**
```javascript
// Upload all 4 images at once - causes busboy errors
const formData = new FormData();
formData.append('Pressure-Bar', image1);
formData.append('Temperature', image2);
formData.append('Stan-Awal', image3);
formData.append('Stan-Akhir', image4);
// Single POST request - often fails
```

### **New Way (Recommended):**
```javascript
// Upload one image at a time - much more reliable
async function uploadNotaKecilImages(images, deliveryOrderId, customerName, locationIndex) {
  const results = [];
  
  const imageTypes = [
    { key: 'pressure_bar', image: images.pressureBar },
    { key: 'temperature', image: images.temperature },
    { key: 'stan_awal', image: images.stanAwal },
    { key: 'stan_akhir', image: images.stanAkhir }
  ];
  
  for (const { key, image } of imageTypes) {
    if (image) {
      try {
        const formData = new FormData();
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `${key}.jpg`
        });
        formData.append('deliveryOrderId', deliveryOrderId);
        formData.append('customerName', customerName);
        formData.append('locationIndex', locationIndex);
        formData.append('photoType', key);
        
        const response = await fetch('http://localhost:3000/api/simple-upload/nota-image', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const result = await response.json();
        if (result.success) {
          results.push({
            type: key,
            url: result.data.imageData.url,
            success: true
          });
        }
      } catch (error) {
        console.error(`Failed to upload ${key}:`, error);
        results.push({
          type: key,
          error: error.message,
          success: false
        });
      }
    }
  }
  
  return results;
}
```

## 🔗 **API Endpoint**

### **Upload Single Image**
```
POST /api/simple-upload/nota-image
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Fields:
- image: File (the image file)
- deliveryOrderId: string (e.g., "24")
- customerName: string (e.g., "ABC Company")
- locationIndex: string (e.g., "1")
- photoType: string (one of: "pressure_bar", "temperature", "stan_awal", "stan_akhir")
- notaKecilId: string (optional, for updating existing record)
```

### **Response**
```json
{
  "success": true,
  "message": "Successfully uploaded pressure_bar image to Google Drive",
  "data": {
    "imageData": {
      "url": "https://drive.google.com/file/d/xyz123/view",
      "filename": "pressure_bar_2025-01-23T10-30-00.jpg",
      "fileId": "xyz123",
      "uploadedAt": "2025-01-23T10:30:00.000Z"
    },
    "deliveryOrderId": "24",
    "customerName": "ABC Company",
    "locationIndex": "1",
    "photoType": "pressure_bar",
    "notaKecilId": "1"
  }
}
```

## ✅ **Benefits**

1. **No more busboy errors** - Single file uploads are much more reliable
2. **Better error handling** - If one image fails, others can still succeed
3. **Progress tracking** - You can show upload progress for each image
4. **Easier debugging** - Clear which image type failed
5. **Google Drive integration** - Back to reliable Google Drive storage

## 🔄 **Migration Steps**

1. **Update mobile app** to use the new single-upload approach
2. **Test with the new endpoint** - `/api/simple-upload/nota-image`
3. **Remove old complex upload code** - The `/api/image-upload/nota-kecil-simple` endpoint
4. **Update UI** to show progress for each image upload

## 🧪 **Testing**

Use the test script to verify the endpoint works:
```bash
cd backend
node test-simple-upload.js
```

## 📝 **Notes**

- Each image upload is **independent** - if one fails, others can still succeed
- **Google Drive** is used for storage (reliable and free)
- **Authentication required** - Make sure to include the Bearer token
- **File size limit** - 10MB per image
- **Supported formats** - JPEG, PNG, GIF

This approach is much simpler and more reliable than the previous complex multi-file upload system!
