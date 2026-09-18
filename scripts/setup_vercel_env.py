#!/usr/bin/env python3
"""Set Vercel environment variables for ShipGuard project using Vercel API."""

import urllib.error
import urllib.request
import json
import os

# Read Vercel token
with open(os.path.expanduser("~/.hermes/secrets/vercel-new.token")) as f:
    token = f.read().strip()

# Project ID for ShipGuard
PROJECT_ID = "prj_mv3DRKNXYVOl0mkAzo3K4KWxaAs6"

# Environment variables to set
ENV_VARS = [
    {
        "key": "NEXT_PUBLIC_GENLAYER_RPC_URL",
        "value": "https://studio-next.genlayer.com/api",
        "target": ["production"],
        "type": "plain"
    },
    {
        "key": "NEXT_PUBLIC_GENLAYER_CHAIN_ID",
        "value": "61997",
        "target": ["production"],
        "type": "plain"
    },
    {
        "key": "NEXT_PUBLIC_GENLAYER_CHAIN_NAME",
        "value": "GenLayer Studio Next",
        "target": ["production"],
        "type": "plain"
    },
    {
        "key": "NEXT_PUBLIC_GENLAYER_SYMBOL",
        "value": "GEN",
        "target": ["production"],
        "type": "plain"
    },
    {
        "key": "NEXT_PUBLIC_VAULT_CONTRACT",
        "value": "0x17F1B041803d5f1B188F34b47EE727152885356C",
        "target": ["production"],
        "type": "plain"
    },
    {
        "key": "NEXT_PUBLIC_CONDITION_CONTRACT",
        "value": "0x3F3A37d949C5fD03E67C758C38d214645D94f721",
        "target": ["production"],
        "type": "plain"
    },
    {
        "key": "NEXT_PUBLIC_SUPABASE_URL",
        "value": "https://ervkqbncvboqsgvwjnpq.supabase.co",
        "target": ["production"],
        "type": "plain"
    },
    {
        "key": "NEXT_PUBLIC_GITHUB_VERIFY_CONTRACT",
        "value": "0x0000000000000000000000000000000000000000",
        "target": ["production"],
        "type": "plain"
    },
]

def set_env_var(env_var):
    """Set a single environment variable via Vercel API."""
    url = f"https://api.vercel.com/v10/projects/{PROJECT_ID}/env"
    
    data = json.dumps(env_var).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            print(f"✅ Set {env_var['key']}: {result.get('key', 'N/A')}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "already exists" in body.lower() or "conflict" in body.lower():
            print(f"⚠️ {env_var['key']} already exists - skipping")
            return True
        print(f"❌ Failed to set {env_var['key']}: {e.code} {body}")
        return False
    except Exception as e:
        print(f"❌ Error setting {env_var['key']}: {str(e)}")
        return False

def main():
    print(f"Setting environment variables for project: {PROJECT_ID}")
    print(f"Using Vercel token: {token[:10]}...")
    print()
    
    success_count = 0
    for env_var in ENV_VARS:
        if set_env_var(env_var):
            success_count += 1
    
    print(f"\n=== Results: {success_count}/{len(ENV_VARS)} variables set ===")
    
    print("\n⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY still needs to be set manually.")
    print("   Get it from: https://supabase.com/dashboard/project/ervkqbncvboqsgvwjnpq/settings/api")
    print("   Then run:")
    print(f'   curl -X POST "https://api.vercel.com/v10/projects/{PROJECT_ID}/env" \\')
    print(f'     -H "Authorization: Bearer <your_token>" \\')
    print(f'     -H "Content-Type: application/json" \\')
    print(f'     -d \'{{"key":"NEXT_PUBLIC_SUPABASE_ANON_KEY","value":"<YOUR_KEY>","target":["production"],"type":"plain"}}\'')

if __name__ == "__main__":
    main()