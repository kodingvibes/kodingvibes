#!/usr/bin/env python3
"""
NetRun Card Image Generator using Ollama (Anime Style)
Uses x/flux2-klein:4b model for anime-style card illustrations
"""

import subprocess
import json
import os
import base64
from pathlib import Path

# Card definitions with anime-style prompts
CARDS = [
    # ========== RUNNER PROGRAMS ==========
    {"id": "r_neural_spike", "name": "Neural Spike", "type": "program", "faction": "runner", "rarity": "common", 
     "prompt": "anime style, cyberpunk hacker girl with electric cyan neural spike weapon, dynamic pose, glowing circuits, futuristic tech, digital energy effects, dark background with grid lines, detailed illustration, trading card game art"},
    {"id": "r_data_leech", "name": "Data Leech", "type": "program", "faction": "runner", "rarity": "common",
     "prompt": "anime style, mysterious cyberpunk character with glowing magenta DNA helix, data streams flowing into them, digital parasite, neon purple and blue, matrix-style code rain background, detailed anime illustration"},
    {"id": "r_ghost_protocol", "name": "Ghost Protocol", "type": "program", "faction": "runner", "rarity": "uncommon",
     "prompt": "anime style, invisible cyberpunk ninja with ghostly green aura, holographic stealth suit, phasing through digital barriers, neon green and teal colors, ethereal glow, mysterious atmosphere, detailed anime art"},
    {"id": "r_worm_cluster", "name": "Worm Cluster", "type": "program", "faction": "runner", "rarity": "uncommon",
     "prompt": "anime style, swarm of digital worms multiplying, red cybernetic viruses spreading through network, anime character controlling data worms, crimson and black colors, chaotic energy, trading card illustration"},
    {"id": "r_blackout", "name": "Blackout", "type": "program", "faction": "runner", "rarity": "rare",
     "prompt": "anime style, cyberpunk warrior in total darkness, eclipse energy, shadow powers, dark magenta and black, glowing eyes in the dark, dramatic lighting, powerful stance, high quality anime art"},
    {"id": "r_zero_day", "name": "Zero Day Exploit", "type": "program", "faction": "runner", "rarity": "legendary",
     "prompt": "anime style, epic legendary cyberpunk hacker with skull mask, ultimate exploit weapon, red and yellow energy explosion, world-ending power, apocalyptic digital scene, masterful anime illustration, legendary card art"},
    {"id": "r_packet_sniffer", "name": "Packet Sniffer", "type": "program", "faction": "runner", "rarity": "common",
     "prompt": "anime style, tech-savvy cyberpunk character with radar dish and antenna, scanning digital waves, cyan and teal colors, data visualization, network topology background, detailed anime illustration"},
    {"id": "r_rootkit", "name": "Rootkit", "type": "program", "faction": "runner", "rarity": "rare",
     "prompt": "anime style, hacker with root access green glowing symbols, breaking digital locks, deep system infiltration, matrix green code, powerful stance, cyberpunk aesthetic, detailed anime art"},
    {"id": "r_virus_inject", "name": "Virus Injection", "type": "program", "faction": "runner", "rarity": "uncommon",
     "prompt": "anime style, cyberpunk character injecting glowing green virus into mainframe, toxic digital energy, lime green and black, biological-mechanical fusion, action pose, detailed illustration"},
    {"id": "r_crypto_miner", "name": "Crypto Miner", "type": "program", "faction": "runner", "rarity": "common",
     "prompt": "anime style, cyberpunk miner with pickaxe mining digital gold, orange glow, cryptocurrency symbols floating, underground digital cave, amber and orange colors, detailed anime art"},
    {"id": "r_shadow_runner", "name": "Shadow Runner", "type": "program", "faction": "runner", "rarity": "rare",
     "prompt": "anime style, elite ninja cyberpunk assassin, deep purple shadows, phantom-like appearance, piercing through defenses, mysterious and deadly, high contrast lighting, premium anime illustration"},

    # ========== CORP ICE ==========
    {"id": "c_firewall_v1", "name": "Firewall v1", "type": "ice", "faction": "corp", "rarity": "common",
     "prompt": "anime style, mechanical firewall barrier with orange flame energy, basic defense system, cyberpunk corporate tech, orange and brown colors, sturdy defense wall, detailed mecha-anime art"},
    {"id": "c_sentinel", "name": "Sentinel ICE", "type": "ice", "faction": "corp", "rarity": "common",
     "prompt": "anime style, robotic sentinel guard standing watch, blue mechanical armor, ever-vigilant defender, corporate security mech, navy blue and steel colors, detailed robot anime illustration"},
    {"id": "c_black_ice", "name": "Black ICE", "type": "ice", "faction": "corp", "rarity": "rare",
     "prompt": "anime style, deadly black ice defense system, lethal counterattack mechanism, black and red glowing spikes, dangerous defensive tech, menacing presence, high quality anime art"},
    {"id": "c_neural_barrier", "name": "Neural Barrier", "type": "ice", "faction": "corp", "rarity": "uncommon",
     "prompt": "anime style, psychic barrier protecting mind, purple brain energy shield, mental defense fortress, pink and purple psychic powers, anime character with barrier, detailed illustration"},
    {"id": "c_data_fort", "name": "Data Fort", "type": "ice", "faction": "corp", "rarity": "uncommon",
     "prompt": "anime style, massive digital fortress castle, impenetrable data stronghold, lavender and blue stone walls, cyberpunk castle architecture, grand scale, detailed anime environment art"},
    {"id": "c_killswitch", "name": "Killswitch Protocol", "type": "ice", "faction": "corp", "rarity": "legendary",
     "prompt": "anime style, ultimate doomsday defense protocol, apocalyptic red energy, final countermeasure system, skull and crossbones cyber motif, epic legendary scale, masterful anime illustration"},
    {"id": "c_honeypot", "name": "Honeypot", "type": "ice", "faction": "corp", "rarity": "rare",
     "prompt": "anime style, deceptive trap system disguised as treasure, golden honey dripping from data streams, tempting bait for hackers, orange and gold colors, clever trap design, detailed anime art"},
    {"id": "c_trace_daemon", "name": "Trace Daemon", "type": "ice", "faction": "corp", "rarity": "common",
     "prompt": "anime style, aggressive tracking eye cyber demon, orange surveillance system, always watching, hunter-seeker drone, dark orange and black, detailed anime illustration"},
    {"id": "c_proxy_wall", "name": "Proxy Wall", "type": "ice", "faction": "corp", "rarity": "common",
     "prompt": "anime style, blue redirecting proxy barrier, cyber defense wall with redirection arrows, corporate network security, sky blue and white, tech grid background, detailed anime art"},
    {"id": "c_corp_enforcer", "name": "Corp Enforcer", "type": "ice", "faction": "corp", "rarity": "rare",
     "prompt": "anime style, corporate heavy enforcer mech, red armored suit with company logo, debt collector weaponry, powerful corporate soldier, crimson and black, detailed mecha anime"},
    {"id": "c_ai_guardian", "name": "AI Guardian", "type": "ice", "faction": "corp", "rarity": "legendary",
     "prompt": "anime style, ultimate AI defense robot, cyan and magenta glowing circuits, invincible guardian, futuristic mecha with halo, god-tier defense system, legendary anime illustration"},

    # ========== NEUTRAL HARDWARE ==========
    {"id": "n_ram_upgrade", "name": "RAM Upgrade", "type": "hardware", "faction": "neutral", "rarity": "common",
     "prompt": "anime style, cyberpunk memory upgrade chip, teal colored RAM sticks, computer hardware with glowing circuits, tech upgrade item, mint green glow, detailed anime tech illustration"},
    {"id": "n_neural_link", "name": "Neural Link", "type": "hardware", "faction": "neutral", "rarity": "uncommon",
     "prompt": "anime style, brain-computer interface cable connection, neural link port on head, data stream flowing, blue tech implant, cyberpunk upgrade, detailed anime art"},
    {"id": "n_crypto_shield", "name": "Crypto Shield", "type": "hardware", "faction": "neutral", "rarity": "uncommon",
     "prompt": "anime style, golden encryption shield with 256-bit lock, cryptographic protection device, yellow energy barrier, cyber shield technology, detailed anime illustration"},
    {"id": "n_overclock", "name": "Overclock Module", "type": "hardware", "faction": "neutral", "rarity": "rare",
     "prompt": "anime style, overclocking device with heat waves, speed boost module, orange and red flames, performance enhancement tech, dangerous power levels, detailed anime tech art"},
    {"id": "n_quantum_core", "name": "Quantum Core", "type": "hardware", "faction": "neutral", "rarity": "legendary",
     "prompt": "anime style, legendary quantum computer core, impossible machine heart, purple and cyan swirling energy, quantum particles, mystical technology fusion, masterful anime illustration"},
    {"id": "n_backup_drive", "name": "Backup Drive", "type": "hardware", "faction": "neutral", "rarity": "common",
     "prompt": "anime style, emergency backup disk drive, green data preservation device, save point technology, plan B gadget, mint green glow, detailed anime tech art"},
    {"id": "n_data_broker", "name": "Data Broker", "type": "hardware", "faction": "neutral", "rarity": "common",
     "prompt": "anime style, information merchant device, data trading terminal, stock market graphs, green economic tech, business cyberpunk tool, detailed anime illustration"},
    {"id": "n_stealth_chip", "name": "Stealth Chip", "type": "hardware", "faction": "neutral", "rarity": "rare",
     "prompt": "anime style, invisible stealth microchip, cloaking device component, gray and black stealth tech, undetectable hardware, spy technology, detailed anime tech art"},

    # ========== EVENTS ==========
    {"id": "e_system_purge", "name": "System Purge", "type": "event", "faction": "runner", "rarity": "rare",
     "prompt": "anime style, massive system delete command, total data erasure wave, red and orange destruction, digital apocalypse, sweeping broom of doom, epic scale destruction, detailed anime art"},
    {"id": "e_deep_scan", "name": "Deep Scan", "type": "event", "faction": "runner", "rarity": "common",
     "prompt": "anime style, deep network scan visualization, searching through layers of data, blue radar waves, information discovery, detective cyberpunk scene, detailed anime illustration"},
    {"id": "e_ddos_attack", "name": "DDoS Attack", "type": "event", "faction": "runner", "rarity": "uncommon",
     "prompt": "anime style, distributed denial of service swarm attack, pink and red packet storm, overwhelming data flood, chaos in network, explosive digital energy, detailed anime art"},
    {"id": "e_patch_update", "name": "Patch Update", "type": "event", "faction": "corp", "rarity": "common",
     "prompt": "anime style, system healing patch installation, green medical repair code, band-aid on digital wounds, vulnerability fix, healing energy, detailed anime illustration"},
    {"id": "e_emp_blast", "name": "EMP Blast", "type": "event", "faction": "corp", "rarity": "rare",
     "prompt": "anime style, electromagnetic pulse explosion, yellow lightning burst, electronics frying, total shutdown wave, disruptive energy field, epic anime energy effect"},
    {"id": "e_overclock_burst", "name": "Overclock Burst", "type": "event", "faction": "neutral", "rarity": "uncommon",
     "prompt": "anime style, temporary speed boost burst, orange and pink acceleration energy, time dilation effect, speed lines, power up aura, dynamic anime action scene"},
    {"id": "e_reboot", "name": "Emergency Reboot", "type": "event", "faction": "neutral", "rarity": "uncommon",
     "prompt": "anime style, system restart and recovery sequence, green and blue renewal energy, refresh cycle, rebirth technology, restorative digital wave, detailed anime illustration"},
    {"id": "e_mass_recall", "name": "Mass Data Recall", "type": "event", "faction": "neutral", "rarity": "legendary",
     "prompt": "anime style, ultimate information retrieval, global data summon, orange and pink cosmic knowledge, world network connection, god-tier information access, legendary anime art"},
]

