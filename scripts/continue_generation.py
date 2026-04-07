#!/usr/bin/env python3
"""Continue generating remaining cards"""

import requests
import urllib.parse
import os
import time

CARDS = [
    {"id": "r_shadow_runner", "name": "Shadow Runner", "faction": "runner", "seed": 52,
     "prompt": "anime style cyberpunk trading card, elite ninja girl assassin, deep purple shadows surrounding her, phantom-like appearance ethereal, piercing through defenses pose, mysterious and deadly, high contrast lighting, premium anime illustration"},
    {"id": "c_firewall_v1", "name": "Firewall v1", "faction": "corp", "seed": 53,
     "prompt": "anime style cyberpunk trading card, mechanical firewall barrier with orange flame energy, basic defense system mecha, corporate tech aesthetic, orange and brown colors, sturdy defense wall structure, detailed mecha anime art"},
    {"id": "c_sentinel", "name": "Sentinel ICE", "faction": "corp", "seed": 54,
     "prompt": "anime style cyberpunk trading card, robotic sentinel guard mecha standing watch, blue mechanical armor plating, ever-vigilant defender pose, corporate security robot, navy blue steel colors, detailed robot anime illustration"},
    {"id": "c_black_ice", "name": "Black ICE", "faction": "corp", "seed": 55,
     "prompt": "anime style cyberpunk trading card, deadly black ice defense system with spikes, lethal counterattack mechanism, black and red glowing menacing, dangerous defensive tech, ominous presence, high quality anime art"},
    {"id": "c_neural_barrier", "name": "Neural Barrier", "faction": "corp", "seed": 56,
     "prompt": "anime style cyberpunk trading card, psychic barrier protecting mind, purple brain energy shield, mental defense fortress, pink and purple psychic powers, anime girl with barrier projection, detailed illustration"},
    {"id": "c_data_fort", "name": "Data Fort", "faction": "corp", "seed": 57,
     "prompt": "anime style cyberpunk trading card, massive digital fortress castle, impenetrable data stronghold structure, lavender and blue stone walls glowing, cyberpunk castle architecture, grand scale fortress, detailed anime environment"},
    {"id": "c_killswitch", "name": "Killswitch Protocol", "faction": "corp", "seed": 58,
     "prompt": "anime style cyberpunk legendary trading card, ultimate doomsday defense protocol activation, apocalyptic red energy explosion, final countermeasure system, skull and crossbones cyber motif, epic legendary scale, masterful anime illustration"},
    {"id": "c_honeypot", "name": "Honeypot", "faction": "corp", "seed": 59,
     "prompt": "anime style cyberpunk trading card, deceptive trap system disguised as treasure, golden honey dripping from data streams, tempting bait for hackers, orange and gold colors glowing, clever trap design, detailed anime art"},
    {"id": "c_trace_daemon", "name": "Trace Daemon", "faction": "corp", "seed": 60,
     "prompt": "anime style cyberpunk trading card, aggressive tracking eye cyber demon floating, orange surveillance system, always watching hunter seeker, dark orange and black colors, menacing tech eye, detailed anime illustration"},
    {"id": "c_proxy_wall", "name": "Proxy Wall", "faction": "corp", "seed": 61,
     "prompt": "anime style cyberpunk trading card, blue redirecting proxy barrier wall, cyber defense with redirection arrows, corporate network security system, sky blue and white colors, tech grid background, detailed anime mecha art"},
    {"id": "c_corp_enforcer", "name": "Corp Enforcer", "faction": "corp", "seed": 62,
     "prompt": "anime style cyberpunk trading card, corporate heavy enforcer mecha soldier, red armored suit with company logo, debt collector weaponry pose, powerful corporate soldier, crimson and black colors, detailed mecha anime"},
    {"id": "c_ai_guardian", "name": "AI Guardian", "faction": "corp", "seed": 63,
     "prompt": "anime style cyberpunk legendary trading card, ultimate AI defense robot with halo, cyan and magenta glowing circuits, invincible guardian pose, futuristic mecha, god-tier defense system, legendary anime illustration masterpiece"},
    {"id": "n_ram_upgrade", "name": "RAM Upgrade", "faction": "neutral", "seed": 64,
     "prompt": "anime style cyberpunk trading card item, memory upgrade chip device, teal colored RAM sticks glowing, computer hardware with circuit patterns, tech upgrade item glow, mint green neon, detailed anime tech illustration"},
    {"id": "n_neural_link", "name": "Neural Link", "faction": "neutral", "seed": 65,
     "prompt": "anime style cyberpunk trading card, brain computer interface cable connection, neural link port glowing on head, data stream flowing through cable, blue tech implant, cyberpunk upgrade device, detailed anime tech art"},
    {"id": "n_crypto_shield", "name": "Crypto Shield", "faction": "neutral", "seed": 66,
     "prompt": "anime style cyberpunk trading card, golden encryption shield with 256-bit lock symbol, cryptographic protection device, yellow energy barrier, cyber shield technology item, detailed anime tech illustration"},
    {"id": "n_overclock", "name": "Overclock Module", "faction": "neutral", "seed": 67,
     "prompt": "anime style cyberpunk trading card, overclocking device with heat waves radiating, speed boost module gadget, orange and red flames, performance enhancement tech, dangerous power levels, detailed anime tech art"},
    {"id": "n_quantum_core", "name": "Quantum Core", "faction": "neutral", "seed": 68,
     "prompt": "anime style cyberpunk legendary trading card, quantum computer core heart, impossible machine with swirling energy, purple and cyan quantum particles, mystical technology fusion, legendary item art, masterful illustration"},
    {"id": "n_backup_drive", "name": "Backup Drive", "faction": "neutral", "seed": 69,
     "prompt": "anime style cyberpunk trading card, emergency backup disk drive device, green data preservation glow, save point technology item, plan B gadget, mint green neon light, detailed anime tech illustration"},
    {"id": "n_data_broker", "name": "Data Broker", "faction": "neutral", "seed": 70,
     "prompt": "anime style cyberpunk trading card, information merchant device terminal, data trading holographic screen, stock market graphs floating, green economic tech, business cyberpunk tool, detailed anime illustration"},
    {"id": "n_stealth_chip", "name": "Stealth Chip", "faction": "neutral", "seed": 71,
     "prompt": "anime style cyberpunk trading card, invisible stealth microchip item, cloaking device component, gray and black stealth tech, undetectable hardware gadget, spy technology, detailed anime tech art"},
    {"id": "e_system_purge", "name": "System Purge", "faction": "runner", "seed": 72,
     "prompt": "anime style cyberpunk trading card, massive system delete command wave, total data erasure sweep, red and orange destruction energy, digital apocalypse scene, sweeping broom of doom effect, epic scale destruction, detailed anime art"},
    {"id": "e_deep_scan", "name": "Deep Scan", "faction": "runner", "seed": 73,
     "prompt": "anime style cyberpunk trading card, deep network scan visualization effect, searching through layers of data, blue radar waves spreading, information discovery burst, detective cyberpunk scene, detailed anime illustration"},
    {"id": "e_ddos_attack", "name": "DDoS Attack", "faction": "runner", "seed": 74,
     "prompt": "anime style cyberpunk trading card, distributed denial of service swarm attack, pink and red packet storm chaos, overwhelming data flood effect, explosive digital energy, chaos in network scene, detailed anime art"},
    {"id": "e_patch_update", "name": "Patch Update", "faction": "corp", "seed": 75,
     "prompt": "anime style cyberpunk trading card, system healing patch installation effect, green medical repair code flowing, band-aid on digital wounds, vulnerability fix glow, healing energy spreading, detailed anime illustration"},
    {"id": "e_emp_blast", "name": "EMP Blast", "faction": "corp", "seed": 76,
     "prompt": "anime style cyberpunk trading card, electromagnetic pulse explosion, yellow lightning burst spreading, electronics frying effect, total shutdown wave, disruptive energy field, epic anime energy effect art"},
    {"id": "e_overclock_burst", "name": "Overclock Burst", "faction": "neutral", "seed": 77,
     "prompt": "anime style cyberpunk trading card, temporary speed boost burst effect, orange and pink acceleration energy, time dilation effect visual, speed lines motion blur, power up aura surrounding, dynamic anime action scene"},
    {"id": "e_reboot", "name": "Emergency Reboot", "faction": "neutral", "seed": 78,
     "prompt": "anime style cyberpunk trading card, system restart and recovery sequence, green and blue renewal energy wave, refresh cycle effect, rebirth technology visual, restorative digital wave, detailed anime illustration"},
    {"id": "e_mass_recall", "name": "Mass Data Recall", "faction": "neutral", "seed": 79,
     "prompt": "anime style cyberpunk legendary trading card, ultimate information retrieval spell, global data summon effect, orange and pink cosmic knowledge, world network connection, god-tier information access, legendary anime masterpiece"},
]

def generate_image(prompt, seed, output_path):
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=400&height=560&seed={seed}&nologo=true&enhance=true"
    try:
        response = requests.get(url, timeout=120)
        if response.status_code == 200:
            with open(output_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"Error: {e}")
    return False

base_dir = "/home/madkoding/proyectos/kodingvibes/public/cards"

for card in CARDS:
    output_dir = os.path.join(base_dir, card['faction'])
    output_path = os.path.join(output_dir, f"{card['id']}.png")
    
    if os.path.exists(output_path) and os.path.getsize(output_path) > 10000:
        print(f"Skipping {card['name']} (exists)")
        continue
    
    print(f"Generating {card['name']}...", end=" ")
    if generate_image(card['prompt'], card['seed'], output_path):
        size = os.path.getsize(output_path)
        print(f"OK ({size//1024}KB)")
    else:
        print("FAILED")
    
    time.sleep(1.5)

print("\nDone!")
