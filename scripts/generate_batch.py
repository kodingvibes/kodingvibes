#!/usr/bin/env python3
"""Generate remaining cards in batches"""
import requests
import urllib.parse
import os
import time
import sys

CARDS = [
    ("r_shadow_runner", "runner", 52, "anime style cyberpunk trading card, elite ninja girl assassin, deep purple shadows surrounding her, phantom-like appearance ethereal, piercing through defenses pose, mysterious and deadly, high contrast lighting, premium anime illustration"),
    ("c_firewall_v1", "corp", 53, "anime style cyberpunk trading card, mechanical firewall barrier with orange flame energy, basic defense system mecha, corporate tech aesthetic, orange and brown colors, sturdy defense wall structure, detailed mecha anime art"),
    ("c_sentinel", "corp", 54, "anime style cyberpunk trading card, robotic sentinel guard mecha standing watch, blue mechanical armor plating, ever-vigilant defender pose, corporate security robot, navy blue steel colors, detailed robot anime illustration"),
    ("c_black_ice", "corp", 55, "anime style cyberpunk trading card, deadly black ice defense system with spikes, lethal counterattack mechanism, black and red glowing menacing, dangerous defensive tech, ominous presence, high quality anime art"),
    ("c_neural_barrier", "corp", 56, "anime style cyberpunk trading card, psychic barrier protecting mind, purple brain energy shield, mental defense fortress, pink and purple psychic powers, anime girl with barrier projection, detailed illustration"),
    ("c_data_fort", "corp", 57, "anime style cyberpunk trading card, massive digital fortress castle, impenetrable data stronghold structure, lavender and blue stone walls glowing, cyberpunk castle architecture, grand scale fortress, detailed anime environment"),
    ("c_killswitch", "corp", 58, "anime style cyberpunk legendary trading card, ultimate doomsday defense protocol activation, apocalyptic red energy explosion, final countermeasure system, skull and crossbones cyber motif, epic legendary scale, masterful anime illustration"),
    ("c_honeypot", "corp", 59, "anime style cyberpunk trading card, deceptive trap system disguised as treasure, golden honey dripping from data streams, tempting bait for hackers, orange and gold colors glowing, clever trap design, detailed anime art"),
    ("c_trace_daemon", "corp", 60, "anime style cyberpunk trading card, aggressive tracking eye cyber demon floating, orange surveillance system, always watching hunter seeker, dark orange and black colors, menacing tech eye, detailed anime illustration"),
    ("c_proxy_wall", "corp", 61, "anime style cyberpunk trading card, blue redirecting proxy barrier wall, cyber defense with redirection arrows, corporate network security system, sky blue and white colors, tech grid background, detailed anime mecha art"),
    ("c_corp_enforcer", "corp", 62, "anime style cyberpunk trading card, corporate heavy enforcer mecha soldier, red armored suit with company logo, debt collector weaponry pose, powerful corporate soldier, crimson and black colors, detailed mecha anime"),
    ("c_ai_guardian", "corp", 63, "anime style cyberpunk legendary trading card, ultimate AI defense robot with halo, cyan and magenta glowing circuits, invincible guardian pose, futuristic mecha, god-tier defense system, legendary anime illustration masterpiece"),
]

def generate_image(id, faction, seed, prompt):
    base_dir = "/home/madkoding/proyectos/kodingvibes/public/cards"
    output_path = f"{base_dir}/{faction}/{id}.png"
    
    if os.path.exists(output_path):
        size = os.path.getsize(output_path)
        if size > 10000:
            print(f"✓ {id} already exists ({size//1024}KB)")
            return True
    
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=400&height=560&seed={seed}&nologo=true&enhance=true"
    
    try:
        response = requests.get(url, timeout=120)
        if response.status_code == 200:
            with open(output_path, 'wb') as f:
                f.write(response.content)
            size = os.path.getsize(output_path)
            print(f"✓ {id} generated ({size//1024}KB)")
            return True
    except Exception as e:
        print(f"✗ {id} failed: {e}")
    return False

print(f"Generating {len(CARDS)} remaining cards...\n")

for id, faction, seed, prompt in CARDS:
    generate_image(id, faction, seed, prompt)
    time.sleep(2)

print("\nBatch complete!")
