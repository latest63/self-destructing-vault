#!/usr/bin/env python3
"""Probe what the Elche vs Real Madrid page actually says about match state."""
import urllib.request, re, json, sys

URL = 'https://www.livescore.com/en/football/spain/laliga/elche-vs-real-madrid/1810661/'
req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
h = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')
print("total bytes:", len(h))
print()

def grab(name, pat):
    m = re.search(pat, h)
    print(f"{name:24}: {m.group(1) if m else '(not found)'}")

print("--- what the page says about match state ---")
grab("schema eventStatus", r'"eventStatus":"([^"]+)"')
grab("status (FT etc)", r'"status":"([A-Z]{2,10})"')
grab("overallStatusId", r'"overallStatusId":(\d+)')
grab("homeFullTimeScore", r'"homeFullTimeScore":"([^"]*)"')
grab("awayFullTimeScore", r'"awayFullTimeScore":"([^"]*)"')
grab("winner", r'"winner":"([^"]+)"')
grab("startDate", r'"startDate":"([^"]+)"')
grab("finishDateTimeString", r'"finishDateTimeString":"([^"]+)"')

print()
print("--- match identity (is this even the right fixture?) ---")
grab("homeTeamName", r'"homeTeamName":"([^"]+)"')
grab("awayTeamName", r'"awayTeamName":"([^"]+)"')
grab("homeTeamScore", r'"homeTeamScore":"([^"]*)"')
grab("awayTeamScore", r'"awayTeamScore":"([^"]*)"')
grab("watchStatus / evt", r'"eventStatus":"(PAST|SCHEDULED|LIVE|[A-Z]+)"')

# How much of the page is real content vs boilerplate script?
scripts = re.findall(r'<script[^>]*>', h)
print()
print("script tags:", len(scripts))
body_text = re.sub(r'<script[^>]*>.*?</script>', ' ', h, flags=re.S)
body_text = re.sub(r'<[^>]+>', ' ', body_text)
body_text = re.sub(r'\s+', ' ', body_text).strip()
print("visible text chars (scripts stripped):", len(body_text))
print("visible text sample:", body_text[:600])

# Does the visible text mention the score?
for needle in ["Elche", "Real Madrid", "2", "3"]:
    pass
print()
print("mentions of 'Elche' in visible text:", body_text.count("Elche"))
print("mentions of 'Real Madrid' in visible text:", body_text.count("Real Madrid"))
# Look for a score pattern near the team names in visible text
print("score-like patterns in visible text:", re.findall(r'\b\d\s*[-–]\s*\d\b', body_text)[:10])
