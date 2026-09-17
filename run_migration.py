#!/usr/bin/env python3
"""Run supabase db push using subprocess with the token from file."""
import os, subprocess

with open(os.path.expanduser("~/.supabase/access-token")) as f:
    token = f.read().strip()

os.chdir("/home/ubuntu/shipguard")
env = os.environ.copy()
env["SUPABASE_ACCESS_TOKEN"] = token

# Try repair + push
print("=== Repairing migration history ===")
result = subprocess.run(
    ["supabase", "migration", "repair", "--status", "reverted", "001"],
    env=env,
    capture_output=True,
    text=True,
    timeout=60,
)
print("Repair stdout:", result.stdout[-500:] if result.stdout else "")
print("Repair stderr:", result.stderr[-500:] if result.stderr else "")
print("Repair exit:", result.returncode)

print("\n=== Pushing migrations ===")
result2 = subprocess.run(
    ["supabase", "db", "push", "--include-all"],
    env=env,
    capture_output=True,
    text=True,
    timeout=120,
)
print("Push stdout:", result2.stdout[-500:] if result2.stdout else "")
print("Push stderr:", result2.stderr[-500:] if result2.stderr else "")
print("Push exit:", result2.returncode)
