const cron = require('node-cron');
const { Op } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const db = require('../models');

const { CCTVScreenshot } = db;

function hoursToMs(hours) {
  const h = parseInt(hours, 10);
  if (Number.isNaN(h) || h <= 0) return 0;
  return h * 60 * 60 * 1000;
}

function isCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('res.cloudinary.com');
}

// Extract public_id from a Cloudinary delivery URL
// Example: https://res.cloudinary.com/<cloud>/image/upload/v1699999/folder/name.jpg
// public_id => folder/name (without extension and version)
function extractPublicIdFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/'); // ['', '<cloudinary>', 'image', 'upload', 'v12345', 'folder', 'name.jpg']
    const uploadIndex = parts.findIndex((p) => p === 'upload');
    if (uploadIndex === -1) return null;
    const afterUpload = parts.slice(uploadIndex + 1).filter(Boolean);
    if (afterUpload.length === 0) return null;

    // Drop version segment if starts with 'v' and numeric
    let startIdx = 0;
    if (/^v\d+$/i.test(afterUpload[0])) {
      startIdx = 1;
    }
    const pathParts = afterUpload.slice(startIdx);
    if (pathParts.length === 0) return null;

    const last = pathParts[pathParts.length - 1];
    const lastNoExt = last.includes('.') ? last.substring(0, last.lastIndexOf('.')) : last;
    pathParts[pathParts.length - 1] = lastNoExt;

    return pathParts.join('/');
  } catch (e) {
    return null;
  }
}

async function destroyCloudinaryAsset(publicId) {
  try {
    if (!publicId) return { result: 'skipped' };
    const res = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return res;
  } catch (err) {
    return { result: 'error', error: err.message };
  }
}

async function cleanupCloudinaryScreenshotsOnce() {
  const retainHours = process.env.RETAIN_CCTV_SCREENSHOTS_HOURS || '72';
  const retainMs = hoursToMs(retainHours);
  if (retainMs <= 0) {
    console.log('CCTV cleanup disabled (RETAIN_CCTV_SCREENSHOTS_HOURS <= 0)');
    return { disabled: true };
  }

  const cutoff = new Date(Date.now() - retainMs);

  const where = {
    captured_at: { [Op.lt]: cutoff },
    screenshot_url: { [Op.not]: null },
  };

  let candidates = [];
  try {
    candidates = await CCTVScreenshot.findAll({
      where,
      attributes: ['id', 'screenshot_url', 'captured_at'],
      order: [['captured_at', 'ASC']],
      limit: 500, // safety batch
    });
  } catch (e) {
    console.error('Failed to query CCTVScreenshot for cleanup:', e.message);
    return { error: e.message };
  }

  let attempted = 0;
  let destroyed = 0;
  let nulled = 0;
  let skipped = 0;
  const errors = [];

  for (const shot of candidates) {
    const url = shot.screenshot_url;
    if (!isCloudinaryUrl(url)) {
      skipped += 1;
      continue;
    }

    attempted += 1;
    const publicId = extractPublicIdFromUrl(url);
    const res = await destroyCloudinaryAsset(publicId);
    if (res.result === 'ok' || res.result === 'not_found' || res.result === 'skipped') {
      if (res.result === 'ok') destroyed += 1;
      try {
        await shot.update({ screenshot_url: null });
        nulled += 1;
      } catch (e) {
        errors.push(`Null URL failed for screenshot ${shot.id}: ${e.message}`);
      }
    } else {
      errors.push(`Destroy failed for ${publicId || 'unknown'}: ${res.error || JSON.stringify(res)}`);
    }
  }

  const summary = { total: candidates.length, attempted, destroyed, nulled, skipped, errors };
  console.log('CCTV Cloudinary cleanup summary:', summary);
  return summary;
}

function initCloudinaryFromEnv() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function scheduleDailyCleanup() {
  // run every day at 03:15
  cron.schedule('15 3 * * *', async () => {
    try {
      console.log('[CCTV] Starting scheduled Cloudinary cleanup...');
      initCloudinaryFromEnv();
      await cleanupCloudinaryScreenshotsOnce();
    } catch (e) {
      console.error('[CCTV] Scheduled cleanup failed:', e.message);
    }
  });
}

module.exports = {
  cleanupCloudinaryScreenshotsOnce,
  scheduleDailyCleanup,
  initCloudinaryFromEnv,
};


