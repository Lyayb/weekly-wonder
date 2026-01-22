// Vercel serverless function to manage uploads
// Uses Redis for persistent storage across deployments

import { createClient } from 'redis';
import sharp from 'sharp';

// Redis client instance
let redisClient = null;

// Get Redis client (lazy initialization)
async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => console.error('[Redis] Client Error:', err));

    await redisClient.connect();
    console.log('[Redis] Connected');
  }
  return redisClient;
}

const UPLOADS_KEY = 'quiet-archive:uploads';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const redis = await getRedisClient();

    if (req.method === 'GET') {
      // Get all uploads from Redis
      const uploadsJson = await redis.get(UPLOADS_KEY);
      let uploads = uploadsJson ? JSON.parse(uploadsJson) : [];

      // Remove duplicates based on timestamp
      const seen = new Set();
      uploads = uploads.filter(upload => {
        if (seen.has(upload.timestamp)) {
          return false;
        }
        seen.add(upload.timestamp);
        return true;
      });

      console.log('[API] Retrieved', uploads.length, 'uploads from Redis');
      res.status(200).json({ uploads });

    } else if (req.method === 'POST') {
      // Add new upload
      const upload = req.body;

      // Validate upload
      if (!upload || typeof upload !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      if (!upload.type || !upload.content || !upload.name || !upload.city) {
        return res.status(400).json({
          error: 'Missing required fields',
          received: {
            type: !!upload.type,
            content: !!upload.content,
            name: !!upload.name,
            city: !!upload.city
          }
        });
      }

      // Compress images before storing
      if (upload.type === 'image') {
        try {
          console.log('[API] Compressing image...');
          const originalSize = upload.content.length;

          // Extract base64 data (remove data:image/...;base64, prefix if present)
          let base64Data = upload.content;
          if (base64Data.includes('base64,')) {
            base64Data = base64Data.split('base64,')[1];
          }

          // Convert base64 to buffer
          const imageBuffer = Buffer.from(base64Data, 'base64');

          // Compress image with sharp
          const compressedBuffer = await sharp(imageBuffer)
            .resize(1200, 1200, { // Max 1200x1200, maintain aspect ratio
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 75 }) // Convert to JPEG with 75% quality
            .toBuffer();

          // Convert back to base64
          const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
          upload.content = compressedBase64;

          const newSize = compressedBase64.length;
          const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
          console.log(`[API] Image compressed: ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (${savings}% reduction)`);
        } catch (error) {
          console.error('[API] Image compression failed:', error);
          // Continue with original image if compression fails
        }
      }

      // Check content size after compression
      const contentSize = JSON.stringify(upload.content).length;
      const maxSize = upload.type === 'image' ? 500 * 1024 : 4 * 1024 * 1024; // 500KB for images, 4MB for text

      if (contentSize > maxSize) {
        return res.status(413).json({
          error: 'Upload too large',
          size: `${(contentSize / 1024 / 1024).toFixed(2)}MB`,
          limit: upload.type === 'image' ? '500KB' : '4MB',
          suggestion: 'Image is still too large after compression. Please use a smaller image.'
        });
      }

      // Add timestamp if not present
      if (!upload.timestamp) {
        upload.timestamp = Date.now();
      }

      // Get existing uploads
      console.log('[API] Fetching existing uploads from Redis...');
      const uploadsJson = await redis.get(UPLOADS_KEY);
      let uploads = uploadsJson ? JSON.parse(uploadsJson) : [];
      console.log('[API] Current uploads count:', uploads.length);

      // Check for duplicates before adding
      const isDuplicate = uploads.some(existing =>
        existing.type === upload.type &&
        existing.content === upload.content &&
        existing.name === upload.name &&
        existing.city === upload.city
      );

      if (!isDuplicate) {
        // Add new upload to the beginning
        uploads.unshift(upload);

        // Keep only last 100 uploads (prevent unlimited growth)
        if (uploads.length > 100) {
          uploads = uploads.slice(0, 100);
        }

        // Save back to Redis
        await redis.set(UPLOADS_KEY, JSON.stringify(uploads));

        console.log('[API] New upload added. Total:', uploads.length);
      } else {
        console.log('[API] Duplicate upload detected, not adding');
      }

      res.status(200).json({ success: true, uploads });
    } else if (req.method === 'DELETE') {
      const { action, timestamp } = req.query;

      const uploadsJson = await redis.get(UPLOADS_KEY);
      let uploads = uploadsJson ? JSON.parse(uploadsJson) : [];

      if (action === 'delete-by-timestamp' && timestamp) {
        // Delete specific upload by timestamp
        const originalCount = uploads.length;
        uploads = uploads.filter(upload => upload.timestamp != timestamp);

        await redis.set(UPLOADS_KEY, JSON.stringify(uploads));
        const removed = originalCount - uploads.length;
        console.log('[API] Removed upload with timestamp:', timestamp);
        res.status(200).json({
          success: true,
          removed,
          remaining: uploads.length,
          uploads
        });
      } else if (action === 'clear-large-images') {
        // Remove images larger than 1MB to free up Redis space
        const originalCount = uploads.length;
        uploads = uploads.filter(upload => {
          if (upload.type === 'image') {
            const size = JSON.stringify(upload.content).length;
            return size < 1 * 1024 * 1024; // Keep only images under 1MB
          }
          return true; // Keep all text uploads
        });

        await redis.set(UPLOADS_KEY, JSON.stringify(uploads));
        const removed = originalCount - uploads.length;
        console.log('[API] Removed', removed, 'large images. Total:', uploads.length);
        res.status(200).json({
          success: true,
          removed,
          remaining: uploads.length,
          uploads
        });
      } else {
        // Clean duplicates from storage
        const seen = new Set();
        uploads = uploads.filter(upload => {
          if (seen.has(upload.timestamp)) {
            return false;
          }
          seen.add(upload.timestamp);
          return true;
        });

        await redis.set(UPLOADS_KEY, JSON.stringify(uploads));
        console.log('[API] Cleaned duplicates. Total:', uploads.length);
        res.status(200).json({ success: true, uploads });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[API] Error:', error);
    console.error('[API] Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      type: error.name
    });
  }
}
