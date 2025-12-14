// backend/src/routes/cctvMonitoring.routes.js

/**
 * CCTV Monitoring Routes
 * 
 * Defines all API endpoints for CCTV monitoring functionality
 * All routes require authentication via verifyToken middleware
 */

const express = require('express');
const router = express.Router();
const cctvController = require('../controllers/cctvMonitoring.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Optional: Admin-only middleware for sensitive operations
const { isAdmin } = require('../middlewares/auth.middleware');

// Apply authentication to all routes
router.use(verifyToken);

/**
 * Session Management Routes
 */

// GET /api/cctv-monitoring/sessions
// Get all monitoring sessions with optional filters
router.get('/sessions', cctvController.getSessions);

// GET /api/cctv-monitoring/sessions/:id
// Get a single session by ID
router.get('/sessions/:id', cctvController.getSessionById);

// POST /api/cctv-monitoring/sessions
// Create a new monitoring session
router.post('/sessions', cctvController.createSession);

// PUT /api/cctv-monitoring/sessions/:id
// Update session configuration
router.put('/sessions/:id', cctvController.updateSession);

// POST /api/cctv-monitoring/sessions/:id/stop
// Stop an active monitoring session
router.post('/sessions/:id/stop', cctvController.stopSession);

// POST /api/cctv-monitoring/sessions/:id/complete
// Mark a session as completed
router.post('/sessions/:id/complete', cctvController.completeSession);

// POST /api/cctv-monitoring/sessions/:id/recalibrate-nota-kecil
// Recalibrate nota kecil creation for all batches (including partial batches)
router.post('/sessions/:id/recalibrate-nota-kecil', isAdmin, cctvController.recalibrateNotaKecil);

// POST /api/cctv-monitoring/sessions/:id/restart
// Restart a stopped or dead session
router.post('/sessions/:id/restart', cctvController.restartSession);

// DELETE /api/cctv-monitoring/sessions/:id
// Delete a session (admin only)
router.delete('/sessions/:id', isAdmin, cctvController.deleteSession);

/**
 * Screenshot Management Routes
 */

// GET /api/cctv-monitoring/sessions/:id/screenshots
// Get all screenshots for a session
router.get('/sessions/:id/screenshots', cctvController.getSessionScreenshots);

// POST /api/cctv-monitoring/sessions/:id/capture
// Manually trigger a screenshot capture
router.post('/sessions/:id/capture', cctvController.manualCapture);

// DELETE /api/cctv-monitoring/screenshots/:id
// Delete a screenshot (soft delete)
router.delete('/screenshots/:id', isAdmin, cctvController.deleteScreenshot);

/**
 * OCR Processing Routes
 */

// POST /api/cctv-monitoring/screenshots/:id/retry-ocr
// Retry OCR processing for a failed screenshot
router.post('/screenshots/:id/retry-ocr', cctvController.retryOcr);

// PUT /api/cctv-monitoring/screenshots/:id/manual-ocr
// Manually set OCR values for a screenshot
router.put('/screenshots/:id/manual-ocr', cctvController.setManualOcr);

// GET /api/cctv-monitoring/screenshots/:id/ocr-result
// Get detailed OCR result for a screenshot
router.get('/screenshots/:id/ocr-result', cctvController.getOcrResult);

/**
 * Health Monitoring Routes
 */

// GET /api/cctv-monitoring/health
// Get overall system health statistics
router.get('/health', cctvController.getHealthStats);

// GET /api/cctv-monitoring/sessions/:id/health
// Get detailed health information for a session
router.get('/sessions/:id/health', cctvController.getSessionHealth);

/**
 * BARDI Token Management Routes
 */

// GET /api/cctv-monitoring/bardi-token
// Retrieve the persisted BARDI session token
router.get('/bardi-token', cctvController.getBardiToken);

// PUT /api/cctv-monitoring/bardi-token
// Update BARDI session token for active sessions
router.put('/bardi-token', cctvController.updateBardiToken);

/**
 * Scheduler Control Routes
 */

// GET /api/cctv-monitoring/scheduler/status
// Get scheduler status and statistics
router.get('/scheduler/status', cctvController.getSchedulerStatus);

// POST /api/cctv-monitoring/scheduler/start
// Start the automatic screenshot scheduler
router.post('/scheduler/start', cctvController.startScheduler);

// POST /api/cctv-monitoring/scheduler/stop
// Stop the automatic screenshot scheduler
router.post('/scheduler/stop', cctvController.stopScheduler);

// POST /api/cctv-monitoring/scheduler/capture-all
// Immediately capture screenshots for all active sessions
router.post('/scheduler/capture-all', cctvController.captureAllSessions);

// POST /api/cctv-monitoring/sessions/:id/test-auto-capture
// DEV/TEST: Auto-capture N batches for a customer 4-panel set and create Nota Kecil (admin only)
router.post('/sessions/:id/test-auto-capture', isAdmin, cctvController.testAutoCapture);

// POST /api/cctv-monitoring/sessions/:id/test-create-nota-only
// DEV/TEST: Create Nota Kecil from existing screenshots only (no new captures)
router.post('/sessions/:id/test-create-nota-only', isAdmin, cctvController.testCreateNotaOnly);

/**
 * Admin Utilities
 */
// POST /api/cctv-monitoring/cleanup-screenshots
// Cleanup old Cloudinary screenshots (admin only)
router.post('/cleanup-screenshots', isAdmin, cctvController.cleanupScreenshots);

module.exports = router;

