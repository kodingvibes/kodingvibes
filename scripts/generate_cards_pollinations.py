#!/usr/bin/env python3
"""
NetRun Card Image Generator using Pollinations.ai
Generates anime-style card illustrations via free AI image API
"""

import requests
import urllib.parse
import os
import time
from pathlib import Path

# Card definitions with anime-style prompts
CARDS = [
    # ========== RUNNER PROGRAMS ==========
    {"id": "r_neural_spike", "name": "Neural Spike", "type": "program", "faction": "runner", "rarity": "common", 
     "prompt": "anime style cyberpunk trading card, female hacker with electric cyan neural spike weapon, dynamic action pose, glowing circuit tattoos, futuristic tech outfit, digital energy particles, dark background with holographic grid, detailed anime illustration, vibrant colors, high quality", "seed": 42},
    {"id": "r_data_leech", "name": "Data Leech", "type": "program", "faction": "runner", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, mysterious girl with flowing magenta data streams, DNA helix hologram, digital parasite energy, neon purple and blue, matrix code rain background, detailed anime art, glowing eyes, tech atmosphere", "seed": 43},
    {"id": "r_ghost_protocol", "name": "Ghost Protocol", "type": "program", "faction": "runner", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, invisible cyber ninja with ghostly green aura, holographic stealth suit phasing, neon green teal colors, ethereal glow effect, mysterious atmosphere, detailed anime illustration, translucent figure", "seed": 44},
    {"id": "r_worm_cluster", "name": "Worm Cluster", "type": "program", "faction": "runner", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, girl controlling swarm of digital red worms, virus particles multiplying, crimson and black colors, chaotic energy streams, creepy cute anime style, detailed illustration, dark atmosphere", "seed": 45},
    {"id": "r_blackout", "name": "Blackout", "type": "program", "faction": "runner", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, warrior girl surrounded by total darkness, eclipse energy effect, shadow powers manifesting, dark magenta and black theme, glowing eyes in darkness, dramatic lighting, powerful stance, high quality art", "seed": 46},
    {"id": "r_zero_day", "name": "Zero Day Exploit", "type": "program", "faction": "runner", "rarity": "legendary",
     "prompt": "anime style cyberpunk legendary trading card, epic hacker girl with skull mask, ultimate exploit weapon glowing, red and yellow energy explosion, world-ending power pose, apocalyptic digital scene, masterful anime illustration, god-tier card art", "seed": 47},
    {"id": "r_packet_sniffer", "name": "Packet Sniffer", "type": "program", "faction": "runner", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, tech girl with radar dish scanner, scanning digital waves with antenna, cyan and teal colors, data visualization effects, network topology hologram background, detailed anime illustration", "seed": 48},
    {"id": "r_rootkit", "name": "Rootkit", "type": "program", "faction": "runner", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, hacker girl with root access green glowing symbols floating, breaking digital locks, deep system infiltration pose, matrix green code background, powerful stance, cyberpunk aesthetic, detailed art", "seed": 49},
    {"id": "r_virus_inject", "name": "Virus Injection", "type": "program", "faction": "runner", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, girl injecting glowing green virus into mainframe, toxic digital energy effects, lime green and black colors, biological mechanical fusion aesthetic, action pose, dynamic illustration", "seed": 50},
    {"id": "r_crypto_miner", "name": "Crypto Miner", "type": "program", "faction": "runner", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, cute miner girl with digital pickaxe, mining cryptocurrency gold, orange glow effects, crypto symbols floating around, digital cave background, amber orange colors, detailed anime art", "seed": 51},
    {"id": "r_shadow_runner", "name": "Shadow Runner", "type": "program", "faction": "runner", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, elite ninja girl assassin, deep purple shadows surrounding her, phantom-like appearance ethereal, piercing through defenses pose, mysterious and deadly, high contrast lighting, premium anime illustration", "seed": 52},

    # ========== CORP ICE ==========
    {"id": "c_firewall_v1", "name": "Firewall v1", "type": "ice", "faction": "corp", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, mechanical firewall barrier with orange flame energy, basic defense system mecha, corporate tech aesthetic, orange and brown colors, sturdy defense wall structure, detailed mecha anime art", "seed": 53},
    {"id": "c_sentinel", "name": "Sentinel ICE", "type": "ice", "faction": "corp", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, robotic sentinel guard mecha standing watch, blue mechanical armor plating, ever-vigilant defender pose, corporate security robot, navy blue steel colors, detailed robot anime illustration", "seed": 54},
    {"id": "c_black_ice", "name": "Black ICE", "type": "ice", "faction": "corp", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, deadly black ice defense system with spikes, lethal counterattack mechanism, black and red glowing menacing, dangerous defensive tech, ominous presence, high quality anime art", "seed": 55},
    {"id": "c_neural_barrier", "name": "Neural Barrier", "type": "ice", "faction": "corp", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, psychic barrier protecting mind, purple brain energy shield, mental defense fortress, pink and purple psychic powers, anime girl with barrier projection, detailed illustration", "seed": 56},
    {"id": "c_data_fort", "name": "Data Fort", "type": "ice", "faction": "corp", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, massive digital fortress castle, impenetrable data stronghold structure, lavender and blue stone walls glowing, cyberpunk castle architecture, grand scale fortress, detailed anime environment", "seed": 57},
    {"id": "c_killswitch", "name": "Killswitch Protocol", "type": "ice", "faction": "corp", "rarity": "legendary",
     "prompt": "anime style cyberpunk legendary trading card, ultimate doomsday defense protocol activation, apocalyptic red energy explosion, final countermeasure system, skull and crossbones cyber motif, epic legendary scale, masterful anime illustration", "seed": 58},
    {"id": "c_honeypot", "name": "Honeypot", "type": "ice", "faction": "corp", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, deceptive trap system disguised as treasure, golden honey dripping from data streams, tempting bait for hackers, orange and gold colors glowing, clever trap design, detailed anime art", "seed": 59},
    {"id": "c_trace_daemon", "name": "Trace Daemon", "type": "ice", "faction": "corp", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, aggressive tracking eye cyber demon floating, orange surveillance system, always watching hunter seeker, dark orange and black colors, menacing tech eye, detailed anime illustration", "seed": 60},
    {"id": "c_proxy_wall", "name": "Proxy Wall", "type": "ice", "faction": "corp", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, blue redirecting proxy barrier wall, cyber defense with redirection arrows, corporate network security system, sky blue and white colors, tech grid background, detailed anime mecha art", "seed": 61},
    {"id": "c_corp_enforcer", "name": "Corp Enforcer", "type": "ice", "faction": "corp", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, corporate heavy enforcer mecha soldier, red armored suit with company logo, debt collector weaponry pose, powerful corporate soldier, crimson and black colors, detailed mecha anime", "seed": 62},
    {"id": "c_ai_guardian", "name": "AI Guardian", "type": "ice", "faction": "corp", "rarity": "legendary",
     "prompt": "anime style cyberpunk legendary trading card, ultimate AI defense robot with halo, cyan and magenta glowing circuits, invincible guardian pose, futuristic mecha, god-tier defense system, legendary anime illustration masterpiece", "seed": 63},

    # ========== NEUTRAL HARDWARE ==========
    {"id": "n_ram_upgrade", "name": "RAM Upgrade", "type": "hardware", "faction": "neutral", "rarity": "common",
     "prompt": "anime style cyberpunk trading card item, memory upgrade chip device, teal colored RAM sticks glowing, computer hardware with circuit patterns, tech upgrade item glow, mint green neon, detailed anime tech illustration", "seed": 64},
    {"id": "n_neural_link", "name": "Neural Link", "type": "hardware", "faction": "neutral", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, brain computer interface cable connection, neural link port glowing on head, data stream flowing through cable, blue tech implant, cyberpunk upgrade device, detailed anime tech art", "seed": 65},
    {"id": "n_crypto_shield", "name": "Crypto Shield", "type": "hardware", "faction": "neutral", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, golden encryption shield with 256-bit lock symbol, cryptographic protection device, yellow energy barrier, cyber shield technology item, detailed anime tech illustration", "seed": 66},
    {"id": "n_overclock", "name": "Overclock Module", "type": "hardware", "faction": "neutral", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, overclocking device with heat waves radiating, speed boost module gadget, orange and red flames, performance enhancement tech, dangerous power levels, detailed anime tech art", "seed": 67},
    {"id": "n_quantum_core", "name": "Quantum Core", "type": "hardware", "faction": "neutral", "rarity": "legendary",
     "prompt": "anime style cyberpunk legendary trading card, quantum computer core heart, impossible machine with swirling energy, purple and cyan quantum particles, mystical technology fusion, legendary item art, masterful illustration", "seed": 68},
    {"id": "n_backup_drive", "name": "Backup Drive", "type": "hardware", "faction": "neutral", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, emergency backup disk drive device, green data preservation glow, save point technology item, plan B gadget, mint green neon light, detailed anime tech illustration", "seed": 69},
    {"id": "n_data_broker", "name": "Data Broker", "type": "hardware", "faction": "neutral", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, information merchant device terminal, data trading holographic screen, stock market graphs floating, green economic tech, business cyberpunk tool, detailed anime illustration", "seed": 70},
    {"id": "n_stealth_chip", "name": "Stealth Chip", "type": "hardware", "faction": "neutral", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, invisible stealth microchip item, cloaking device component, gray and black stealth tech, undetectable hardware gadget, spy technology, detailed anime tech art", "seed": 71},

    # ========== EVENTS ==========
    {"id": "e_system_purge", "name": "System Purge", "type": "event", "faction": "runner", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, massive system delete command wave, total data erasure sweep, red and orange destruction energy, digital apocalypse scene, sweeping broom of doom effect, epic scale destruction, detailed anime art", "seed": 72},
    {"id": "e_deep_scan", "name": "Deep Scan", "type": "event", "faction": "runner", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, deep network scan visualization effect, searching through layers of data, blue radar waves spreading, information discovery burst, detective cyberpunk scene, detailed anime illustration", "seed": 73},
    {"id": "e_ddos_attack", "name": "DDoS Attack", "type": "event", "faction": "runner", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, distributed denial of service swarm attack, pink and red packet storm chaos, overwhelming data flood effect, explosive digital energy, chaos in network scene, detailed anime art", "seed": 74},
    {"id": "e_patch_update", "name": "Patch Update", "type": "event", "faction": "corp", "rarity": "common",
     "prompt": "anime style cyberpunk trading card, system healing patch installation effect, green medical repair code flowing, band-aid on digital wounds, vulnerability fix glow, healing energy spreading, detailed anime illustration", "seed": 75},
    {"id": "e_emp_blast", "name": "EMP Blast", "type": "event", "faction": "corp", "rarity": "rare",
     "prompt": "anime style cyberpunk trading card, electromagnetic pulse explosion, yellow lightning burst spreading, electronics frying effect, total shutdown wave, disruptive energy field, epic anime energy effect art", "seed": 76},
    {"id": "e_overclock_burst", "name": "Overclock Burst", "type": "event", "faction": "neutral", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, temporary speed boost burst effect, orange and pink acceleration energy, time dilation effect visual, speed lines motion blur, power up aura surrounding, dynamic anime action scene", "seed": 77},
    {"id": "e_reboot", "name": "Emergency Reboot", "type": "event", "faction": "neutral", "rarity": "uncommon",
     "prompt": "anime style cyberpunk trading card, system restart and recovery sequence, green and blue renewal energy wave, refresh cycle effect, rebirth technology visual, restorative digital wave, detailed anime illustration", "seed": 78},
    {"id": "e_mass_recall", "name": "Mass Data Recall", "type": "event", "faction": "neutral", "rarity": "legendary",
     "prompt": "anime style cyberpunk legendary trading card, ultimate information retrieval spell, global data summon effect, orange and pink cosmic knowledge, world network connection, god-tier information access, legendary anime masterpiece", "seed": 79},
]

def generate_image_pollinations(prompt, seed, output_path):
    """Generate image using Pollinations.ai API"""
    try:
        # Encode prompt for URL
        encoded_prompt = urllib.parse.quote(prompt)
        
        # Construct URL with parameters for consistent generation
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=400&height=560&seed={seed}&nologo=true&enhance=true"
        
        # Download image
        response = requests.get(url, timeout=120)
        
        if response.status_code == 200:
            # Save image
            with open(output_path, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"    HTTP Error: {response.status_code}")
            return False
            
    except requests.Timeout:
        print(f"    Timeout error")
        return False
    except Exception as e:
        print(f"    Error: {e}")
        return False

def generate_all_cards():
    """Generate all card images"""
    base_dir = "/home/madkoding/proyectos/kodingvibes/public/cards"
    
    # Create directories
    for subdir in ["runner", "corp", "neutral", "events"]:
        os.makedirs(os.path.join(base_dir, subdir), exist_ok=True)
    
    total = len(CARDS)
    success_count = 0
    failed_cards = []
    
    print("=" * 60)
    print("NetRun Card Image Generator - Pollinations.ai")
    print("=" * 60)
    print(f"Generating {total} anime-style card images...\n")
    
    for i, card in enumerate(CARDS, 1):
        print(f"[{i}/{total}] {card['name']} ({card['rarity'].upper()})")
        print(f"      Type: {card['type']} | Faction: {card['faction']}")
        
        # Determine output directory
        if card['faction'] == 'runner':
            output_dir = os.path.join(base_dir, "runner")
        elif card['faction'] == 'corp':
            output_dir = os.path.join(base_dir, "corp")
        elif card['type'] == 'event' and card['faction'] == 'neutral':
            output_dir = os.path.join(base_dir, "events")
        else:
            output_dir = os.path.join(base_dir, "neutral")
        
        output_path = os.path.join(output_dir, f"{card['id']}.png")
        
        # Check if already exists
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            if file_size > 1000:  # Make sure it's not an error page
                print(f"      ✓ Already exists ({file_size} bytes)")
                success_count += 1
                continue
            else:
                print(f"      Regenerating (file too small)...")
        
        # Generate image
        print(f"      Generating...", end=" ")
        if generate_image_pollinations(card['prompt'], card['seed'], output_path):
            file_size = os.path.getsize(output_path)
            print(f"✓ Success ({file_size} bytes)")
            success_count += 1
        else:
            print(f"✗ Failed")
            failed_cards.append(card['name'])
        
        # Rate limiting - wait between requests
        if i < total:
            time.sleep(1.5)
    
    print("\n" + "=" * 60)
    print(f"Generation Complete: {success_count}/{total} cards")
    if failed_cards:
        print(f"Failed: {', '.join(failed_cards)}")
    print("=" * 60)

if __name__ == "__main__":
    generate_all_cards()
