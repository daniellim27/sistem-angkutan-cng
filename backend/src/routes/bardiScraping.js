// backend/src/routes/bardiScraping.js

const express = require('express');
const router = express.Router();
const bardiScrapingController = require('../controllers/bardiScrapingController');
const { verifyToken } = require('../middlewares/auth.middleware');

// Logging middleware for debugging
router.use((req, res, next) => {
  console.log(`[Bardi] ${req.method} ${req.path}`);
  next();
});

// Public routes (no authentication required)
router.get('/test', (req, res) => res.json({ message: 'Bardi routes working!' }));
router.get('/test-session', bardiScrapingController.testSession);
router.get('/session-info', bardiScrapingController.getSessionInfo);

// Protected routes (require authentication)
router.get('/user-info', verifyToken, bardiScrapingController.getUserInfo);
router.get('/devices', verifyToken, bardiScrapingController.getDevices);
router.get('/devices/:deviceId', verifyToken, bardiScrapingController.getDeviceDetails);
router.get('/devices/:deviceId/status', verifyToken, bardiScrapingController.getDeviceStatus);

// Screenshot endpoint
router.post('/devices/:deviceId/screenshot', verifyToken, bardiScrapingController.takeCameraScreenshot);
router.post('/screenshot', verifyToken, bardiScrapingController.takeCameraScreenshot);

// Custom request endpoint
router.post('/custom-request', verifyToken, bardiScrapingController.makeCustomRequest);

// Session management
router.put('/session', verifyToken, bardiScrapingController.updateSession);

module.exports = router;

