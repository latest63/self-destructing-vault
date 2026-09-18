#!/usr/bin/env python3
"""Get Supabase API keys and service role key."""

import urllib.request
import json
import os

# Try to find any Supabase access token
token_paths = [
    "~/.supabase/access-token",
    "~/.hermes/secrets/supabase-access-token",
    "~/.hermes/secrets/supabase-token",
]

token = None
for path in token_paths:
    expanded = os.path.expanduser(path)
    if os.path.exists(expanded):
        with open(expanded) as f:
            token = f.read().strip()
        print(f"Found token at: {path}")
        break

if not token:
    print("No Supabase access token found in:")
    for path in token_paths:
        print(f"  - {os.path.expanduser(path)}")
    print("\nTrying to use pooler credentials to determine anon key...")
    
    # The anon key is typically a JWT. We can't reconstruct it from pooler creds.
    # Let's check if there's a .env file with the full key
    env_files = [
        "/home/ubuntu/shipguard/frontend/.env",
        "/home/ubuntu/shipguard/frontend/.env.local",
    ]
    
    for env_file in env_files:
        if os.path.exists(env_file):
            with open(env_file) as f:
                content = f.read()
            for line in content.split('\n'):
                if 'ANON_KEY' in line and 'TODO' not in line:
                    print(f"Found in {env_file}: {line}")
    
    print("\n⚠️ Cannot retrieve Supabase anon key automatically.")
    print("Please get it manually from:")
    print("https://supabase.com/dashboard/project/ervkqbncvboqsgvwjnpq/settings/api")
    print("Copy the 'anon' key and set it as NEXT_PUBLIC_SUPABASE_ANON_KEY")
    exit(1)

# Get project info
req = urllib.request.Request(
    "https://api.supabase.com/v1/projects/ervkqbncvboqsgvwjnpq",
    headers={"Authorization": f"Bearer {token}"}
)

try:
    with urllib.request.urlopen(req, timeout=30) as response:
        project = json.loads(response.read().decode())
        print(f"\nProject: {project.get('name')}")
        print(f"Ref: {project.get('id')}")
        
        # Get API keys
        req2 = urllib.request.Request(
            "https://api.supabase.com/v1/projects/ervkqbncvboqsgvwjnpq/api-keys",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        with urllib.request.urlopen(req2, timeout=30) as response2:
            keys = json.loads(response2.read().decode())
            print(f"\nAPI Keys:")
            # The API returns a list directly
            if isinstance(keys, list):
                for key in keys:
                    if isinstance(key, dict):
                        key_name = key.get('name', key.get('type', 'unknown'))
                        key_value = key.get('key', '')
                        if 'anon' in key_name.lower() or 'public' in key_name.lower():
                            print(f"  {key_name}: {key_value}")  # Full key
                        else:
                            print(f"  {key_name}: {key_value[:50]}...")
                    else:
                        print(f"  {key}")
except Exception as e:
    print(f"Error: {e}")
    print(f"\nToken might not have Supabase admin access.")
    print(f"Attempting to get anon key from existing .env file...")