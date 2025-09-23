const cloudinary = require('cloudinary').v2;

class GoogleDriveService {
  constructor() {
    this.initializeCloudinary();
  }

  initializeCloudinary() {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      console.log('✅ Cloudinary service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Cloudinary service:', error);
    }
  }

  // Mock mode for testing without credentials
  isMockMode() {
    return false; // Cloudinary doesn't need mock mode
  }


  /**
   * Upload image to Cloudinary
   */
  async uploadNotaKecilImage(file, deliveryOrderId, customerName, locationIndex, photoType) {
    try {
      console.log(`📸 Uploading ${photoType} image to Cloudinary...`);
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${photoType}_${deliveryOrderId}_${customerName}_${locationIndex}_${timestamp}`;
      
      // Create folder path for organization
      const folderPath = `nota_kecils/${deliveryOrderId}/${customerName}/location_${locationIndex}`;
      
      // Upload options
      const uploadOptions = {
        folder: folderPath,
        public_id: filename,
        resource_type: 'image',
        format: 'jpg',
        quality: 'auto',
        fetch_format: 'auto'
      };

      let uploadResult;
      
      if (file.buffer) {
        // Upload from buffer
        console.log(`📸 Uploading from buffer, size: ${file.buffer.length} bytes`);
        uploadResult = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          uploadOptions
        );
      } else if (file.path) {
        // Upload from file path
        console.log(`📸 Uploading from file path: ${file.path}`);
        uploadResult = await cloudinary.uploader.upload(file.path, uploadOptions);
      } else {
        throw new Error('File has neither buffer nor path property');
      }

      console.log(`✅ Successfully uploaded ${photoType} image to Cloudinary: ${uploadResult.public_id}`);
      
      return {
        fileId: uploadResult.public_id,
        filename: uploadResult.original_filename,
        publicUrl: uploadResult.secure_url,
        folderPath: folderPath,
        uploadedAt: uploadResult.created_at,
        cloudinaryData: {
          public_id: uploadResult.public_id,
          format: uploadResult.format,
          bytes: uploadResult.bytes,
          width: uploadResult.width,
          height: uploadResult.height
        }
      };
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      throw error;
    }
  }


  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Deleted image from Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(publicId) {
    return cloudinary.url(publicId);
  }

  /**
   * Get thumbnail URL for file
   */
  getThumbnailUrl(publicId) {
    return cloudinary.url(publicId, {
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto'
    });
  }

}

module.exports = new GoogleDriveService();
