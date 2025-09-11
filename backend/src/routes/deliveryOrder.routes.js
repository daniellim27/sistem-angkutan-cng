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
  "/:id/start-to-load",
  checkRole(["driver"]),
  doController.startToDestination
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
