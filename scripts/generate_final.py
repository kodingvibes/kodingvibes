#!/usr/bin/env python3
import requests
import urllib.parse
import os
import time

CARDS = [
    # Neutral Hardware (8 cards)
    ("n_ram_upgrade", "neutral", 64, "anime style cyberpunk trading card item, memory upgrade chip device, teal colored RAM sticks glowing, computer hardware with circuit patterns, tech upgrade item glow, mint green neon, detailed anime tech illustration"),
    ("n_neural_link", "neutral", 65, "anime style cyberpunk trading card, brain computer interface cable connection, neural link port glowing on head, data stream flowing through cable, blue tech implant, cyberpunk upgrade device, detailed anime tech art"),
    ("n_crypto_shield", "neutral", 66, "anime style cyberpunk trading card, golden encryption shield with 256-bit lock symbol, cryptographic protection device, yellow energy barrier, cyber shield technology item, detailed anime tech illustration"),
    ("n_overclock", "neutral", 67, "anime style cyberpunk trading card, overclocking device with heat waves radiating, speed boost module gadget, orange and red flames, performance enhancement tech, dangerous power levels, detailed anime tech art"),
    ("n_quantum_core", "neutral", 68, "anime style cyberpunk legendary trading card, quantum computer core heart, impossible machine with swirling energy, purple and cyan quantum particles, mystical technology fusion, legendary item art, masterful illustration"),
    ("n_backup_drive", "neutral", 69, "anime style cyberpunk trading card, emergency backup disk drive device, green data preservation glow, save point technology item, plan B gadget, mint green neon light, detailed anime tech illustration"),
    ("n_data_broker", "neutral", 70, "anime style cyberpunk trading card, information merchant device terminal, data trading holographic screen, stock market graphs floating, green economic tech, business cyberpunk tool, detailed anime illustration"),
    ("n_stealth_chip", "neutral", 71, "anime style cyberpunk trading card, invisible stealth microchip item, cloaking device component, gray and black stealth tech, undetectable hardware gadget, spy technology, detailed anime tech art"),
    # Events (8 cards)  
    ("e_system_purge", "events", 72, "anime style cyberpunk trading card, massive system delete command wave, total data erasure sweep, red and orange destruction energy, digital apocalypse scene, sweeping broom of doom effect, epic scale destruction, detailed anime art"),
    ("e_deep_scan", "events", 73, "anime style cyberpunk trading card, deep network scan visualization effect, searching through layers of data, blue radar waves spreading, information discovery burst, detective cyberpunk scene, detailed anime illustration"),
    ("e_ddos_attack", "events", 74, "anime style cyberpunk trading card, distributed denial of service swarm attack, pink and red packet storm chaos, overwhelming data flood effect, explosive digital energy, chaos in network scene, detailed anime art"),
    ("e_patch_update", "events", 75, "anime style cyberpunk trading card, system healing patch installation effect, green medical repair code flowing, band-aid on digital wounds, vulnerability fix glow, healing energy spreading, detailed anime illustration"),
    ("e_emp_blast", "events", 76, "anime style cyberpunk trading card, electromagnetic pulse explosion, yellow lightning burst spreading, electronics frying effect, total shutdown wave, disruptive energy field, epic anime energy effect art"),
    ("e_overclock_burst", "events", 77, "anime style cyberpunk trading card, temporary speed boost burst effect, orange and pink acceleration energy, time dilation effect visual, speed lines motion blur, power up aura surrounding, dynamic anime action scene"),
    ("e_reboot", "events", 78, "anime style cyberpunk trading card, system restart and recovery sequence, green and blue renewal energy wave, refresh cycle effect, rebirth technology visual, restorative digital wave, detailed anime illustration"),
    ("e_mass_recall", "events", 79, "anime style cyberpunk legendary trading card, ultimate information retrieval spell, global data summon effect, orange and pink cosmic knowledge, world network connection, god-tier information access, legendary anime masterpiece"),
]

def generate(id, faction, seed, prompt):
    path = f"/home/madkoding/proyectos/kodingvibes/public/cards/{faction}/{id}.png"
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        print(f"✓ {id}")
        return True
    
    url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=400&height=560&seed={seed}&nologo=true&enhance=true"
    try:
        r = requests.get(url, timeout=120)
        if r.status_code == 200:
            with open(path, 'wb') as f:
                f.write(r.content)
            print(f"✓ {id} ({os.path.getsize(path)//1024}KB)")
            return True
    except Exception as e:
        print(f"✗ {id}: {e}")
    return False

print(f"Generating {len(CARDS)} cards...\n")
for id, faction, seed, prompt in CARDS:
    generate(id, faction, seed, prompt)
    time.sleep(2)
print("\nDone!")
