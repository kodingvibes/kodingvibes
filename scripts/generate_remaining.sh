#!/bin/bash
cd /home/madkoding/proyectos/kodingvibes

# Function to generate card
generate_card() {
    local id=$1
    local name=$2
    local faction=$3
    local seed=$4
    local prompt="$5"
    
    local output_dir="public/cards/$faction"
    local output_file="$output_dir/${id}.png"
    
    if [ -f "$output_file" ] && [ $(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null) -gt 10000 ]; then
        echo "✓ $name already exists"
        return 0
    fi
    
    encoded_prompt=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$prompt'''))")
    url="https://image.pollinations.ai/prompt/${encoded_prompt}?width=400&height=560&seed=${seed}&nologo=true&enhance=true"
    
    echo "Generating $name..."
    curl -s -o "$output_file" "$url"
    
    if [ -f "$output_file" ]; then
        size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
        echo "  ✓ $name (${size} bytes)"
    else
        echo "  ✗ $name failed"
    fi
    
    sleep 2
generate_card "r_shadow_runner" "Shadow Runner" "runner" 52 "anime style cyberpunk trading card, elite ninja girl assassin, deep purple shadows surrounding her, phantom-like appearance ethereal, piercing through defenses pose, mysterious and deadly, high contrast lighting, premium anime illustration"

# Corp ICE
generate_card "c_firewall_v1" "Firewall v1" "corp" 53 "anime style cyberpunk trading card, mechanical firewall barrier with orange flame energy, basic defense system mecha, corporate tech aesthetic, orange and brown colors, sturdy defense wall structure, detailed mecha anime art"

generate_card "c_sentinel" "Sentinel ICE" "corp" 54 "anime style cyberpunk trading card, robotic sentinel guard mecha standing watch, blue mechanical armor plating, ever-vigilant defender pose, corporate security robot, navy blue steel colors, detailed robot anime illustration"

generate_card "c_black_ice" "Black ICE" "corp" 55 "anime style cyberpunk trading card, deadly black ice defense system with spikes, lethal counterattack mechanism, black and red glowing menacing, dangerous defensive tech, ominous presence, high quality anime art"

generate_card "c_neural_barrier" "Neural Barrier" "corp" 56 "anime style cyberpunk trading card, psychic barrier protecting mind, purple brain energy shield, mental defense fortress, pink and purple psychic powers, anime girl with barrier projection, detailed illustration"

generate_card "c_data_fort" "Data Fort" "corp" 57 "anime style cyberpunk trading card, massive digital fortress castle, impenetrable data stronghold structure, lavender and blue stone walls glowing, cyberpunk castle architecture, grand scale fortress, detailed anime environment"

generate_card "c_killswitch" "Killswitch Protocol" "corp" 58 "anime style cyberpunk legendary trading card, ultimate doomsday defense protocol activation, apocalyptic red energy explosion, final countermeasure system, skull and crossbones cyber motif, epic legendary scale, masterful anime illustration"

generate_card "c_honeypot" "Honeypot" "corp" 59 "anime style cyberpunk trading card, deceptive trap system disguised as treasure, golden honey dripping from data streams, tempting bait for hackers, orange and gold colors glowing, clever trap design, detailed anime art"

generate_card "c_trace_daemon" "Trace Daemon" "corp" 60 "anime style cyberpunk trading card, aggressive tracking eye cyber demon floating, orange surveillance system, always watching hunter seeker, dark orange and black colors, menacing tech eye, detailed anime illustration"

generate_card "c_proxy_wall" "Proxy Wall" "corp" 61 "anime style cyberpunk trading card, blue redirecting proxy barrier wall, cyber defense with redirection arrows, corporate network security system, sky blue and white colors, tech grid background, detailed anime mecha art"

generate_card "c_corp_enforcer" "Corp Enforcer" "corp" 62 "anime style cyberpunk trading card, corporate heavy enforcer mecha soldier, red armored suit with company logo, debt collector weaponry pose, powerful corporate soldier, crimson and black colors, detailed mecha anime"

generate_card "c_ai_guardian" "AI Guardian" "corp" 63 "anime style cyberpunk legendary trading card, ultimate AI defense robot with halo, cyan and magenta glowing circuits, invincible guardian pose, futuristic mecha, god-tier defense system, legendary anime illustration masterpiece"

# Neutral Hardware
generate_card "n_ram_upgrade" "RAM Upgrade" "neutral" 64 "anime style cyberpunk trading card item, memory upgrade chip device, teal colored RAM sticks glowing, computer hardware with circuit patterns, tech upgrade item glow, mint green neon, detailed anime tech illustration"

generate_card "n_neural_link" "Neural Link" "neutral" 65 "anime style cyberpunk trading card, brain computer interface cable connection, neural link port glowing on head, data stream flowing through cable, blue tech implant, cyberpunk upgrade device, detailed anime tech art"

generate_card "n_crypto_shield" "Crypto Shield" "neutral" 66 "anime style cyberpunk trading card, golden encryption shield with 256-bit lock symbol, cryptographic protection device, yellow energy barrier, cyber shield technology item, detailed anime tech illustration"

generate_card "n_overclock" "Overclock Module" "neutral" 67 "anime style cyberpunk trading card, overclocking device with heat waves radiating, speed boost module gadget, orange and red flames, performance enhancement tech, dangerous power levels, detailed anime tech art"

generate_card "n_quantum_core" "Quantum Core" "neutral" 68 "anime style cyberpunk legendary trading card, quantum computer core heart, impossible machine with swirling energy, purple and cyan quantum particles, mystical technology fusion, legendary item art, masterful illustration"

generate_card "n_backup_drive" "Backup Drive" "neutral" 69 "anime style cyberpunk trading card, emergency backup disk drive device, green data preservation glow, save point technology item, plan B gadget, mint green neon light, detailed anime tech illustration"

generate_card "n_data_broker" "Data Broker" "neutral" 70 "anime style cyberpunk trading card, information merchant device terminal, data trading holographic screen, stock market graphs floating, green economic tech, business cyberpunk tool, detailed anime illustration"

generate_card "n_stealth_chip" "Stealth Chip" "neutral" 71 "anime style cyberpunk trading card, invisible stealth microchip item, cloaking device component, gray and black stealth tech, undetectable hardware gadget, spy technology, detailed anime tech art"

# Events
generate_card "e_system_purge" "System Purge" "runner" 72 "anime style cyberpunk trading card, massive system delete command wave, total data erasure sweep, red and orange destruction energy, digital apocalypse scene, sweeping broom of doom effect, epic scale destruction, detailed anime art"

generate_card "e_deep_scan" "Deep Scan" "runner" 73 "anime style cyberpunk trading card, deep network scan visualization effect, searching through layers of data, blue radar waves spreading, information discovery burst, detective cyberpunk scene, detailed anime illustration"

generate_card "e_ddos_attack" "DDoS Attack" "runner" 74 "anime style cyberpunk trading card, distributed denial of service swarm attack, pink and red packet storm chaos, overwhelming data flood effect, explosive digital energy, chaos in network scene, detailed anime art"

generate_card "e_patch_update" "Patch Update" "corp" 75 "anime style cyberpunk trading card, system healing patch installation effect, green medical repair code flowing, band-aid on digital wounds, vulnerability fix glow, healing energy spreading, detailed anime illustration"

generate_card "e_emp_blast" "EMP Blast" "corp" 76 "anime style cyberpunk trading card, electromagnetic pulse explosion, yellow lightning burst spreading, electronics frying effect, total shutdown wave, disruptive energy field, epic anime energy effect art"

generate_card "e_overclock_burst" "Overclock Burst" "events" 77 "anime style cyberpunk trading card, temporary speed boost burst effect, orange and pink acceleration energy, time dilation effect visual, speed lines motion blur, power up aura surrounding, dynamic anime action scene"

generate_card "e_reboot" "Emergency Reboot" "events" 78 "anime style cyberpunk trading card, system restart and recovery sequence, green and blue renewal energy wave, refresh cycle effect, rebirth technology visual, restorative digital wave, detailed anime illustration"

generate_card "e_mass_recall" "Mass Data Recall" "events" 79 "anime style cyberpunk legendary trading card, ultimate information retrieval spell, global data summon effect, orange and pink cosmic knowledge, world network connection, god-tier information access, legendary anime masterpiece"

echo "All cards generated!"
