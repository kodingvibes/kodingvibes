#!/usr/bin/env python3
import requests, urllib.parse, os, time

CARDS = [
    ("e_reboot", "events", 78, "anime style cyberpunk trading card, system restart and recovery sequence, green and blue renewal energy wave, refresh cycle effect, rebirth technology visual, restorative digital wave, detailed anime illustration"),
    ("e_mass_recall", "events", 79, "anime style cyberpunk legendary trading card, ultimate information retrieval spell, global data summon effect, orange and pink cosmic knowledge, world network connection, god-tier information access, legendary anime masterpiece"),
]

for id, faction, seed, prompt in CARDS:
    path = f"/home/madkoding/proyectos/kodingvibes/public/cards/{faction}/{id}.png"
    url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=400&height=560&seed={seed}&nologo=true"
    try:
        r = requests.get(url, timeout=120)
        if r.status_code == 200:
            with open(path, 'wb') as f:
                f.write(r.content)
            print(f"✓ {id} ({os.path.getsize(path)//1024}KB)")
    except Exception as e:
        print(f"✗ {id}: {e}")
    time.sleep(2)

print("Done!")