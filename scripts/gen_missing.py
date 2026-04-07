#!/usr/bin/env python3
import requests, urllib.parse, os, time

MISSING = [
    ("e_ddos_attack", "events", 74, "anime style cyberpunk trading card, distributed denial of service swarm attack, pink and red packet storm chaos, overwhelming data flood effect, explosive digital energy, chaos in network scene, detailed anime art"),
    ("e_patch_update", "events", 75, "anime style cyberpunk trading card, system healing patch installation effect, green medical repair code flowing, band-aid on digital wounds, vulnerability fix glow, healing energy spreading, detailed anime illustration"),
    ("e_emp_blast", "events", 76, "anime style cyberpunk trading card, electromagnetic pulse explosion, yellow lightning burst spreading, electronics frying effect, total shutdown wave, disruptive energy field, epic anime energy effect art"),
    ("e_overclock_burst", "events", 77, "anime style cyberpunk trading card, temporary speed boost burst effect, orange and pink acceleration energy, time dilation effect visual, speed lines motion blur, power up aura surrounding, dynamic anime action scene"),
    ("e_reboot", "events", 78, "anime style cyberpunk trading card, system restart and recovery sequence, green and blue renewal energy wave, refresh cycle effect, rebirth technology visual, restorative digital wave, detailed anime illustration"),
    ("e_mass_recall", "events", 79, "anime style cyberpunk legendary trading card, ultimate information retrieval spell, global data summon effect, orange and pink cosmic knowledge, world network connection, god-tier information access, legendary anime masterpiece"),
]

for id, faction, seed, prompt in MISSING:
    path = f"/home/madkoding/proyectos/kodingvibes/public/cards/{faction}/{id}.png"
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        print(f"✓ {id} (exists)")
        continue
    try:
        url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=400&height=560&seed={seed}&nologo=true"
        r = requests.get(url, timeout=90)
        if r.status_code == 200:
            with open(path, 'wb') as f:
                f.write(r.content)
            print(f"✓ {id} ({os.path.getsize(path)//1024}KB)")
    except Exception as e:
        print(f"✗ {id}: {e}")
    time.sleep(1.5)

print("\nDone!")