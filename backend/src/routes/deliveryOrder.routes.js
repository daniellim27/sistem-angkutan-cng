// src/routes/deliveryOrder.routes.js

const express = require("express");
const router = express.Router();
const doController = require("../controllers/deliveryOrder.controller");
const loadConfirmationController = require("../controllers/loadConfirmation.controller");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // <-- 1. Import modul File System (fs)

// Tentukan direktori tujuan upload
const uploadDir = "uploads/surat_jalan";

// Setup multer yang lebih tangguh untuk surat jalan uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 2. Logika untuk membuat direktori secara otomatis
    // fs.mkdirSync akan membuat folder jika belum ada.
    // Opsi { recursive: true } memastikan ia juga membuat folder parent ('uploads').
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir); // Kirim direktori yang sudah pasti ada
  },
  filename: (req, file, cb) => {
    // Format nama file untuk menghindari konflik
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, "suratjalan-" + uniqueSuffix + fileExtension);
  },
});

// Tambahkan filter untuk hanya menerima tipe file gambar atau PDF
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Error: File upload only supports JPEG, JPG, PNG, atau PDF."));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter, // (optional, if you want to use your filter)
});

// === SETUP MULTER UNTUK SURAT JALAN PHOTOS (DRIVER) ===
const suratJalanPhotoDir = "uploads/surat_jalan_photos";

// === SETUP MULTER UNTUK NOTA KECIL PHOTOS ===
const notaKecilPhotoDir = "uploads/nota_kecil";

const suratJalanPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(suratJalanPhotoDir, { recursive: true });
    cb(null, suratJalanPhotoDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    
    // Handle blob URLs and get proper file extension
    let fileExtension = path.extname(file.originalname);
    if (!fileExtension || file.originalname.includes('blob:')) {
      // If no extension or blob URL, determine from MIME type
      if (file.mimetype === 'image/jpeg') {
        fileExtension = '.jpg';
      } else if (file.mimetype === 'image/png') {
        fileExtension = '.png';
      } else if (file.mimetype === 'application/pdf') {
        fileExtension = '.pdf';
      } else {
        fileExtension = '.jpg'; // default fallback
      }
    }
    
    cb(null, "surat-jalan-photo-" + uniqueSuffix + fileExtension);
  },
});

const suratJalanPhotoFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  // Primary validation should be based on MIME type
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  // Fallback: check file extension for cases where MIME type might be incorrect
  const allowedExtensions = /jpeg|jpg|png/;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  
  if (extname) {
    return cb(null, true);
  }
  
  cb(
    new Error(
      "Error: Foto surat jalan hanya mendukung format JPEG, JPG, atau PNG."
    )
  );
};

const suratJalanUpload = multer({
  storage: suratJalanPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB untuk foto
  fileFilter: suratJalanPhotoFilter,
});

// === MULTER UNTUK NOTA KECIL PHOTOS ===
const notaKecilPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(notaKecilPhotoDir, { recursive: true });
    cb(null, notaKecilPhotoDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    
    // Handle blob URLs and get proper file extension
    let fileExtension = path.extname(file.originalname);
    if (!fileExtension || file.originalname.includes('blob:')) {
      // If no extension or blob URL, determine from MIME type
      if (file.mimetype === 'image/jpeg') {
        fileExtension = '.jpg';
      } else if (file.mimetype === 'image/png') {
        fileExtension = '.png';
      } else {
        fileExtension = '.jpg'; // default fallback
      }
    }
    
    cb(null, "nota-kecil-" + uniqueSuffix + fileExtension);
  },
});

const notaKecilPhotoFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  // Primary validation should be based on MIME type
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  // Fallback: check file extension for cases where MIME type might be incorrect
  const allowedExtensions = /jpeg|jpg|png/;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  
  if (extname) {
    return cb(null, true);
  }
  
  cb(
    new Error(
      "Error: Foto nota kecil hanya mendukung format JPEG, JPG, atau PNG."
    )
  );
};

const notaKecilUpload = multer({
  storage: notaKecilPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB untuk foto
  fileFilter: notaKecilPhotoFilter,
});

// All routes below are protected by the token verification middleware
router.use(verifyToken);

// === ADMIN-SPECIFIC ROUTES ===
router.post(
  "/",
  checkRole(["admin", "owner"]),
  upload.single("surat_jalan"), // Middleware upload diterapkan di sini
  doController.createDeliveryOrder
);

