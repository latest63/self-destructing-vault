#!/usr/bin/env python3
"""Fix Supabase projects table schema."""

import urllib.request
import urllib.error
import json
import os

# Read Supabase token
with open(os.path.expanduser("~/.supabase/access-token")) as f:
    token = f.read().strip()

# SQL to fix the schema
fix_sql = """
-- Drop the old avatar_url column since we already have logo_url
ALTER TABLE public.projects DROP COLUMN IF EXISTS avatar_url;

-- Ensure all expected columns exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS wallet_address text unique;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS github_handle text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS profile_data jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now() not null;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default now() not null;

-- Create indexes
CREATE INDEX IF NOT EXISTS projects_wallet_address_idx ON public.projects (wallet_address);
CREATE INDEX IF NOT EXISTS projects_github_handle_idx ON public.projects (github_handle);

-- Verify the final schema
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'projects' 
ORDER BY ordinal_position;
"""

url = f"https://api.supabase.com/v1/projects/ervkqbncvboqsgvwjnpq/database/query"

req = urllib.request.Request(
    url,
    data=json.dumps({"query": fix_sql}).encode('utf-8'),
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=60) as response:
        result = json.loads(response.read().decode())
        print("✅ Schema fixed successfully")
        print(f"Result: {json.dumps(result, indent=2)[:500]}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"❌ Failed: {e.code}")
    print(body[:500])
except Exception as e:
    print(f"❌ Error: {e}")