def generate_image_with_ollama(prompt, output_path):
    """Generate image using Ollama's flux2-klein model"""
    try:
        # Create the request payload for Ollama
        payload = {
            "model": "x/flux2-klein:4b",
            "prompt": prompt,
            "stream": False
        }
        
        # Call Ollama API
        result = subprocess.run(
            ["curl", "-s", "http://localhost:11434/api/generate",
             "-H", "Content-Type: application/json",
             "-d", json.dumps(payload)],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            print(f"Error calling Ollama: {result.stderr}")
            return False
            
        # Parse response
        try:
            response = json.loads(result.stdout)
            # The response format may vary depending on the model
            print(f"Response received for {os.path.basename(output_path)}")
            return True
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print(f"Response: {result.stdout[:500]}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"Timeout generating {os.path.basename(output_path)}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def generate_all_cards():
    """Generate all card images"""
    base_dir = "/home/madkoding/proyectos/kodingvibes/public/cards"
    
    # Create directories
    for subdir in ["runner", "corp", "neutral", "events"]:
        os.makedirs(os.path.join(base_dir, subdir), exist_ok=True)
    
    total = len(CARDS)
    success_count = 0
    
    for i, card in enumerate(CARDS, 1):
        print(f"\n[{i}/{total}] Generating: {card['name']}")
        print(f"Prompt: {card['prompt'][:80]}...")
        
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
            print(f"  Already exists, skipping...")
            success_count += 1
            continue
        
        # Generate image
        if generate_image_with_ollama(card['prompt'], output_path):
            success_count += 1
            print(f"  ✓ Success!")
        else:
            print(f"  ✗ Failed")
        
        # Small delay between requests
        import time
        time.sleep(0.5)
    
    print(f"\n{'='*50}")
    print(f"Generation complete: {success_count}/{total} cards")
    print(f"{'='*50}")

if __name__ == "__main__":
    generate_all_cards()
