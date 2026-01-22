// Quick script to remove "claude test" upload from Redis
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('❌ REDIS_URL environment variable not set');
  console.log('Please set it: export REDIS_URL="your-redis-url"');
  process.exit(1);
}

async function removeClaudeTest() {
  const client = createClient({ url: REDIS_URL });

  try {
    await client.connect();
    console.log('✓ Connected to Redis');

    // Get all uploads
    const uploadsJson = await client.get('quiet-archive:uploads');
    let uploads = uploadsJson ? JSON.parse(uploadsJson) : [];

    console.log(`Found ${uploads.length} total uploads`);

    // Find and remove "test after upgrade" uploads
    const originalCount = uploads.length;
    uploads = uploads.filter(upload => {
      const content = upload.content?.toLowerCase() || '';
      const isTestUpload = content.includes('test after upgrade');

      if (isTestUpload) {
        console.log('🗑️  Removing:', {
          type: upload.type,
          content: upload.content?.substring(0, 50) + '...',
          name: upload.name,
          city: upload.city,
          timestamp: upload.timestamp
        });
      }

      return !isTestUpload;
    });

    const removed = originalCount - uploads.length;

    if (removed === 0) {
      console.log('ℹ️  No "test after upgrade" uploads found');
    } else {
      // Save back to Redis
      await client.set('quiet-archive:uploads', JSON.stringify(uploads));
      console.log(`✅ Removed ${removed} upload(s)`);
      console.log(`📊 Remaining: ${uploads.length} uploads`);
    }

    await client.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.disconnect();
    process.exit(1);
  }
}

removeClaudeTest();
