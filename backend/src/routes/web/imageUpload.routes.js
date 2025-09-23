const express = require('express');
const router = express.Router();
const imageUploadController = require('../../controllers/imageUploadController');
const { verifyToken, checkRole } = require('../../middlewares/auth.middleware');

/**
 * @route   POST /api/web/image-upload/nota-kecil
 * @desc    Upload nota kecil images to Cloudinary
 * @access  Private (Admin/Owner/Driver)
 */
router.post('/nota-kecil', 
  verifyToken, 
  checkRole(['admin', 'owner', 'driver']),
  imageUploadController.uploadNotaKecilImages
);

/**
 * @route   DELETE /api/web/image-upload/:publicId
 * @desc    Delete image from Cloudinary
 * @access  Private (Admin/Owner)
 */
router.delete('/:publicId', 
  verifyToken, 
  checkRole(['admin', 'owner']),
  imageUploadController.deleteImage
);

/**
 * @route   GET /api/web/image-upload/nota-kecil/:notaKecilId
 * @desc    Get images for a specific nota kecil
 * @access  Private (Admin/Owner/Driver)
 */
router.get('/nota-kecil/:notaKecilId', 
  verifyToken, 
  checkRole(['admin', 'owner', 'driver']),
  imageUploadController.getNotaKecilImages
);

module.exports = router;

