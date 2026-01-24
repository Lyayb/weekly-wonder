// Vercel serverless function to manage weekly content (separate from Quiet Archive)
// Matches Google Sheets structure: Date, Week, Type, Title, Link, Image, Notes

import { createClient } from 'redis';

let redisClient = null;

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

const WEEKLY_CONTENT_KEY = 'weekly-wonder:content';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const redis = await getRedisClient();

    if (req.method === 'GET') {
      // Get all weekly content
      const contentJson = await redis.get(WEEKLY_CONTENT_KEY);
      let content = contentJson ? JSON.parse(contentJson) : [];

      console.log('[API] Retrieved', content.length, 'weekly content items');
      res.status(200).json({ content });

    } else if (req.method === 'POST') {
      // Add new weekly content item
      const item = req.body;

      // Validate required fields
      if (!item || typeof item !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      if (!item.type || !item.title) {
        return res.status(400).json({
          error: 'Missing required fields',
          received: {
            type: !!item.type,
            title: !!item.title
          }
        });
      }

      // Add metadata
      if (!item.timestamp) {
        item.timestamp = Date.now();
      }
      if (!item.date) {
        item.date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      }
      if (!item.week) {
        // Auto-generate week string from date
        const date = new Date(item.date);
        item.week = date.toISOString().slice(0, 10); // YYYY-MM-DD format
      }

      // Get existing content
      const contentJson = await redis.get(WEEKLY_CONTENT_KEY);
      let content = contentJson ? JSON.parse(contentJson) : [];

      // Add new item
      content.unshift(item);

      // Save back to Redis
      await redis.set(WEEKLY_CONTENT_KEY, JSON.stringify(content));

      console.log('[API] New weekly content added. Total:', content.length);
      res.status(200).json({ success: true, content });

    } else if (req.method === 'DELETE') {
      const { timestamp } = req.query;

      const contentJson = await redis.get(WEEKLY_CONTENT_KEY);
      let content = contentJson ? JSON.parse(contentJson) : [];

      if (timestamp) {
        // Delete specific item by timestamp
        const originalCount = content.length;
        content = content.filter(item => item.timestamp != timestamp);

        await redis.set(WEEKLY_CONTENT_KEY, JSON.stringify(content));
        const removed = originalCount - content.length;

        console.log('[API] Removed weekly content item:', timestamp);
        res.status(200).json({
          success: true,
          removed,
          remaining: content.length
        });
      } else {
        res.status(400).json({ error: 'Missing timestamp parameter' });
      }

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
