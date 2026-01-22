#!/usr/bin/env python3
"""Remove 'test after upgrade' upload from Redis"""

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
        print("✓ Connected to Redis")

        # Get all uploads
        uploads_json = r.get(UPLOADS_KEY)
        if not uploads_json:
            print("No uploads found in database")
            return

        uploads = json.loads(uploads_json)
        print(f"Found {len(uploads)} total uploads")

        # Find and remove "test after upgrade" uploads
        original_count = len(uploads)
        filtered_uploads = []
        removed_count = 0

        for upload in uploads:
            content = upload.get('content', '').lower()
            if 'test after upgrade' in content:
                print(f"🗑️  Removing: {upload.get('content', '')[:50]}...")
                print(f"   Name: {upload.get('name')}, City: {upload.get('city')}")
                print(f"   Timestamp: {upload.get('timestamp')}")
                removed_count += 1
            else:
                filtered_uploads.append(upload)

        if removed_count == 0:
            print("ℹ️  No 'test after upgrade' uploads found")
        else:
            # Save back to Redis
            r.set(UPLOADS_KEY, json.dumps(filtered_uploads))
            print(f"✅ Removed {removed_count} upload(s)")
            print(f"📊 Remaining: {len(filtered_uploads)} uploads")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
