#!/usr/bin/env python3
"""Check Redis storage usage and upload sizes"""

import redis
import json
import sys

REDIS_URL = "redis://default:CLUk2ApAUhPedmaDx2VGdmKIMDidnkq2@redis-15997.c245.us-east-1-3.ec2.cloud.redislabs.com:15997"
UPLOADS_KEY = "quiet-archive:uploads"

def main():
    try:
        # Connect to Redis
        print("Connecting to Redis...")
        r = redis.from_url(REDIS_URL)
        print("✓ Connected to Redis\n")

        # Get memory info
        info = r.info('memory')
        used_memory = info.get('used_memory_human', 'Unknown')
        max_memory = info.get('maxmemory_human', 'Unknown')

        print(f"📊 Redis Memory Usage:")
        print(f"   Used: {used_memory}")
        print(f"   Max: {max_memory}")

        # Get all uploads
        uploads_json = r.get(UPLOADS_KEY)
        if not uploads_json:
            print("\n❌ No uploads found in database")
            return

        uploads = json.loads(uploads_json)
        total_size = len(uploads_json)

        print(f"\n📦 Uploads Data:")
        print(f"   Total uploads: {len(uploads)}")
        print(f"   Total size: {total_size / 1024 / 1024:.2f} MB")

        # Check individual upload sizes
        large_uploads = []
        for i, upload in enumerate(uploads):
            upload_size = len(json.dumps(upload))
            size_mb = upload_size / 1024 / 1024

            if size_mb > 0.5:  # Flag uploads larger than 0.5MB
                large_uploads.append({
                    'index': i,
                    'type': upload.get('type'),
                    'size_mb': size_mb,
                    'name': upload.get('name'),
                    'city': upload.get('city'),
                    'content_preview': upload.get('content', '')[:50]
                })

        if large_uploads:
            print(f"\n⚠️  Large uploads found ({len(large_uploads)}):")
            for u in large_uploads:
                print(f"   - {u['type']}: {u['size_mb']:.2f}MB by {u['name']} from {u['city']}")
        else:
            print("\n✅ No unusually large uploads found")

        # Check eviction policy
        eviction = r.config_get('maxmemory-policy')
        print(f"\n🔧 Eviction Policy: {eviction}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
