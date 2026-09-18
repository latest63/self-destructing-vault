#!/usr/bin/env python3
"""Get Supabase anon key from project settings."""

import urllib.request
import json
import os

# Read Supabase token
token_path = os.path.expanduser("~/.supabase/access-token")
with open(token_path) as f:
    token = f.read().strip()

# Get project config
req = urllib.request.Request(
    "https://api.supabase.com/v1/projects/ervkqbncvboqsgvwjnpq",
    headers={"Authorization": f"Bearer {token}"}
)

with urllib.request.urlopen(req, timeout=30) as response:
    project = json.loads(response.read().decode())

# Print the full response structure
print("Full project response:")
print(json.dumps(project, indent=2))

# Try to find anon key in the config
if 'api' in project:
    print(f"\nAPI section: {json.dumps(project['api'], indent=2)}")

if 'config' in project:
    print(f"\nConfig: {json.dumps(project['config'], indent=2)}")

# Also try the api-keys endpoint and print raw response
print("\n\n--- API Keys Raw Response ---")
req2 = urllib.request.Request(
    "https://api.supabase.com/v1/projects/ervkqbncvboqsgvwjnpq/api-keys",
    headers={"Authorization": f"Bearer {token}"}
)
with urllib.request.urlopen(req2, timeout=30) as response2:
    keys = json.loads(response2.read().decode())
    print(json.dumps(keys, indent=2))