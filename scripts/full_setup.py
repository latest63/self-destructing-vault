#!/usr/bin/env python3
"""Complete setup script for ShipGuard:
1. Set up Supabase database schema
2. Set up Vercel environment variables
"""

import urllib.request
import urllib.error
import json
import os

# ============================================
# Configuration
# ============================================

# Vercel token
with open(os.path.expanduser("~/.hermes/secrets/vercel-new.token")) as f:
    VERCEL_TOKEN = f.read().strip()

# Supabase token
with open(os.path.expanduser("~/.supabase/access-token")) as f:
    SUPABASE_TOKEN = f.read().strip()

# Project IDs
VERCEL_PROJECT_ID = "prj_mv3DRKNXYVOl0mkAzo3K4KWxaAs6"
SUPABASE_PROJECT_REF = "ervkqbncvboqsgvwjnpq"

# Supabase anon key (from API)
SUPABASE_ANON_KEY = "eyJhbG...mFC4"

# ============================================
# Vercel Environment Setup
# ============================================

def set_vercel_env_var(key, value, target=["production"], env_type="plain"):
    """Set an environment variable on Vercel via API."""
    url = f"https://api.vercel.com/v10/projects/{VERCEL_PROJECT_ID}/env"
    
    payload = {
        "key": key,
        "value": value,
        "target": target,
        "type": env_type
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {VERCEL_TOKEN}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            print(f"✅ {key}: Set successfully")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "already exists" in body.lower() or "conflict" in body.lower():
            print(f"⚠️  {key}: Already exists")
            return True
        else:
            print(f"❌ {key}: {e.code} {body}")
            return False
    except Exception as e:
        print(f"❌ {key}: Error - {str(e)}")
        return False


def setup_vercel_env():
    """Set up all Vercel environment variables."""
    print("=== Setting up Vercel Environment Variables ===\n")
    
    env_vars = [
        ("NEXT_PUBLIC_SUPABASE_URL", f"https://{SUPABASE_PROJECT_REF}.supabase.co"),
        ("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY),
        ("NEXT_PUBLIC_GENLAYER_RPC_URL", "https://studio-next.genlayer.com/api"),
        ("NEXT_PUBLIC_GENLAYER_CHAIN_ID", "61997"),
        ("NEXT_PUBLIC_GENLAYER_CHAIN_NAME", "GenLayer Studio Next"),
        ("NEXT_PUBLIC_GENLAYER_SYMBOL", "GEN"),
        ("NEXT_PUBLIC_VAULT_CONTRACT", "0x17F1B041803d5f1B188F34b47EE727152885356C"),
        ("NEXT_PUBLIC_CONDITION_CONTRACT", "0x3F3A37d949C5fD03E67C758C38d214645D94f721"),
    ]
    
    for key, value in env_vars:
        set_vercel_env_var(key, value)

# ============================================
# Supabase Database Setup
# ============================================

def run_supabase_migration():
    """Run SQL migration on Supabase."""
    print("\n=== Running Supabase Database Migration ===\n")
    
    # Migration to rename avatar_url to logo_url
    migration_sql = """
-- Rename avatar_url to logo_url if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.projects RENAME COLUMN avatar_url TO logo_url;
        RAISE NOTICE 'Renamed avatar_url to logo_url';
    ELSE
        RAISE NOTICE 'avatar_url column does not exist, skipping rename';
    END IF;
END $$;

-- Add missing columns if they don't exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS wallet_address text unique;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS github_handle text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS profile_data jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now() not null;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default now() not null;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS projects_wallet_address_idx ON public.projects (wallet_address);
CREATE INDEX IF NOT EXISTS projects_github_handle_idx ON public.projects (github_handle);
"""
    
    url = f"https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/database/query"
    
    # Use the service_role key to run the migration
    service_role_key = None
    
    # Get service role key from API
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/api-keys",
        headers={"Authorization": f"Bearer {SUPABASE_TOKEN}"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            keys = json.loads(response.read().decode())
            for key in keys:
                if key.get('id') == 'service_role':
                    service_role_key = key.get('api_key', '')
                    print(f"Found service_role key: {service_role_key[:20]}...")
                    break
    except Exception as e:
        print(f"Could not retrieve service role key: {e}")
        print("Will try pooler connection instead...")
    
    # Try using the Supabase Management API to run SQL
    req = urllib.request.Request(
        url,
        data=json.dumps({"query": migration_sql}).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {SUPABASE_TOKEN}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode())
            print("✅ Migration completed successfully")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"❌ Migration failed: {e.code}")
        print(f"   {body[:500]}")
        
        # Try alternative approach - check table schema
        print("\nTrying to check current schema...")
        check_req = urllib.request.Request(
            url,
            data=json.dumps({"query": "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' ORDER BY ordinal_position;"}).encode('utf-8'),
            headers={
                "Authorization": f"Bearer {SUPABASE_TOKEN}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(check_req, timeout=30) as response:
                schema = json.loads(response.read().decode())
                print("Current projects table schema:")
                for row in schema:
                    print(f"  {row}")
        except Exception as e2:
            print(f"Could not check schema: {e2}")
        
        return False
    except Exception as e:
        print(f"❌ Migration error: {str(e)}")
        return False

# ============================================
# Main
# ============================================

def main():
    print("=== ShipGuard Environment Setup ===\n")
    print(f"Vercel Project ID: {VERCEL_PROJECT_ID}")
    print(f"Supabase Project: {SUPABASE_PROJECT_REF}")
    print(f"Vercel Token: {VERCEL_TOKEN[:10]}...")
    print(f"Supabase Token: {SUPABASE_TOKEN[:10]}...")
    print()
    
    # Set up Vercel environment
    setup_vercel_env()
    
    # Run Supabase migration
    run_supabase_migration()
    
    # Update .env.local
    print("\n=== Updating .env.local ===")
    env_content = f"""NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-next.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio Next
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
NEXT_PUBLIC_VAULT_CONTRACT=0x17F1B041803d5f1B188F34b47EE727152885356C
NEXT_PUBLIC_CONDITION_CONTRACT=0x3F3A37d949C5fD03E67C758C38d214645D94f721
NEXT_PUBLIC_SUPABASE_URL=https://{SUPABASE_PROJECT_REF}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY={SUPABASE_ANON_KEY}
NEXT_PUBLIC_GITHUB_VERIFY_CONTRACT=0x0000000000000000000000000000000000000000
"""
    
    env_path = "/home/ubuntu/shipguard/frontend/.env.local"
    with open(env_path, 'w') as f:
        f.write(env_content)
    print(f"✅ Updated {env_path}")
    
    print("\n=== Setup Complete ===")

if __name__ == "__main__":
    main()