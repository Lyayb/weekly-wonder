// Vercel serverless function to manage uploads
// Uses simple in-memory storage (resets on deployment)
// For persistent storage, you'd need Vercel KV or a database

let uploadsCache = [];

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get all uploads
      res.status(200).json({ uploads: uploadsCache });
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

      // Add new upload to the beginning
      uploadsCache.unshift(upload);

      // Keep only last 100 uploads (prevent unlimited growth)
      if (uploadsCache.length > 100) {
        uploadsCache = uploadsCache.slice(0, 100);
      }

      console.log('[API] New upload added. Total:', uploadsCache.length);

      res.status(200).json({ success: true, uploads: uploadsCache });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
