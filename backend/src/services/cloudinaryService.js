const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const path = require('path');

class CloudinaryService {
  constructor() {
    this.initializeCloudinary();
  }

  async initializeCloudinary() {
    try {
      // Configure Cloudinary
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      console.log('✅ Cloudinary service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Cloudinary service:', error);
      throw error;
    }
  }

  // Mock mode for testing without credentials
  isMockMode() {
    return !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET;
  }

  /**
   * Upload nota kecil image to Cloudinary
   */
  async uploadNotaKecilImage(file, deliveryOrderId, customerName, locationIndex, photoType) {
    try {
      // Mock mode for testing without credentials
      if (this.isMockMode()) {
        console.log('🔧 Mock mode: Simulating Cloudinary upload');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${photoType.toLowerCase().replace('-', '_')}_${timestamp}_001.jpg`;
        const mockPublicId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          publicId: mockPublicId,
          filename: filename,
          secureUrl: `https://res.cloudinary.com/mock-cloud/image/upload/v${Date.now()}/${mockPublicId}.jpg`,
          folderPath: `nota-kecils/${deliveryOrderId}/customer-${customerName}-location-${locationIndex}`,
          uploadedAt: new Date().toISOString()
        };
      }

      // Create folder structure for organization
      const folderPath = `nota-kecils/${deliveryOrderId}/customer-${customerName}-location-${locationIndex}`;
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${photoType.toLowerCase().replace('-', '_')}_${timestamp}`;
      
      // Convert buffer to stream if needed
      let fileStream;
      if (file.buffer) {
        fileStream = Readable.from(file.buffer);
      } else if (file.path) {
        fileStream = file.path;
      } else {
        throw new Error('No file data provided');
      }

      // Try direct upload first (simpler and more reliable)
      try {
        console.log(`📸 Uploading to Cloudinary: ${filename}`);
        console.log(`📸 File info:`, {
          hasBuffer: !!file.buffer,
          hasPath: !!file.path,
          mimetype: file.mimetype,
          size: file.buffer ? file.buffer.length : 'unknown'
        });

        let uploadOptions = {
          folder: folderPath,
          public_id: filename,
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        };

        let result;
        if (file.buffer) {
          // Upload from buffer
          result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            uploadOptions
          );
        } else if (file.path) {
          // Upload from file path
          result = await cloudinary.uploader.upload(file.path, uploadOptions);
        } else {
          throw new Error('No file data provided');
        }

        console.log(`✅ Uploaded image: ${filename} (ID: ${result.public_id})`);
        return {
          publicId: result.public_id,
          filename: filename,
          secureUrl: result.secure_url,
          folderPath: folderPath,
          uploadedAt: new Date().toISOString()
        };

      } catch (uploadError) {
        console.error('Direct upload failed, trying stream upload:', uploadError.message);
        
        // Fallback to stream upload
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: folderPath,
              public_id: filename,
              resource_type: 'image',
              quality: 'auto',
              fetch_format: 'auto'
            },
            (error, result) => {
              if (error) {
                console.error('Stream upload also failed:', error);
                reject(error);
              } else {
                console.log(`✅ Stream uploaded image: ${filename} (ID: ${result.public_id})`);
                resolve({
                  publicId: result.public_id,
                  filename: filename,
                  secureUrl: result.secure_url,
                  folderPath: folderPath,
                  uploadedAt: new Date().toISOString()
                });
              }
            }
          );

          // Pipe the file data to the upload stream
          if (file.buffer) {
            const bufferStream = Readable.from(file.buffer);
            bufferStream.pipe(uploadStream);
          } else if (file.path) {
            const fs = require('fs');
            const fileStream = fs.createReadStream(file.path);
            fileStream.pipe(uploadStream);
          } else {
            reject(new Error('No file data provided'));
          }
        });
      }


    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Upload surat jalan image to Cloudinary
   */
  async uploadSuratJalanImage(file, deliveryOrderId) {
    try {
      // Mock mode for testing without credentials
      if (this.isMockMode()) {
        console.log('🔧 Mock mode: Simulating Cloudinary upload for surat jalan');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename = `surat-jalan-photo-${uniqueSuffix}`;
        const mockPublicId = `mock_surat_jalan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          publicId: mockPublicId,
          filename: filename,
          secureUrl: `https://res.cloudinary.com/mock-cloud/image/upload/v${Date.now()}/${mockPublicId}.jpg`,
          folderPath: `surat-jalan-photos/${deliveryOrderId}`,
          uploadedAt: new Date().toISOString()
        };
      }

      // Create folder structure for organization
      const folderPath = `surat-jalan-photos/${deliveryOrderId}`;
      
      // Generate filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      let fileExtension = '';
      
      // Determine file extension from MIME type or original name
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        fileExtension = '.jpg';
      } else if (file.mimetype === 'image/png') {
        fileExtension = '.png';
      } else if (file.originalname) {
        fileExtension = path.extname(file.originalname) || '.jpg';
      } else {
        fileExtension = '.jpg'; // default fallback
      }
      
      const filename = `surat-jalan-photo-${uniqueSuffix}${fileExtension}`;
      
      // Convert buffer to stream if needed
      let fileStream;
      if (file.buffer) {
        fileStream = Readable.from(file.buffer);
      } else if (file.path) {
        fileStream = file.path;
      } else {
        throw new Error('No file data provided');
      }

      // Try direct upload first (simpler and more reliable)
      try {
        console.log(`📸 Uploading surat jalan to Cloudinary: ${filename}`);
        console.log(`📸 File info:`, {
          hasBuffer: !!file.buffer,
          hasPath: !!file.path,
          mimetype: file.mimetype,
          size: file.buffer ? file.buffer.length : 'unknown'
        });

        let uploadOptions = {
          folder: folderPath,
          public_id: filename,
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        };

        let result;
        if (file.buffer) {
          // Upload from buffer
          result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            uploadOptions
          );
        } else if (file.path) {
          // Upload from file path
          result = await cloudinary.uploader.upload(file.path, uploadOptions);
        } else {
          throw new Error('No file data provided');
        }

        console.log(`✅ Uploaded surat jalan image: ${filename} (ID: ${result.public_id})`);
        return {
          publicId: result.public_id,
          filename: filename,
          secureUrl: result.secure_url,
          folderPath: folderPath,
          uploadedAt: new Date().toISOString()
        };

      } catch (uploadError) {
        console.error('Direct upload failed, trying stream upload:', uploadError.message);
        
        // Fallback to stream upload
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: folderPath,
              public_id: filename,
              resource_type: 'image',
              quality: 'auto',
              fetch_format: 'auto'
            },
            (error, result) => {
              if (error) {
                console.error('Stream upload also failed:', error);
                reject(error);
              } else {
                console.log(`✅ Stream uploaded surat jalan image: ${filename} (ID: ${result.public_id})`);
                resolve({
                  publicId: result.public_id,
                  filename: filename,
                  secureUrl: result.secure_url,
                  folderPath: folderPath,
                  uploadedAt: new Date().toISOString()
                });
              }
            }
          );

          // Pipe the file data to the upload stream
          if (file.buffer) {
            const bufferStream = Readable.from(file.buffer);
            bufferStream.pipe(uploadStream);
          } else if (file.path) {
            const fs = require('fs');
            const fileStream = fs.createReadStream(file.path);
            fileStream.pipe(uploadStream);
          } else {
            reject(new Error('No file data provided'));
          }
        });
      }

    } catch (error) {
      console.error('Error uploading surat jalan image to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId) {
    try {
      if (this.isMockMode()) {
        console.log('🔧 Mock mode: Simulating image deletion');
        return true;
      }

      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Deleted image: ${publicId}`);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Get optimized URL for image
   */
  getOptimizedUrl(publicId, options = {}) {
    if (this.isMockMode()) {
      return `https://res.cloudinary.com/mock-cloud/image/upload/v${Date.now()}/${publicId}.jpg`;
    }

    const defaultOptions = {
      quality: 'auto',
      fetch_format: 'auto',
      width: options.width || 'auto',
      height: options.height || 'auto'
    };

    return cloudinary.url(publicId, defaultOptions);
  }

  /**
   * Get thumbnail URL for image
   */
  getThumbnailUrl(publicId, size = 200) {
    if (this.isMockMode()) {
      return `https://res.cloudinary.com/mock-cloud/image/upload/w_${size},h_${size},c_fill/${publicId}.jpg`;
    }

    return cloudinary.url(publicId, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 'auto'
    });
  }

  /**
   * List images in a folder
   */
  async listImagesInFolder(folderPath) {
    try {
      if (this.isMockMode()) {
        console.log('🔧 Mock mode: Simulating folder listing');
        return [];
      }

      const result = await cloudinary.search
        .expression(`folder:${folderPath}`)
        .sort_by([['created_at', 'desc']])
        .max_results(100)
        .execute();

      return result.resources || [];
    } catch (error) {
      console.error('Error listing images in folder:', error);
      throw error;
    }
  }

  /**
   * Get image info
   */
  async getImageInfo(publicId) {
    try {
      if (this.isMockMode()) {
        return {
          public_id: publicId,
          secure_url: `https://res.cloudinary.com/mock-cloud/image/upload/v${Date.now()}/${publicId}.jpg`,
          created_at: new Date().toISOString()
        };
      }

      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error('Error getting image info:', error);
      throw error;
    }
  }

  /**
   * Upload CCTV screenshot to Cloudinary
   * @param {Buffer} imageBuffer - Image buffer
   * @param {number} sessionId - CCTV session ID
   * @param {number} sequenceNumber - Screenshot sequence number
   * @returns {Promise<Object>} Upload result
   */
  async uploadCCTVScreenshot(imageBuffer, sessionId, sequenceNumber) {
    try {
      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        throw new Error('Invalid image buffer provided');
      }

      console.log(`📸 Uploading CCTV screenshot to Cloudinary...`);
      console.log(`Session: ${sessionId}, Sequence: ${sequenceNumber}, Size: ${imageBuffer.length} bytes`);

      // Generate filename and folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot_${sequenceNumber}_${timestamp}`;
      const folderPath = `cctv/session_${sessionId}`;

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
        {
          folder: folderPath,
          public_id: filename,
          resource_type: 'image',
          format: 'jpg',
          quality: 'auto:good',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' }, // Max size
            { quality: 'auto:good' }
          ]
        }
      );

      console.log(`✅ CCTV screenshot uploaded: ${uploadResult.public_id}`);

      return {
        success: true,
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        url: uploadResult.url,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        bytes: uploadResult.bytes,
      };

    } catch (error) {
      console.error('Cloudinary CCTV screenshot upload error:', error);
      throw new Error(`Failed to upload CCTV screenshot: ${error.message}`);
    }
  }
}

module.exports = new CloudinaryService();
