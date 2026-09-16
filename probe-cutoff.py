#!/usr/bin/env python3
"""Show exactly where the real match data falls relative to the 8000-byte cutoff."""
import urllib.request, re

URL = 'https://www.livescore.com/en/football/spain/laliga/elche-vs-real-madrid/1810661/'
req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
h = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')

CUT = 8000
print(f"page size: {len(h)} bytes   |   contract sends first {CUT}")
print()

def where(label, pat):
    m = re.search(pat, h)
    if not m:
        print(f"{label:34}: NOT FOUND")
        return
    pos = m.start()
    visible = "VISIBLE to AI" if pos < CUT else f"CUT OFF (byte {pos})"
    print(f"{label:34}: byte {pos:>7}  -> {visible}")

print("--- what the AI actually receives (first 8000 bytes) ---")
where("EventScheduled schema", r'"eventStatus":"EventScheduled"')
where("startDate", r'"startDate":"2026-09-15T19:30:00')
print()
print("--- the real result (buried in the JS state blob) ---")
where("status FT", r'"status":"FT"')
where("homeFullTimeScore 2", r'"homeFullTimeScore":"2"')
where("awayFullTimeScore 3", r'"awayFullTimeScore":"3"')
where("winner AWAY", r'"winner":"AWAY"')
where("homeTeamScore/awayTeamScore", r'"homeTeamScore":"2","awayTeamScore":"3"')

# What IS in the first 8000 bytes of *visible* text?
head = h[:CUT]
text_only = re.sub(r'<script[^>]*>.*?</script>', ' ', head, flags=re.S)
text_only = re.sub(r'<[^>]+>', ' ', text_only)
text_only = re.sub(r'\s+', ' ', text_only).strip()
print()
print(f"visible text within first {CUT} bytes: {len(text_only)} chars")
print("sample:", text_only[:400] if text_only else "(none)")
print()
print("score patterns inside first 8000 bytes:", re.findall(r'\b\d\s*[-–]\s*\d\b', head)[:10])
