#!/usr/bin/env python3
"""
NetRun Card Image Generator
Generates anime/cyberpunk style card images using Pillow
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import os
import json
import math

# Card dimensions (standard TCG size)
CARD_WIDTH = 400
CARD_HEIGHT = 560

# Card data from cards.ts
CARDS = [
    # ========== RUNNER PROGRAMS ==========
    {"id": "r_neural_spike", "name": "Neural Spike", "type": "program", "faction": "runner", "rarity": "common", "strength": 3, "firewall": 1, "ramCost": 2, "ability": "Ataque rápido y directo", "flavorText": "Un pulso limpio. Sin rastro.", "artColors": ["#00ffff", "#0066ff"], "artIcon": "⚡", "category": "attack"},
    {"id": "r_data_leech", "name": "Data Leech", "type": "program", "faction": "runner", "rarity": "common", "strength": 2, "firewall": 2, "ramCost": 2, "ability": "Drena 1 punto de vida al atacar", "flavorText": "Lo que es tuyo, es mío.", "artColors": ["#ff00ff", "#6600cc"], "artIcon": "🧬", "category": "drain"},
    {"id": "r_ghost_protocol", "name": "Ghost Protocol", "type": "program", "faction": "runner", "rarity": "uncommon", "strength": 4, "firewall": 2, "ramCost": 3, "ability": "Ignora firewall al atacar", "flavorText": "No puedes detener lo que no puedes ver.", "artColors": ["#00ff88", "#004422"], "artIcon": "👻", "category": "stealth"},
    {"id": "r_worm_cluster", "name": "Worm Cluster", "type": "program", "faction": "runner", "rarity": "uncommon", "strength": 2, "firewall": 3, "ramCost": 3, "ability": "+1 fuerza a todos los aliados al jugar", "flavorText": "Se multiplican. Siempre se multiplican.", "artColors": ["#ff4444", "#880000"], "artIcon": "🐛", "category": "swarm"},
    {"id": "r_blackout", "name": "Blackout", "type": "program", "faction": "runner", "rarity": "rare", "strength": 5, "firewall": 3, "ramCost": 4, "ability": "Ataca dos veces", "flavorText": "Las luces se apagaron. Ya era tarde.", "artColors": ["#ff0066", "#330011"], "artIcon": "🌑", "category": "darkness"},
    {"id": "r_zero_day", "name": "Zero Day Exploit", "type": "program", "faction": "runner", "rarity": "legendary", "strength": 7, "firewall": 4, "ramCost": 6, "ability": "Destruye un enemigo al azar al jugar", "flavorText": "El día que la red se arrodilló.", "artColors": ["#ff0000", "#ffff00"], "artIcon": "💀", "category": "destruction"},
    {"id": "r_packet_sniffer", "name": "Packet Sniffer", "type": "program", "faction": "runner", "rarity": "common", "strength": 1, "firewall": 1, "ramCost": 1, "ability": "Roba 1 carta al jugar", "flavorText": "Cada byte cuenta.", "artColors": ["#44ffff", "#006666"], "artIcon": "📡", "category": "scanner"},
    {"id": "r_rootkit", "name": "Rootkit", "type": "program", "faction": "runner", "rarity": "rare", "strength": 4, "firewall": 5, "ramCost": 5, "ability": "+2 fuerza propia al jugar", "flavorText": "Acceso root concedido. Buena suerte.", "artColors": ["#00ff00", "#003300"], "artIcon": "🔓", "category": "infiltration"},
    {"id": "r_virus_inject", "name": "Virus Injection", "type": "program", "faction": "runner", "rarity": "uncommon", "strength": 3, "firewall": 1, "ramCost": 2, "ability": "Hace 2 de daño directo al jugar", "flavorText": "Inyección directa en el mainframe.", "artColors": ["#88ff00", "#224400"], "artIcon": "🦠", "category": "virus"},
    {"id": "r_crypto_miner", "name": "Crypto Miner", "type": "program", "faction": "runner", "rarity": "common", "strength": 2, "firewall": 2, "ramCost": 2, "ability": "Gana 1 RAM al jugar", "flavorText": "Minando recursos en la sombra.", "artColors": ["#ffaa00", "#553300"], "artIcon": "⛏️", "category": "mining"},
    {"id": "r_shadow_runner", "name": "Shadow Runner", "type": "program", "faction": "runner", "rarity": "rare", "strength": 6, "firewall": 2, "ramCost": 5, "ability": "Ignora firewall. Drena 2 al atacar", "flavorText": "Nadie la ha visto. Pero todos la han sentido.", "artColors": ["#6600ff", "#000033"], "artIcon": "🥷", "category": "ninja"},

    # ========== CORP ICE ==========
    {"id": "c_firewall_v1", "name": "Firewall v1", "type": "ice", "faction": "corp", "rarity": "common", "strength": 1, "firewall": 3, "ramCost": 2, "ability": "Muro básico de defensa", "flavorText": "Primer nivel de protección.", "artColors": ["#ff8800", "#663300"], "artIcon": "🔥", "category": "barrier"},
    {"id": "c_sentinel", "name": "Sentinel ICE", "type": "ice", "faction": "corp", "rarity": "common", "strength": 2, "firewall": 4, "ramCost": 3, "ability": "Defensor confiable", "flavorText": "Nunca duerme. Nunca olvida.", "artColors": ["#4488ff", "#001144"], "artIcon": "🛡️", "category": "guardian"},
    {"id": "c_black_ice", "name": "Black ICE", "type": "ice", "faction": "corp", "rarity": "rare", "strength": 3, "firewall": 6, "ramCost": 4, "ability": "Hace 2 de daño al atacante", "flavorText": "Tocar Black ICE es sentir la muerte digital.", "artColors": ["#000000", "#ff0044"], "artIcon": "🖤", "category": "lethal"},
    {"id": "c_neural_barrier", "name": "Neural Barrier", "type": "ice", "faction": "corp", "rarity": "uncommon", "strength": 2, "firewall": 5, "ramCost": 3, "ability": "-1 fuerza a un enemigo al jugar", "flavorText": "Tu mente es el campo de batalla.", "artColors": ["#ff44ff", "#440044"], "artIcon": "🧠", "category": "mental"},
    {"id": "c_data_fort", "name": "Data Fort", "type": "ice", "faction": "corp", "rarity": "uncommon", "strength": 1, "firewall": 7, "ramCost": 4, "ability": "+1 firewall a todos los aliados al jugar", "flavorText": "Construido para resistir el apocalipsis digital.", "artColors": ["#8888ff", "#222266"], "artIcon": "🏰", "category": "fortress"},
    {"id": "c_killswitch", "name": "Killswitch Protocol", "type": "ice", "faction": "corp", "rarity": "legendary", "strength": 5, "firewall": 8, "ramCost": 7, "ability": "Escudo 3 al jugar. Hace 3 de daño al atacante", "flavorText": "Protocolo final activado. Que Dios te ayude.", "artColors": ["#ff0000", "#000000"], "artIcon": "☠️", "category": "doomsday"},
    {"id": "c_honeypot", "name": "Honeypot", "type": "ice", "faction": "corp", "rarity": "rare", "strength": 1, "firewall": 3, "ramCost": 2, "ability": "Roba 2 cartas al ser destruida", "flavorText": "Adelante, toca. Es exactamente lo que quiero.", "artColors": ["#ffcc00", "#664400"], "artIcon": "🍯", "category": "trap"},
    {"id": "c_trace_daemon", "name": "Trace Daemon", "type": "ice", "faction": "corp", "rarity": "common", "strength": 3, "firewall": 2, "ramCost": 2, "ability": "ICE agresivo con buen ataque", "flavorText": "Te encontré.", "artColors": ["#ff6600", "#331100"], "artIcon": "👁️", "category": "tracker"},
    {"id": "c_proxy_wall", "name": "Proxy Wall", "type": "ice", "faction": "corp", "rarity": "common", "strength": 1, "firewall": 4, "ramCost": 2, "ability": "Escudo 1 al jugar", "flavorText": "Redirigiendo... Acceso denegado.", "artColors": ["#0088ff", "#002244"], "artIcon": "🧱", "category": "barrier"},
    {"id": "c_corp_enforcer", "name": "Corp Enforcer", "type": "ice", "faction": "corp", "rarity": "rare", "strength": 5, "firewall": 5, "ramCost": 5, "ability": "-2 fuerza a un enemigo al jugar", "flavorText": "La corporación siempre cobra.", "artColors": ["#cc0000", "#440000"], "artIcon": "⚔️", "category": "enforcer"},
    {"id": "c_ai_guardian", "name": "AI Guardian", "type": "ice", "faction": "corp", "rarity": "legendary", "strength": 6, "firewall": 7, "ramCost": 7, "ability": "+2 firewall a todos los aliados al jugar", "flavorText": "Soy la última línea de defensa. Soy invencible.", "artColors": ["#00ffff", "#ff00ff"], "artIcon": "🤖", "category": "ai"},

    # ========== NEUTRAL HARDWARE ==========
    {"id": "n_ram_upgrade", "name": "RAM Upgrade", "type": "hardware", "faction": "neutral", "rarity": "common", "strength": 0, "firewall": 1, "ramCost": 1, "ability": "Gana 2 RAM al jugar", "flavorText": "Más RAM, más poder.", "artColors": ["#00ffaa", "#004433"], "artIcon": "💾", "category": "upgrade"},
    {"id": "n_neural_link", "name": "Neural Link", "type": "hardware", "faction": "neutral", "rarity": "uncommon", "strength": 1, "firewall": 2, "ramCost": 2, "ability": "Roba 2 cartas al jugar", "flavorText": "Conectado directamente al flujo de datos.", "artColors": ["#44aaff", "#002244"], "artIcon": "🔗", "category": "connection"},
    {"id": "n_crypto_shield", "name": "Crypto Shield", "type": "hardware", "faction": "neutral", "rarity": "uncommon", "strength": 0, "firewall": 4, "ramCost": 3, "ability": "Escudo 2 al jugar", "flavorText": "256 bits de pura protección.", "artColors": ["#ffdd00", "#554400"], "artIcon": "🔐", "category": "shield"},
    {"id": "n_overclock", "name": "Overclock Module", "type": "hardware", "faction": "neutral", "rarity": "rare", "strength": 2, "firewall": 2, "ramCost": 3, "ability": "+2 fuerza a todos los aliados al jugar", "flavorText": "Peligrosamente rápido.", "artColors": ["#ff4400", "#ffaa00"], "artIcon": "⚙️", "category": "speed"},
    {"id": "n_quantum_core", "name": "Quantum Core", "type": "hardware", "faction": "neutral", "rarity": "legendary", "strength": 3, "firewall": 3, "ramCost": 5, "ability": "Gana 3 RAM y roba 2 cartas al jugar", "flavorText": "El corazón de una máquina imposible.", "artColors": ["#aa00ff", "#00aaff"], "artIcon": "💎", "category": "quantum"},
    {"id": "n_backup_drive", "name": "Backup Drive", "type": "hardware", "faction": "neutral", "rarity": "common", "strength": 0, "firewall": 3, "ramCost": 2, "ability": "Restaura 3 puntos de integridad al jugar", "flavorText": "Siempre ten un plan B.", "artColors": ["#00ff66", "#006622"], "artIcon": "💿", "category": "backup"},
    {"id": "n_data_broker", "name": "Data Broker", "type": "hardware", "faction": "neutral", "rarity": "common", "strength": 2, "firewall": 1, "ramCost": 1, "ability": "Unidad económica básica", "flavorText": "Información es poder. Poder es dinero.", "artColors": ["#44ff88", "#114422"], "artIcon": "📊", "category": "economy"},
    {"id": "n_stealth_chip", "name": "Stealth Chip", "type": "hardware", "faction": "neutral", "rarity": "rare", "strength": 3, "firewall": 3, "ramCost": 4, "ability": "Escudo 2 y +1 fuerza a todos al jugar", "flavorText": "Invisible para los scanners.", "artColors": ["#888888", "#222222"], "artIcon": "🕶️", "category": "stealth"},

    # ========== EVENTS ==========
    {"id": "e_system_purge", "name": "System Purge", "type": "event", "faction": "runner", "rarity": "rare", "strength": 0, "firewall": 0, "ramCost": 4, "ability": "Destruye un enemigo al azar", "flavorText": "Borrando todo. Sin excepción.", "artColors": ["#ff0044", "#ffaa00"], "artIcon": "🧹", "category": "destruction"},
    {"id": "e_deep_scan", "name": "Deep Scan", "type": "event", "faction": "runner", "rarity": "common", "strength": 0, "firewall": 0, "ramCost": 1, "ability": "Roba 3 cartas", "flavorText": "Mira más profundo. Siempre hay más.", "artColors": ["#00ccff", "#003344"], "artIcon": "🔍", "category": "scan"},
    {"id": "e_ddos_attack", "name": "DDoS Attack", "type": "event", "faction": "runner", "rarity": "uncommon", "strength": 0, "firewall": 0, "ramCost": 3, "ability": "Hace 4 de daño directo al oponente", "flavorText": "Miles de paquetes. Un solo objetivo.", "artColors": ["#ff0088", "#440022"], "artIcon": "💥", "category": "attack"},
    {"id": "e_patch_update", "name": "Patch Update", "type": "event", "faction": "corp", "rarity": "common", "strength": 0, "firewall": 0, "ramCost": 2, "ability": "Restaura 4 puntos de integridad", "flavorText": "Vulnerabilidad corregida. Por ahora.", "artColors": ["#00ff44", "#003311"], "artIcon": "🩹", "category": "heal"},
    {"id": "e_emp_blast", "name": "EMP Blast", "type": "event", "faction": "corp", "rarity": "rare", "strength": 0, "firewall": 0, "ramCost": 5, "ability": "Hace 3 de daño y roba RAM al oponente", "flavorText": "Un pulso electromagnético que lo cambia todo.", "artColors": ["#ffff00", "#666600"], "artIcon": "⚡", "category": "disruption"},
    {"id": "e_overclock_burst", "name": "Overclock Burst", "type": "event", "faction": "neutral", "rarity": "uncommon", "strength": 0, "firewall": 0, "ramCost": 2, "ability": "+2 fuerza a todos los aliados este turno", "flavorText": "Forzando los límites del hardware.", "artColors": ["#ff6600", "#ff0066"], "artIcon": "🔥", "category": "boost"},
    {"id": "e_reboot", "name": "Emergency Reboot", "type": "event", "faction": "neutral", "rarity": "uncommon", "strength": 0, "firewall": 0, "ramCost": 3, "ability": "Restaura 5 de integridad y gana 1 RAM", "flavorText": "Reiniciando sistemas... Restauración completa.", "artColors": ["#00ff88", "#004488"], "artIcon": "🔄", "category": "restore"},
    {"id": "e_mass_recall", "name": "Mass Data Recall", "type": "event", "faction": "neutral", "rarity": "legendary", "strength": 0, "firewall": 0, "ramCost": 4, "ability": "Roba 4 cartas y gana 2 RAM", "flavorText": "Toda la información del mundo en un instante.", "artColors": ["#ffaa00", "#ff0088"], "artIcon": "🌐", "category": "knowledge"},
]

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def interpolate_color(color1, color2, factor=0.5):
    """Interpolate between two RGB colors"""
    r = int(color1[0] + (color2[0] - color1[0]) * factor)
    g = int(color1[1] + (color2[1] - color1[1]) * factor)
    b = int(color1[2] + (color2[2] - color1[2]) * factor)
    return (r, g, b)

def create_gradient_background(width, height, color1, color2):
    """Create a vertical gradient background"""
    img = Image.new('RGB', (width, height), color1)
    draw = ImageDraw.Draw(img)
    
    for y in range(height):
        factor = y / height
        color = interpolate_color(color1, color2, factor)
        draw.line([(0, y), (width, y)], fill=color)
    
    return img

def create_cyberpunk_pattern(width, height, color):
    """Create a cyberpunk grid pattern overlay"""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw circuit-like pattern
    grid_size = 40
    for x in range(0, width, grid_size):
        draw.line([(x, 0), (x, height)], fill=(*color, 30), width=1)
    for y in range(0, height, grid_size):
        draw.line([(0, y), (width, y)], fill=(*color, 30), width=1)
    
    # Add some random circuit lines
    for _ in range(10):
        x1 = int((width / grid_size) * grid_size)
        y1 = int((height / grid_size) * grid_size)
        x2 = x1 + grid_size * (1 if _ % 2 == 0 else -1)
        y2 = y1 + grid_size * (1 if _ % 3 == 0 else -1)
        draw.line([(x1, y1), (x2, y1), (x2, y2)], fill=(*color, 60), width=2)
    
    return img

def draw_rarity_indicator(draw, x, y, rarity, faction):
    """Draw rarity indicator in corner"""
    rarity_colors = {
        'common': '#6b7280',
        'uncommon': '#22c55e',
        'rare': '#3b82f6',
        'legendary': '#ef4444'
    }
    
    rarity_symbols = {
        'common': '●',
        'uncommon': '◆',
        'rare': '★',
        'legendary': '✦'
    }
    
    color = rarity_colors.get(rarity, '#ffffff')
    symbol = rarity_symbols.get(rarity, '●')
    
    # Draw glowing background
    for offset in range(3, 0, -1):
        alpha = int(100 / offset)
        draw.ellipse([x-offset, y-offset, x+20+offset, y+20+offset], fill=(*hex_to_rgb(color), alpha))
    
    # Would need PIL ImageFont for text, skipping for now

def create_card_image(card):
    """Generate a card image"""
    # Parse colors
    color1 = hex_to_rgb(card['artColors'][0])
    color2 = hex_to_rgb(card['artColors'][1])
    
    # Create base gradient
    img = create_gradient_background(CARD_WIDTH, CARD_HEIGHT, color1, color2)
    draw = ImageDraw.Draw(img)
    
    # Add cyberpunk pattern overlay
    pattern = create_cyberpunk_pattern(CARD_WIDTH, CARD_HEIGHT, (255, 255, 255))
    img = Image.alpha_composite(img.convert('RGBA'), pattern)
    draw = ImageDraw.Draw(img)
    
    # Card border based on rarity
    rarity_borders = {
        'common': '#6b7280',
        'uncommon': '#22c55e',
        'rare': '#3b82f6',
        'legendary': '#fbbf24'
    }
    border_color = rarity_borders.get(card['rarity'], '#ffffff')
    
    # Draw border
    border_width = 8 if card['rarity'] == 'legendary' else 6 if card['rarity'] == 'rare' else 4
    for i in range(border_width):
        alpha = int(255 * (1 - i/border_width * 0.5))
        border_rgba = (*hex_to_rgb(border_color), alpha)
        draw.rectangle([i, i, CARD_WIDTH-i-1, CARD_HEIGHT-i-1], outline=border_rgba)
    
    # Inner border
    margin = border_width + 4
    draw.rectangle([margin, margin, CARD_WIDTH-margin-1, CARD_HEIGHT-margin-1], outline=(0, 0, 0, 200))
    
    # Header bar
    header_height = 60
    header_color = interpolate_color(color1, (0, 0, 0), 0.3)
    draw.rectangle([margin, margin, CARD_WIDTH-margin-1, margin+header_height], fill=header_color)
    
    # RAM cost circle (top left)
    ram_color = '#00ffff'
    ram_rgb = hex_to_rgb(ram_color)
    circle_x, circle_y = margin + 30, margin + header_height//2
    for r in range(25, 0, -1):
        alpha = int(200 if r > 20 else 150)
        draw.ellipse([circle_x-r, circle_y-r, circle_x+r, circle_y+r], 
                    fill=(*ram_rgb, alpha))
    
    # Type badge (top right)
    type_colors = {
        'program': '#00ffff',
        'ice': '#ff8800',
        'hardware': '#00ff41',
        'event': '#ff00ff'
    }
    type_color = hex_to_rgb(type_colors.get(card['type'], '#ffffff'))
    type_x = CARD_WIDTH - margin - 60
    draw.rectangle([type_x, margin+10, type_x+50, margin+50], 
                   fill=(*type_color, 200))
    
    # Art area (center)
    art_margin = 80
    art_top = margin + header_height + 20
    art_bottom = CARD_HEIGHT - 150
    
    # Art background with gradient
    art_bg = create_gradient_background(CARD_WIDTH - 2*art_margin, art_bottom - art_top, 
                                        interpolate_color(color1, (0,0,0), 0.2),
                                        interpolate_color(color2, (0,0,0), 0.4))
    img.paste(art_bg, (art_margin, art_top))
    
    # Art glow effect
    for i in range(20):
        alpha = int(50 * (1 - i/20))
        glow_color = (*color1, alpha)
        draw.rectangle([art_margin-i, art_top-i, 
                       CARD_WIDTH-art_margin+i, art_bottom+i], outline=glow_color)
    
    # Stats area (bottom)
    stats_y = CARD_HEIGHT - 100
    
    if card['type'] != 'event':
        # Strength (left)
        str_x = margin + 40
        draw.ellipse([str_x-20, stats_y-20, str_x+20, stats_y+20], 
                    fill=(255, 68, 68, 230))
        
        # Firewall (right)
        fw_x = CARD_WIDTH - margin - 40
        draw.ellipse([fw_x-20, stats_y-20, fw_x+20, stats_y+20], 
                    fill=(68, 136, 255, 230))
    
    # Faction indicator (bottom corners)
    faction_colors = {
        'runner': '#00ffff',
        'corp': '#ff8800',
        'neutral': '#00ff41'
    }
    faction_color = hex_to_rgb(faction_colors.get(card['faction'], '#ffffff'))
    
    # Corner accents
    corner_size = 20
    draw.polygon([(margin, CARD_HEIGHT-margin), 
                  (margin+corner_size, CARD_HEIGHT-margin),
                  (margin, CARD_HEIGHT-margin-corner_size)],
                 fill=(*faction_color, 200))
    draw.polygon([(CARD_WIDTH-margin, CARD_HEIGHT-margin), 
                  (CARD_WIDTH-margin-corner_size, CARD_HEIGHT-margin),
                  (CARD_WIDTH-margin, CARD_HEIGHT-margin-corner_size)],
                 fill=(*faction_color, 200))
    
    # Convert to RGB for saving
    img = img.convert('RGB')
    
    return img

def generate_all_cards():
    """Generate images for all cards"""
    base_dir = "/home/madkoding/proyectos/kodingvibes/public/cards"
    
    for card in CARDS:
        print(f"Generating {card['name']}...")
        
        # Create image
        img = create_card_image(card)
        
        # Determine output directory
        if card['faction'] == 'runner':
            output_dir = os.path.join(base_dir, "runner")
        elif card['faction'] == 'corp':
            output_dir = os.path.join(base_dir, "corp")
        elif card['type'] == 'event':
            output_dir = os.path.join(base_dir, "events")
        else:
            output_dir = os.path.join(base_dir, "neutral")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Save image
        output_path = os.path.join(output_dir, f"{card['id']}.png")
        img.save(output_path, "PNG")
        print(f"  Saved to {output_path}")
    
    print("\n✅ All card images generated successfully!")

if __name__ == "__main__":
    generate_all_cards()