// === DRIVER-SPECIFIC ROUTES ===
router.get("/me", checkRole(["driver"]), doController.getMyDeliveryOrders);

// Rename dan update endpoints sesuai flow baru
router.patch(
  "/:id/start",
  checkRole(["driver"]),
  doController.startToDestination
);

router.patch(
  "/:id/arrive",
  checkRole(["driver"]),
  doController.arriveAtLoadLocation
);

router.patch(
  "/:id/depart-spbu",
  checkRole(["driver"]),
  doController.departFromSPBU
);

// Confirm load endpoint (sudah ada dari implementasi sebelumnya)
router.post(
  "/:id/confirm-load",
  checkRole(["driver"]),
  suratJalanUpload.array("surat_jalan_photo", 10), // <-- Accept multiple files
  loadConfirmationController.confirmLoad
);

// Upload surat jalan photo separately (after load confirmation)
router.post(
  "/:id/upload-surat-jalan",
  checkRole(["driver"]),
  suratJalanUpload.array("surat_jalan_photo", 10), // Allow up to 10 surat jalan photos
  loadConfirmationController.uploadSuratJalanPhoto
);

// Upload nota photo endpoint (before arrive at unload)
router.post(
  "/:id/upload-nota",
  checkRole(["driver"]),
  suratJalanUpload.array("nota_photo", 5), // Allow up to 5 nota photos
  doController.uploadNotaPhoto
);

// Upload documentation photos endpoint (pressure bar, temperature, stan awal, stan akhir)
router.post(
  "/:id/upload-documentation",
  checkRole(["driver"]),
  suratJalanUpload.fields([
    { name: "pressure_bar", maxCount: 1 },
    { name: "temperature", maxCount: 1 },
    { name: "stan_awal", maxCount: 1 },
    { name: "stan_akhir", maxCount: 1 }
  ]),
  doController.uploadDocumentationPhotos
);

// Complete location endpoint (for sequential location completion)
router.post(
  "/:id/complete-location",
  checkRole(["driver"]),
  doController.completeLocation
);

// === NOTA KECIL ROUTES ===
// Confirm nota kecil (MUST come before other nota-kecil routes to avoid conflicts)
router.post(
  "/:id/nota-kecil/confirm",
  checkRole(["driver"]),
  doController.confirmNotaKecil
);

// Individual photo OCR processing
router.post(
  "/:id/process-nota-kecil/:photoType",
  checkRole(["driver"]),
  notaKecilUpload.single("photo"),
  doController.processIndividualPhotoOCR
);

// Process all photos for nota kecil (bulk)
router.post(
  "/:id/process-nota-kecil",
  checkRole(["driver"]),
  notaKecilUpload.fields([
    { name: "pressure_bar", maxCount: 1 },
    { name: "temperature", maxCount: 1 },
    { name: "stan_awal", maxCount: 1 },
    { name: "stan_akhir", maxCount: 1 }
  ]),
  doController.processNotaKecilOCR
);

// Get nota kecils for delivery order
router.get(
  "/:id/nota-kecils",
  checkRole(["admin", "owner", "driver"]),
  doController.getNotaKecils
);

// Get nota kecils for specific customer location
router.get(
  "/:id/customers/:customerIndex/nota-kecils",
  checkRole(["admin", "owner", "driver"]),
  doController.getCustomerNotaKecils
);

router.patch(
  "/:id/arrive-at-unload",
  checkRole(["driver"]),
  doController.arriveAtDestination
);

router.patch(
  "/:id/start-return",
  checkRole(["driver"]),
  doController.startReturnToBase
);

router.patch(
  "/:id/complete",
  checkRole(["driver"]),
  doController.completeDeliveryOrder
);

router.get(
  "/:id/load-status",
  checkRole(["driver", "admin", "owner"]),
  loadConfirmationController.getLoadStatus
);

// === GENERAL & ADMIN ROUTES ===
router.get(
  "/",
  checkRole(["admin", "owner", "driver"]),
  doController.getAllDeliveryOrders
);
router.get(
  "/active",
  checkRole(["admin", "owner", "driver"]),
  doController.getActiveDeliveryOrders
);
router.get(
  "/:id",
  checkRole(["admin", "owner", "driver"]),
  doController.getDeliveryOrderById
);

module.exports = router;
