import random
from typing import Dict, Any, List, Tuple

def generate_layout(requirements: Dict[str, Any]) -> Dict[str, Any]:
    """
    Procedurally generates a detailed 2D layout and blueprint SVG for the building,
    handling multiple floors, rooms division, doors, windows, furniture, and pool.
    """
    style = requirements.get("style", "Modern")
    floors_count = requirements.get("floors", 1)
    plot_w = requirements.get("width", 40)
    plot_h = requirements.get("length", 60)
    pool = requirements.get("pool", False)
    garden = requirements.get("garden", False)
    balcony = requirements.get("balcony", False)
    car_porch = requirements.get("car_porch", False)
    lift = requirements.get("lift", False)
    staircase = requirements.get("staircase", "none")
    if floors_count > 1 and staircase == "none":
        staircase = "internal"
    
    # Scale physical feet to canvas pixels (1 foot = 10 pixels)
    # Plot size
    canvas_w = plot_w * 12
    canvas_h = plot_h * 12
    
    # Define building offset inside the plot (leaving yards)
    margin_x = 24
    margin_y = 24
    if garden or pool:
        margin_y = 48  # larger backyard for pool/garden
        
    house_w = max(180, canvas_w - (margin_x * 2))
    house_h = max(240, canvas_h - (margin_y * 2))
    
    floors_data = []
    
    for floor_idx in range(1, floors_count + 1):
        # We partition the floor dynamically. 
        # Ground floor gets Living Room, Kitchen, Dining, guest bath.
        # Upper floors get Bedrooms, master baths, family lounges.
        rooms_list = []
        walls_list = []
        apertures_list = []  # Doors and windows
        
        # Grid splits to partition the house box
        # X-split at 60%, Y-splits at 45% and 55%
        x_split = int(house_w * 0.55)
        y_split = int(house_h * 0.50)
        
        # Ground Floor partitions
        if floor_idx == 1:
            # Left side (Large Living/Lounge + Study or guest bedroom if needed)
            rooms_list.append({
                "id": "living_room",
                "name": "Living Room",
                "x": margin_x,
                "y": margin_y,
                "w": x_split,
                "h": house_h - 100,
                "type": "living",
                "furniture": [
                    {"name": "Sectional Sofa", "x": 30, "y": 40, "w": 80, "h": 60, "type": "sofa"},
                    {"name": "Entertainment Console", "x": 30, "y": 10, "w": 70, "h": 12, "type": "tv"},
                    {"name": "Coffee Table", "x": 45, "y": 55, "w": 40, "h": 25, "type": "table"}
                ]
            })
            
            # Left bottom: Foyer / Vestibule
            rooms_list.append({
                "id": "foyer",
                "name": "Entrance Foyer",
                "x": margin_x,
                "y": margin_y + house_h - 100,
                "w": x_split,
                "h": 100,
                "type": "foyer",
                "furniture": [
                    {"name": "Coat Rack", "x": 10, "y": 20, "w": 15, "h": 15, "type": "cabinet"},
                    {"name": "Console Table", "x": 40, "y": 10, "w": 40, "h": 15, "type": "table"}
                ]
            })
            
            # Internal Staircase / Lift placement on Ground Floor
            if staircase == "internal":
                stair_w, stair_h = 60, 40
                rooms_list.append({
                    "id": "staircase_ground",
                    "name": "Staircase (Internal)",
                    "x": margin_x + x_split - stair_w - 5,
                    "y": margin_y + house_h - 95,
                    "w": stair_w,
                    "h": stair_h,
                    "type": "staircase",
                    "furniture": []
                })
            elif staircase == "external":
                rooms_list.append({
                    "id": "staircase_external_ground",
                    "name": "Staircase (External)",
                    "x": margin_x - 20,
                    "y": margin_y + house_h - 90,
                    "w": 18,
                    "h": 80,
                    "type": "staircase",
                    "furniture": []
                })

            if lift:
                lift_w, lift_h = 25, 25
                rooms_list.append({
                    "id": "lift_shaft_ground",
                    "name": "Glass Lift",
                    "x": margin_x + x_split - 95 if staircase == "internal" else margin_x + 5,
                    "y": margin_y + house_h - 95,
                    "w": lift_w,
                    "h": lift_h,
                    "type": "lift",
                    "furniture": []
                })
                
            if car_porch:
                porch_w, porch_h = 120, 70
                rooms_list.append({
                    "id": "car_porch",
                    "name": "Covered Car Porch",
                    "x": margin_x + 20,
                    "y": margin_y + house_h,
                    "w": porch_w,
                    "h": porch_h,
                    "type": "porch",
                    "furniture": [
                        {"name": "SUV Parking", "x": 15, "y": 10, "w": 35, "h": 50, "type": "cabinet"},
                        {"name": "Sedan Parking", "x": 65, "y": 10, "w": 35, "h": 50, "type": "cabinet"}
                    ]
                })
            
            # Right side: split into Kitchen and Dining
            rooms_list.append({
                "id": "kitchen",
                "name": "Gourmet Kitchen",
                "x": margin_x + x_split,
                "y": margin_y,
                "w": house_w - x_split,
                "h": y_split,
                "type": "kitchen",
                "furniture": [
                    {"name": "L-Countertop", "x": 10, "y": 10, "w": 70, "h": 70, "type": "kitchen_counter"},
                    {"name": "Refrigerator", "x": 10, "y": 80, "w": 25, "h": 25, "type": "fridge"},
                    {"name": "Kitchen Island", "x": 45, "y": 45, "w": 30, "h": 40, "type": "table"}
                ]
            })
            
            # Right bottom: Dining / Bath
            dining_w = house_w - x_split
            dining_h = house_h - y_split
            bath_w = min(80, dining_w * 0.4)
            
            rooms_list.append({
                "id": "dining",
                "name": "Dining Room",
                "x": margin_x + x_split,
                "y": margin_y + y_split,
                "w": dining_w - bath_w,
                "h": dining_h,
                "type": "dining",
                "furniture": [
                    {"name": "Dining Table (6-Seater)", "x": 15, "y": 25, "w": 50, "h": 35, "type": "table"}
                ]
            })
            
            rooms_list.append({
                "id": "powder_room",
                "name": "Powder Room",
                "x": margin_x + x_split + (dining_w - bath_w),
                "y": margin_y + y_split,
                "w": bath_w,
                "h": dining_h,
                "type": "bathroom",
                "furniture": [
                    {"name": "Vanity Sink", "x": 5, "y": 10, "w": 20, "h": 15, "type": "sink"},
                    {"name": "Toilet", "x": 5, "y": 45, "w": 15, "h": 20, "type": "toilet"}
                ]
            })
            
        else:
            # Upper floors get bedrooms
            # Top-Left: Master Suite
            rooms_list.append({
                "id": f"master_bedroom_f{floor_idx}",
                "name": f"Master Suite (Floor {floor_idx})",
                "x": margin_x,
                "y": margin_y,
                "w": x_split,
                "h": int(house_h * 0.6),
                "type": "bedroom",
                "furniture": [
                    {"name": "King Bed", "x": 30, "y": 30, "w": 65, "h": 60, "type": "bed"},
                    {"name": "Nightstand L", "x": 10, "y": 30, "w": 15, "h": 15, "type": "table"},
                    {"name": "Nightstand R", "x": 100, "y": 30, "w": 15, "h": 15, "type": "table"},
                    {"name": "Wardrobe Cabinet", "x": 30, "y": 105, "w": 60, "h": 15, "type": "cabinet"}
                ]
            })
            
            # Bottom-Left: Master Bathroom
            rooms_list.append({
                "id": f"master_bath_f{floor_idx}",
                "name": "En-Suite Bath",
                "x": margin_x,
                "y": margin_y + int(house_h * 0.6),
                "w": x_split,
                "h": house_h - int(house_h * 0.6),
                "type": "bathroom",
                "furniture": [
                    {"name": "Double Vanity", "x": 10, "y": 15, "w": 50, "h": 18, "type": "sink"},
                    {"name": "Bathtub", "x": 75, "y": 15, "w": 30, "h": 50, "type": "bath"},
                    {"name": "Toilet", "x": 10, "y": 55, "w": 18, "h": 22, "type": "toilet"}
                ]
            })

            # Staircase / Lift placement on Upper Floors
            if staircase == "internal":
                stair_w, stair_h = 60, 40
                rooms_list.append({
                    "id": f"staircase_f{floor_idx}",
                    "name": "Staircase (Internal)",
                    "x": margin_x + x_split - stair_w - 5,
                    "y": margin_y + house_h - 95,
                    "w": stair_w,
                    "h": stair_h,
                    "type": "staircase",
                    "furniture": []
                })
            elif staircase == "external":
                rooms_list.append({
                    "id": f"staircase_external_f{floor_idx}",
                    "name": "Staircase (External)",
                    "x": margin_x - 20,
                    "y": margin_y + house_h - 90,
                    "w": 18,
                    "h": 80,
                    "type": "staircase",
                    "furniture": []
                })

            if lift:
                lift_w, lift_h = 25, 25
                rooms_list.append({
                    "id": f"lift_shaft_f{floor_idx}",
                    "name": "Glass Lift",
                    "x": margin_x + x_split - 95 if staircase == "internal" else margin_x + 5,
                    "y": margin_y + house_h - 95,
                    "w": lift_w,
                    "h": lift_h,
                    "type": "lift",
                    "furniture": []
                })

            if balcony:
                balcony_w, balcony_h = 18, 60
                rooms_list.append({
                    "id": f"balcony_master_f{floor_idx}",
                    "name": "Sunset Balcony",
                    "x": margin_x - balcony_w,
                    "y": margin_y + 30,
                    "w": balcony_w,
                    "h": balcony_h,
                    "type": "balcony",
                    "furniture": [
                        {"name": "Lounge Chair", "x": 3, "y": 15, "w": 12, "h": 12, "type": "table"}
                    ]
                })
            
            # Top-Right: Bedroom 2
            rooms_list.append({
                "id": f"bedroom_2_f{floor_idx}",
                "name": "Bedroom 2",
                "x": margin_x + x_split,
                "y": margin_y,
                "w": house_w - x_split,
                "h": y_split,
                "type": "bedroom",
                "furniture": [
                    {"name": "Queen Bed", "x": 20, "y": 25, "w": 50, "h": 55, "type": "bed"},
                    {"name": "Study Desk", "x": 80, "y": 15, "w": 15, "h": 35, "type": "table"},
                    {"name": "Wardrobe", "x": 20, "y": 5, "w": 40, "h": 12, "type": "cabinet"}
                ]
            })
            
            # Bottom-Right: Bedroom 3/Study & Common Bath
            br3_w = house_w - x_split
            br3_h = house_h - y_split
            c_bath_w = min(90, br3_w * 0.45)
            
            rooms_list.append({
                "id": f"bedroom_3_f{floor_idx}",
                "name": "Bedroom 3" if requirements.get("rooms", {}).get("bedrooms", 2) > 2 else "Lounge Study",
                "x": margin_x + x_split,
                "y": margin_y + y_split,
                "w": br3_w - c_bath_w,
                "h": br3_h,
                "type": "bedroom",
                "furniture": [
                    {"name": "Twin Bed", "x": 15, "y": 20, "w": 40, "h": 50, "type": "bed"},
                    {"name": "Bookshelf", "x": 15, "y": 5, "w": 30, "h": 12, "type": "cabinet"}
                ]
            })
            
            rooms_list.append({
                "id": f"common_bath_f{floor_idx}",
                "name": "Common Bath",
                "x": margin_x + x_split + (br3_w - c_bath_w),
                "y": margin_y + y_split,
                "w": c_bath_w,
                "h": br3_h,
                "type": "bathroom",
                "furniture": [
                    {"name": "Shower Stall", "x": 5, "y": 5, "w": 30, "h": 30, "type": "bath"},
                    {"name": "Sink", "x": 5, "y": 45, "w": 18, "h": 15, "type": "sink"},
                    {"name": "Toilet", "x": 5, "y": 70, "w": 15, "h": 18, "type": "toilet"}
                ]
            })
            
        # Compile interior walls based on splitting layout coordinates
        # Exterior Walls
        walls_list.append({"x1": margin_x, "y1": margin_y, "x2": margin_x + house_w, "y2": margin_y, "type": "exterior"})
        walls_list.append({"x1": margin_x + house_w, "y1": margin_y, "x2": margin_x + house_w, "y2": margin_y + house_h, "type": "exterior"})
        walls_list.append({"x1": margin_x + house_w, "y1": margin_y + house_h, "x2": margin_x, "y2": margin_y + house_h, "type": "exterior"})
        walls_list.append({"x1": margin_x, "y1": margin_y + house_h, "x2": margin_x, "y2": margin_y, "type": "exterior"})
        
        # Interior Walls
        # Vertical main split
        walls_list.append({"x1": margin_x + x_split, "y1": margin_y, "x2": margin_x + x_split, "y2": margin_y + house_h, "type": "interior"})
        
        if floor_idx == 1:
            # Horizontal right split
            walls_list.append({"x1": margin_x + x_split, "y1": margin_y + y_split, "x2": margin_x + house_w, "y2": margin_y + y_split, "type": "interior"})
            # Living / foyer split
            walls_list.append({"x1": margin_x, "y1": margin_y + house_h - 100, "x2": margin_x + x_split, "y2": margin_y + house_h - 100, "type": "interior"})
            # Powder bath split
            walls_list.append({"x1": margin_x + x_split + (dining_w - bath_w), "y1": margin_y + y_split, "x2": margin_x + x_split + (dining_w - bath_w), "y2": margin_y + house_h, "type": "interior"})
        else:
            # Master suite split
            walls_list.append({"x1": margin_x, "y1": margin_y + int(house_h * 0.6), "x2": margin_x + x_split, "y2": margin_y + int(house_h * 0.6), "type": "interior"})
            # Horizontal right split
            walls_list.append({"x1": margin_x + x_split, "y1": margin_y + y_split, "x2": margin_x + house_w, "y2": margin_y + y_split, "type": "interior"})
            # Common bath split
            walls_list.append({"x1": margin_x + x_split + (br3_w - c_bath_w), "y1": margin_y + y_split, "x2": margin_x + x_split + (br3_w - c_bath_w), "y2": margin_y + house_h, "type": "interior"})

        # Doors and windows placements (apertures)
        # Windows on exterior walls
        apertures_list.append({"type": "window", "x": margin_x + int(x_split * 0.5), "y": margin_y, "w": 40, "h": 8, "orientation": "horizontal"})
        apertures_list.append({"type": "window", "x": margin_x + x_split + 50, "y": margin_y, "w": 40, "h": 8, "orientation": "horizontal"})
        apertures_list.append({"type": "window", "x": margin_x, "y": margin_y + 100, "w": 8, "h": 45, "orientation": "vertical"})
        apertures_list.append({"type": "window", "x": margin_x + house_w, "y": margin_y + 80, "w": 8, "h": 40, "orientation": "vertical"})
        apertures_list.append({"type": "window", "x": margin_x + house_w, "y": margin_y + house_h - 120, "w": 8, "h": 40, "orientation": "vertical"})
        
        # Interior Doors
        apertures_list.append({"type": "door", "x": margin_x + x_split, "y": margin_y + 120, "w": 30, "h": 6, "orientation": "vertical"})
        if floor_idx == 1:
            apertures_list.append({"type": "door", "x": margin_x + x_split + 20, "y": margin_y + y_split, "w": 30, "h": 6, "orientation": "horizontal"})
            # Main entrance door at Foyer
            apertures_list.append({"type": "door", "x": margin_x + 60, "y": margin_y + house_h, "w": 35, "h": 8, "orientation": "horizontal", "is_entrance": True})
            # Bath door
            apertures_list.append({"type": "door", "x": margin_x + x_split + (dining_w - bath_w), "y": margin_y + y_split + 30, "w": 25, "h": 6, "orientation": "vertical"})
        else:
            # En suite bath door
            apertures_list.append({"type": "door", "x": margin_x + 40, "y": margin_y + int(house_h * 0.6), "w": 28, "h": 6, "orientation": "horizontal"})
            # Bedroom 3 door
            apertures_list.append({"type": "door", "x": margin_x + x_split + 15, "y": margin_y + y_split, "w": 28, "h": 6, "orientation": "horizontal"})
            # Common bath door
            apertures_list.append({"type": "door", "x": margin_x + x_split + (br3_w - c_bath_w), "y": margin_y + y_split + 30, "w": 25, "h": 6, "orientation": "vertical"})

        floors_data.append({
            "floor": floor_idx,
            "rooms": rooms_list,
            "walls": walls_list,
            "apertures": apertures_list
        })
        
    # Generate SVG code for the design
    svg_string = generate_svg_blueprint(canvas_w, canvas_h, floors_data, requirements)
    
    return {
        "width": canvas_w,
        "height": canvas_h,
        "floors": floors_data,
        "svg": svg_string,
        "style": style,
        "pool": pool,
        "garden": garden
    }

