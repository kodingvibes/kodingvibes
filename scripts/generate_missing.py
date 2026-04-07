#!/usr/bin/env python3
"""Generate missing card images"""
import requests
import urllib.parse
import os
import time

# Missing cards only
MISSING_CARDS = [
    # Neutral Hardware (5 missing)
    ("n_overclock", "neutral", 67, "anime style cyberpunk trading card, overclocking device with heat waves radiating, speed boost module gadget, orange and red flames, performance enhancement tech, dangerous power levels, detailed anime tech art"),
    ("n_quantum_core", "neutral", 68, "anime style cyberpunk legendary trading card, quantum computer core heart, impossible machine with swirling energy, purple and cyan quantum particles, mystical technology fusion, legendary item art, masterful illustration"),
    ("n_backup_drive", "neutral", 69, "anime style cyberpunk trading card, emergency backup disk drive device, green data preservation glow, save point technology item, plan B gadget, mint green neon light, detailed anime tech illustration"),
    ("n_data_broker", "neutral", 70, "anime style cyberpunk trading card, information merchant device terminal, data trading holographic screen, stock market graphs floating, green economic tech, business cyberpunk tool, detailed anime illustration"),
    ("n_stealth_chip", "neutral", 71, "anime style cyberpunk trading card, invisible stealth microchip item, cloaking device component, gray and black stealth tech, undetectable hardware gadget, spy technology, detailed anime tech art"),
    
    # Events (8 missing)
    ("e_system_purge", "events", 72, "anime style cyberpunk trading card, massive system delete command wave, total data erasure sweep, red and orange destruction energy, digital apocalypse scene, sweeping broom of doom effect, epic scale destruction, detailed anime art"),
    ("e_deep_scan", "events", 73, "anime style cyberpunk trading card, deep network scan visualization effect, searching through layers of data, blue radar waves spreading, information discovery burst, detective cyberpunk scene, detailed anime illustration"),
    ("e_ddos_attack", "events", 74, "anime style cyberpunk trading card, distributed denial of service swarm attack, pink and red packet storm chaos, overwhelming data flood effect, explosive digital energy, chaos in network scene, detailed anime art"),
    ("e_patch_update", "events", 75, "anime style cyberpunk trading card, system healing patch installation effect, green medical repair code flowing, band-aid on digital wounds, vulnerability fix glow, healing energy spreading, detailed anime illustration"),
    ("e_emp_blast", "events", 76, "anime style cyberpunk trading card, electromagnetic pulse explosion, yellow lightning burst spreading, electronics frying effect, total shutdown wave, disruptive energy field, epic anime energy effect art"),
    ("e_overclock_burst", "events", 77, "anime style cyberpunk trading card, temporary speed boost burst effect, orange and pink acceleration energy, time dilation effect visual, speed lines motion blur, power up aura surrounding, dynamic anime action scene"),
    ("e_reboot", "events", 78, "anime style cyberpunk trading card, system restart and recovery sequence, green and blue renewal energy wave, refresh cycle effect, rebirth technology visual, restorative digital wave, detailed anime illustration"),
    ("e_mass_recall", "events", 79, "anime style cyberpunk legendary trading card, ultimate information retrieval spell, global data summon effect, orange and pink cosmic knowledge, world network connection, god-tier information access, legendary anime masterpiece"),
]

def generate_image(card_id, faction, seed, prompt):
    base_dir = "/home/madkoding/proyectos/kodingvibes/public/cards"
    output_path = f"{base_dir}/{faction}/{card_id}.png"
    
    # Skip if exists
    if os.path.exists(output_path) and os.path.getsize(output_path) > 10000:
        return True, "exists"
    
    try:
        encoded = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded}?width=400&height=560&seed={seed}&nologo=true&enhance=true"
        
        response = requests.get(url, timeout=120)
        if response.status_code == 200:
            with open(output_path, 'wb') as f:
                f.write(response.content)
            size = os.path.getsize(output_path)
            return True, f"{size//1024}KB"
    except Exception as e:
        return False, str(e)
    return False, "unknown"

print(f"Generating {len(MISSING_CARDS)} missing cards...\n")

generated = 0
for card_id, faction, seed, prompt in MISSING_CARDS:
    success, msg = generate_image(card_id, faction, seed, prompt)
    if success:
        if msg == "exists":
            print(f"✓ {card_id} (already exists)")
        else:
            print(f"✓ {card_id} ({msg})")
        generated += 1
    else:
        print(f"✗ {card_id}: {msg}")
    time.sleep(2)

print(f"\nGenerated {generated}/{len(MISSING_CARDS)} cards")
