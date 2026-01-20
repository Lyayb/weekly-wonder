// Vercel serverless function to manage uploads
// Uses Redis for persistent storage across deployments

import { createClient } from 'redis';

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
      if (!upload.type || !upload.content || !upload.name || !upload.city) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Add timestamp if not present
      if (!upload.timestamp) {
        upload.timestamp = Date.now();
      }

      // Get existing uploads
      const uploadsJson = await redis.get(UPLOADS_KEY);
      let uploads = uploadsJson ? JSON.parse(uploadsJson) : [];

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
      // Clean duplicates from storage
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

      // Save cleaned data
      await redis.set(UPLOADS_KEY, JSON.stringify(uploads));

      console.log('[API] Cleaned duplicates. Total:', uploads.length);
      res.status(200).json({ success: true, uploads });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