def generate_svg_blueprint(width: int, height: int, floors_data: List[Dict[str, Any]], requirements: Dict[str, Any]) -> str:
    """
    Renders high-quality 2D floor plans into highly styled vector SVG files
    optimized for client preview showing walls, door arcs, furniture boxes, labels, and plot markings.
    """
    style = requirements.get("style", "Modern")
    pool = requirements.get("pool", False)
    garden = requirements.get("garden", False)
    
    # Define aesthetic colors based on style
    if style == "Futuristic":
        bg_color = "#030712"
        grid_color = "rgba(16, 185, 129, 0.08)"
        wall_stroke = "#06b6d4"
        wall_fill = "rgba(6, 182, 212, 0.15)"
        text_color = "#22d3ee"
        accent_color = "#10b981"
        furn_color = "rgba(34, 211, 238, 0.08)"
        furn_stroke = "rgba(34, 211, 238, 0.4)"
    elif style == "Brutalist":
        bg_color = "#1c1917"
        grid_color = "rgba(231, 229, 228, 0.05)"
        wall_stroke = "#a8a29e"
        wall_fill = "rgba(120, 113, 108, 0.4)"
        text_color = "#f5f5f4"
        accent_color = "#e7e5e4"
        furn_color = "rgba(120, 113, 108, 0.2)"
        furn_stroke = "#78716c"
    elif style == "Japanese Zen":
        bg_color = "#faf8f5"
        grid_color = "rgba(120, 53, 4, 0.05)"
        wall_stroke = "#78350f"
        wall_fill = "#fef3c7"
        text_color = "#451a03"
        accent_color = "#b45309"
        furn_color = "rgba(251, 191, 36, 0.1)"
        furn_stroke = "#d97706"
    elif style == "Classical":
        bg_color = "#f8fafc"
        grid_color = "rgba(148, 163, 184, 0.08)"
        wall_stroke = "#1e293b"
        wall_fill = "#f1f5f9"
        text_color = "#0f172a"
        accent_color = "#b45309"  # gold tone
        furn_color = "rgba(148, 163, 184, 0.1)"
        furn_stroke = "#64748b"
    elif style == "Indian Traditional":
        bg_color = "#1e1510"  # terracotta brown
        grid_color = "rgba(120, 53, 4, 0.08)"
        wall_stroke = "#78350f"  # warm terracotta
        wall_fill = "rgba(220, 38, 38, 0.15)"  # terracotta red
        text_color = "#fef3c7"  # golden cream/brass
        accent_color = "#d97706"  # golden brass
        furn_color = "rgba(217, 119, 6, 0.1)"
        furn_stroke = "#b45309"
    else:  # Modern
        bg_color = "#0f172a"
        grid_color = "rgba(99, 102, 241, 0.08)"
        wall_stroke = "#6366f1"
        wall_fill = "rgba(99, 102, 241, 0.15)"
        text_color = "#e2e8f0"
        accent_color = "#f43f5e"
        furn_color = "rgba(165, 180, 252, 0.08)"
        furn_stroke = "rgba(165, 180, 252, 0.4)"

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%" style="background-color: {bg_color}; font-family: system-ui, sans-serif;">')
    
    # 1. Grid Background
    svg.append('<g id="grid">')
    for x in range(0, width, 15):
        svg.append(f'  <line x1="{x}" y1="0" x2="{x}" y2="{height}" stroke="{grid_color}" stroke-width="0.5" />')
    for y in range(0, height, 15):
        svg.append(f'  <line x1="0" y1="{y}" x2="{width}" y2="{y}" stroke="{grid_color}" stroke-width="0.5" />')
    svg.append('</g>')
    
    # 2. Outdoor elements (Pool/Garden)
    if requirements.get("pool", False):
        pool_x, pool_y = int(width * 0.2), int(height - 40)
        if style == "Indian Traditional":
            # Stepped Baori pond rendering with concentric step rectangles in gold/ochre sandstone style
            svg.append(f'  <rect x="{pool_x}" y="{height - 35}" width="{int(width * 0.6)}" height="25" rx="8" fill="rgba(120, 53, 4, 0.25)" stroke="#b45309" stroke-width="1.5" />')
            svg.append(f'  <rect x="{pool_x + 10}" y="{height - 31}" width="{int(width * 0.6) - 20}" height="17" rx="6" fill="rgba(217, 119, 6, 0.3)" stroke="#d97706" stroke-width="1" />')
            svg.append(f'  <rect x="{pool_x + 20}" y="{height - 27}" width="{int(width * 0.6) - 40}" height="9" rx="4" fill="rgba(14, 165, 233, 0.4)" stroke="#0ea5e9" stroke-width="0.8" />')
            svg.append(f'  <text x="{width // 2}" y="{height - 18}" fill="#fef3c7" font-size="8" text-anchor="middle" letter-spacing="1" font-weight="bold">TRADITIONAL BAORI STEPPED POND</text>')
        else:
            svg.append(f'  <rect x="{pool_x}" y="{height - 35}" width="{int(width * 0.6)}" height="25" rx="8" fill="rgba(14, 165, 233, 0.2)" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="4,2" />')
            svg.append(f'  <text x="{width // 2}" y="{height - 18}" fill="#38bdf8" font-size="8" text-anchor="middle" letter-spacing="1">CINEMATIC SWIMMING POOL</text>')
    elif requirements.get("garden", False):
        if style == "Indian Traditional":
            svg.append(f'  <rect x="24" y="{height - 35}" width="{width - 48}" height="25" rx="5" fill="rgba(217, 119, 6, 0.15)" stroke="#d97706" stroke-width="1" stroke-dasharray="3,3" />')
            svg.append(f'  <text x="{width // 2}" y="{height - 18}" fill="#fef3c7" font-size="8" text-anchor="middle" letter-spacing="1" font-weight="bold">TRADITIONAL TULSI COURTYARD</text>')
        else:
            svg.append(f'  <rect x="24" y="{height - 35}" width="{width - 48}" height="25" rx="5" fill="rgba(34, 197, 94, 0.15)" stroke="#22c55e" stroke-width="1" stroke-dasharray="3,3" />')
            svg.append(f'  <text x="{width // 2}" y="{height - 18}" fill="#4ade80" font-size="8" text-anchor="middle" letter-spacing="1">ZEN LANDSCAPED GARDEN</text>')

    # 3. Process Floor 1 (Ground Floor) by default in primary graphic representation
    # If multiple floors exist, we draw them cleanly with visual separation or offset tab headers.
    floor_data = floors_data[0] # primary view is ground floor, client can toggle
    
    # Draw Rooms (fills & text labels)
    for r in floor_data["rooms"]:
        # Room background
        if r["type"] == "porch":
            svg.append(f'  <rect x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{r["h"]}" fill="rgba(148, 163, 184, 0.05)" stroke="{accent_color}" stroke-width="1.2" stroke-dasharray="4,4" />')
        elif r["type"] == "balcony":
            svg.append(f'  <rect x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{r["h"]}" fill="rgba(244, 63, 94, 0.05)" stroke="{accent_color}" stroke-width="1" />')
        elif r["type"] == "staircase":
            svg.append(f'  <rect x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{r["h"]}" fill="rgba(100, 116, 139, 0.1)" stroke="{wall_stroke}" stroke-width="1" />')
            tread_step = 8
            if r["w"] > r["h"]:
                for sx in range(int(r["x"]), int(r["x"] + r["w"]), tread_step):
                    svg.append(f'  <line x1="{sx}" y1="{r["y"]}" x2="{sx}" y2="{r["y"] + r["h"]}" stroke="{wall_stroke}" stroke-width="0.5" opacity="0.6" />')
            else:
                for sy in range(int(r["y"]), int(r["y"] + r["h"]), tread_step):
                    svg.append(f'  <line x1="{r["x"]}" y1="{sy}" x2="{r["x"] + r["w"]}" y2="{sy}" stroke="{wall_stroke}" stroke-width="0.5" opacity="0.6" />')
        elif r["type"] == "lift":
            svg.append(f'  <rect x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{r["h"]}" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" stroke-width="1.2" />')
            svg.append(f'  <line x1="{r["x"]}" y1="{r["y"]}" x2="{r["x"] + r["w"]}" y2="{r["y"] + r["h"]}" stroke="#06b6d4" stroke-width="0.5" opacity="0.4" />')
            svg.append(f'  <line x1="{r["x"] + r["w"]}" y1="{r["y"]}" x2="{r["x"]}" y2="{r["y"] + r["h"]}" stroke="#06b6d4" stroke-width="0.5" opacity="0.4" />')
        else:
            svg.append(f'  <rect x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{r["h"]}" fill="rgba(0,0,0,0.15)" stroke="none" />')
        
        # Room Furniture
        for f in r.get("furniture", []):
            fx = r["x"] + f["x"]
            fy = r["y"] + f["y"]
            svg.append(f'  <rect x="{fx}" y="{fy}" width="{f["w"]}" height="{f["h"]}" fill="{furn_color}" stroke="{furn_stroke}" stroke-width="0.8" rx="2" />')
            svg.append(f'  <text x="{fx + f["w"] // 2}" y="{fy + f["h"] // 2 + 3}" fill="{furn_stroke}" font-size="5" text-anchor="middle">{f["name"]}</text>')
            
        # Room Title & Dimension Estimates
        sq_ft = int((r["w"] / 10) * (r["h"] / 10))
        label_x = r["x"] + (r["w"] // 2)
        label_y = r["y"] + (r["h"] // 2)
        svg.append(f'  <text x="{label_x}" y="{label_y - 4}" fill="{text_color}" font-size="9" font-weight="bold" text-anchor="middle">{r["name"]}</text>')
        svg.append(f'  <text x="{label_x}" y="{label_y + 6}" fill="{accent_color}" font-size="7" font-weight="600" text-anchor="middle">{sq_ft} SQ FT</text>')

    # Draw Walls
    for w in floor_data["walls"]:
        t = 5 if w["type"] == "exterior" else 3.5
        svg.append(f'  <line x1="{w["x1"]}" y1="{w["y1"]}" x2="{w["x2"]}" y2="{w["y2"]}" stroke="{wall_stroke}" stroke-width="{t}" stroke-linecap="square" />')
        svg.append(f'  <line x1="{w["x1"]}" y1="{w["y1"]}" x2="{w["x2"]}" y2="{w["y2"]}" stroke="{wall_fill}" stroke-width="{t - 2}" stroke-linecap="square" />')

    # Draw Doors & Windows (cutting through walls)
    for a in floor_data["apertures"]:
        ax, ay, aw, ah = a["x"], a["y"], a["w"], a["h"]
        if a["type"] == "door":
            # Clear the wall background beneath the door
            if a["orientation"] == "horizontal":
                svg.append(f'  <rect x="{ax}" y="{ay - 4}" width="{aw}" height="8" fill="{bg_color}" stroke="none" />')
                # Draw open door leaf and swing path arc
                svg.append(f'  <line x1="{ax}" y1="{ay}" x2="{ax}" y2="{ay - aw}" stroke="{accent_color}" stroke-width="1.5" />')
                # Swing arc
                svg.append(f'  <path d="M {ax} {ay - aw} A {aw} {aw} 0 0 1 {ax + aw} {ay}" fill="none" stroke="{accent_color}" stroke-width="0.8" stroke-dasharray="2,2" />')
            else:  # vertical
                svg.append(f'  <rect x="{ax - 4}" y="{ay}" width="8" height="{aw}" fill="{bg_color}" stroke="none" />')
                # Draw open door leaf and swing path arc
                svg.append(f'  <line x1="{ax}" y1="{ay}" x2="{ax - aw}" y2="{ay}" stroke="{accent_color}" stroke-width="1.5" />')
                # Swing arc
                svg.append(f'  <path d="M {ax - aw} {ay} A {aw} {aw} 0 0 1 {ax} {ay + aw}" fill="none" stroke="{accent_color}" stroke-width="0.8" stroke-dasharray="2,2" />')
                
        elif a["type"] == "window":
            if a["orientation"] == "horizontal":
                # Clear wall
                svg.append(f'  <rect x="{ax}" y="{ay - 4}" width="{aw}" height="8" fill="{bg_color}" stroke="none" />')
                # Window double lines
                svg.append(f'  <rect x="{ax}" y="{ay - 2}" width="{aw}" height="4" fill="rgba(34, 211, 238, 0.15)" stroke="{text_color}" stroke-width="0.8" />')
                svg.append(f'  <line x1="{ax}" y1="{ay}" x2="{ax + aw}" y2="{ay}" stroke="{text_color}" stroke-width="0.5" />')
            else:  # vertical
                # Clear wall
                svg.append(f'  <rect x="{ax - 4}" y="{ay}" width="8" height="{ah}" fill="{bg_color}" stroke="none" />')
                # Window double lines
                svg.append(f'  <rect x="{ax - 2}" y="{ay}" width="4" height="{ah}" fill="rgba(34, 211, 238, 0.15)" stroke="{text_color}" stroke-width="0.8" />')
                svg.append(f'  <line x1="{ax}" y1="{ay}" x2="{ax}" y2="{ay + ah}" stroke="{text_color}" stroke-width="0.5" />')

    # HUD Elements / Title block
    hud_y = height - 20
    if pool or garden:
        hud_y = height - 42
        
    svg.append(f'  <line x1="24" y1="{hud_y}" x2="{width - 24}" y2="{hud_y}" stroke="{accent_color}" stroke-width="1" opacity="0.4" />')
    svg.append(f'  <text x="24" y="{hud_y + 12}" fill="{text_color}" font-size="7" font-weight="bold" opacity="0.8">NEOARCHITECT AI CORE — PLANNER V1.0</text>')
    svg.append(f'  <text x="{width - 24}" y="{hud_y + 12}" fill="{accent_color}" font-size="7" font-weight="bold" text-anchor="end" letter-spacing="1">STYLE: {style.upper()} ({floors_data.__len__()} FLOORS)</text>')
    
    svg.append('</svg>')
    return "".join(svg)
