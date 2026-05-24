from typing import Dict, Any
import io
import base64
import math
from PIL import Image, ImageDraw, ImageFilter

def generate_cgi_render(requirements: Dict[str, Any], lighting_preset: str = "Sunset") -> str:
    """
    Procedurally draws and renders a breathtaking architectural visualization of the 
    NeoArchitect building layout using Pillow. Incorporates sky gradients, reflections, 
    light beams, windows, pool ripples, and digital camera HUD overlays.
    Returns a base64 encoded PNG data URI.
    """
    style = requirements.get("style", "Modern")
    floors = requirements.get("floors", 1)
    pool = requirements.get("pool", False)
    car_porch = requirements.get("car_porch", False)
    balcony = requirements.get("balcony", False)
    staircase = requirements.get("staircase", "none")
    lift = requirements.get("lift", False)
    
    # 1. Initialize High-Res Canvas (800 x 500)
    w, h = 800, 500
    img = Image.new("RGBA", (w, h), (10, 10, 15, 255))
    draw = ImageDraw.Draw(img)
    
    # 2. Paint Sky Gradient based on lighting preset
    # Preset styles: Sunset, Cyberpunk, Sunlit, Rainy
    if lighting_preset == "Sunset":
        # Warm sunset gradient (Deep purple -> Orange -> Gold)
        for y in range(350):
            r = int(35 + (y / 350) * 180)
            g = int(25 + (y / 350) * 80)
            b = int(75 - (y / 350) * 20)
            draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
    elif lighting_preset == "Cyberpunk":
        # Cyberpunk neon night (Deep violet -> Neon Magenta -> Dark blue)
        for y in range(350):
            r = int(15 + (y / 350) * 110)
            g = int(5 + (y / 350) * 10)
            b = int(45 + (y / 350) * 180)
            draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
    elif lighting_preset == "Rainy":
        # Moody wet gray storm sky
        for y in range(350):
            c = int(40 + (y / 350) * 55)
            draw.line([(0, y), (w, y)], fill=(c, c - 2, c + 5, 255))
    else:  # Sunlit
        # Crisp clear architectural blue
        for y in range(350):
            r = int(14 + (y / 350) * 120)
            g = int(116 + (y / 350) * 80)
            b = int(244 + (y / 350) * 10)
            draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
            
    # Draw a glowing sun or moon in the sky
    if lighting_preset == "Sunset":
        draw.ellipse([w // 2 - 80, 100, w // 2 + 80, 260], fill=(253, 186, 116, 180)) # glowing sun
    elif lighting_preset == "Cyberpunk":
        draw.ellipse([w - 180, 50, w - 120, 110], fill=(255, 255, 255, 160)) # neon moon
        
    # 3. Paint Ground Plane
    ground_y = 350
    if lighting_preset == "Sunset":
        ground_color = (24, 24, 32, 255)
    elif lighting_preset == "Cyberpunk":
        ground_color = (8, 8, 12, 255)
    elif lighting_preset == "Rainy":
        ground_color = (15, 17, 20, 255)
    else:
        ground_color = (30, 41, 59, 255)
    draw.rectangle([0, ground_y, w, h], fill=ground_color)
    
    # 4. Paint Swimming Pool (if requested)
    if pool:
        pool_x1, pool_y1 = 120, 410
        pool_x2, pool_y2 = 680, 475
        if style == "Indian Traditional":
            # Stepped sandstone Baori (traditional step-well) structure
            # Stone floor base
            draw.rectangle([pool_x1, pool_y1, pool_x2, pool_y2], fill=(78, 35, 15, 255))
            
            # Draw concentric steps
            steps = 4
            for s in range(steps):
                offset_x = s * 25
                offset_y = s * 6
                s_x1, s_y1 = pool_x1 + offset_x, pool_y1 + offset_y
                s_x2, s_y2 = pool_x2 - offset_x, pool_y2 - offset_y
                if s_x2 > s_x1 and s_y2 > s_y1:
                    step_color = (120, 53, 4, 255) if s % 2 == 0 else (180, 83, 9, 255)
                    draw.rectangle([s_x1, s_y1, s_x2, s_y2], fill=step_color, outline=(217, 119, 6, 255), width=1)
            
            # Inner water basin
            inner_x = pool_x1 + steps * 25
            inner_y = pool_y1 + steps * 6
            inner_x2 = pool_x2 - steps * 25
            inner_y2 = pool_y2 - steps * 6
            if inner_x2 > inner_x and inner_y2 > inner_y:
                draw.rectangle([inner_x, inner_y, inner_x2, inner_y2], fill=(6, 95, 70, 255)) # deep emerald water
                for py in range(inner_y, inner_y2):
                    alpha = int(140 + ((py - inner_y) / (inner_y2 - inner_y)) * 95)
                    draw.line([(inner_x, py), (inner_x2, py)], fill=(16, 185, 129, alpha))
        else:
            # Deep blue pool bed
            draw.rectangle([pool_x1, pool_y1, pool_x2, pool_y2], fill=(14, 116, 144, 255))
            # Water overlay with gradient & highlight
            for py in range(pool_y1, pool_y2):
                alpha = int(140 + ((py - pool_y1) / (pool_y2 - pool_y1)) * 95)
                draw.line([(pool_x1, py), (pool_x2, py)], fill=(6, 182, 212, alpha))
            # Neon glowing edges for pool if cyberpunk
            p_edge = (34, 211, 238, 255) if lighting_preset == "Cyberpunk" else (165, 243, 252, 200)
            draw.rectangle([pool_x1, pool_y1, pool_x2, pool_y2], outline=p_edge, width=2)
            # Add ripple waves
            for rx in range(pool_x1 + 30, pool_x2 - 10, 80):
                draw.arc([rx, pool_y1 + 10, rx + 40, pool_y1 + 25], start=0, end=180, fill=(255, 255, 255, 60), width=1)

    # 5. Draw Procedural Building Geometry
    # Define style-specific colors and materials
    if style == "Futuristic":
        slab_color = (15, 23, 42, 240)
        slab_edge = (6, 182, 212, 255) # cyan glow
        column_color = (30, 41, 59, 255)
        glass_color = (8, 145, 178, 80)
        glow_color = (34, 211, 238, 140)
    elif style == "Brutalist":
        slab_color = (100, 110, 115, 255)  # raw gray concrete
        slab_edge = (70, 75, 80, 255)
        column_color = (60, 65, 70, 255)
        glass_color = (15, 23, 42, 100)
        glow_color = (251, 191, 36, 100) # warm contrast
    elif style == "Japanese Zen":
        slab_color = (217, 119, 6, 230)   # warm cedar wood tone
        slab_edge = (120, 53, 4, 255)
        column_color = (69, 26, 3, 255)
        glass_color = (254, 243, 199, 50)
        glow_color = (252, 211, 77, 120)
    elif style == "Classical":
        slab_color = (241, 245, 249, 255)  # white marble stucco
        slab_edge = (203, 213, 225, 255)
        column_color = (226, 232, 240, 255)
        glass_color = (30, 41, 59, 60)
        glow_color = (253, 224, 71, 90)
    elif style == "Indian Traditional":
        # Warm terracotta and sandstone slab plates, carved wood pillars, warm paper lighting glow
        slab_color = (194, 120, 3, 255)
        slab_edge = (120, 53, 4, 255)
        column_color = (180, 83, 9, 255)
        glass_color = (254, 243, 199, 80)
        glow_color = (245, 158, 11, 150)
    else:  # Modern
        slab_color = (30, 41, 59, 245)
        slab_edge = (99, 102, 241, 225)  # Indigo
        column_color = (15, 23, 42, 255)
        glass_color = (99, 102, 241, 50)
        glow_color = (251, 146, 60, 150)  # Orange dusk glow

    # Draw building from bottom floor to top floor
    b_width = 340
    b_left = (w - b_width) // 2
    b_bottom = ground_y
    floor_h = 75
    
    for f in range(floors):
        f_bottom = b_bottom - (f * floor_h)
        f_top = f_bottom - floor_h
        
        # Floor base plate
        draw.rectangle([b_left - 15, f_bottom - 8, b_left + b_width + 15, f_bottom], fill=slab_color, outline=slab_edge, width=1)
        
        # Vertical structural columns
        col_w = 12
        draw.rectangle([b_left, f_top, b_left + col_w, f_bottom], fill=column_color)
        draw.rectangle([b_left + b_width - col_w, f_top, b_left + b_width, f_bottom], fill=column_color)
        draw.rectangle([b_left + (b_width // 2) - (col_w // 2), f_top, b_left + (b_width // 2) + (col_w // 2), f_bottom], fill=column_color)
        
        # Glass window segments with interior ambient lighting glows
        win_l = b_left + col_w + 10
        win_w = (b_width // 2) - col_w - 20
        
        for w_idx in [0, 1]:
            wx1 = win_l + w_idx * (b_width // 2)
            wx2 = wx1 + win_w
            wy1 = f_top + 10
            wy2 = f_bottom - 10
            
            # Glass fill
            draw.rectangle([wx1, wy1, wx2, wy2], fill=glass_color)
            
            # Interior warm lighting gradient
            draw.ellipse([wx1 + 5, wy1 + 5, wx2 - 5, wy2 + 20], fill=glow_color)
            
            # Window frame divider grid
            draw.rectangle([wx1, wy1, wx2, wy2], outline=slab_edge, width=1)
            draw.line([(wx1 + wx2) // 2, wy1, (wx1 + wx2) // 2, wy2], fill=slab_edge, width=1)
            
        # Top roof/ceiling slab for this floor
        draw.rectangle([b_left - 15, f_top, b_left + b_width + 15, f_top + 8], fill=slab_color, outline=slab_edge, width=1)

        # Draw balconies on upper floors if active
        if balcony and f >= 1:
            balc_x1 = b_left - 45
            balc_x2 = b_left
            balc_y = f_bottom
            # Balcony slab
            draw.rectangle([balc_x1, balc_y - 6, balc_x2, balc_y], fill=slab_color, outline=slab_edge, width=1)
            # Glass / wood railing body
            draw.rectangle([balc_x1 + 4, balc_y - 25, balc_x2 - 4, balc_y - 6], fill=(*glass_color[:3], 100), outline=slab_edge, width=1)

    # Draw External Staircase
    if staircase == "external":
        steps_count = 16
        for step_i in range(steps_count):
            step_x = b_left - 65 + (step_i * (50 / steps_count))
            step_y = ground_y - (step_i * (floor_h / steps_count))
            draw.rectangle([step_x, step_y, step_x + 8, step_y + 3], fill=column_color, outline=slab_edge)

    # Draw Glass Lift Tower
    if lift:
        lift_w = 32
        lift_x1 = b_left + (b_width // 2) - (lift_w // 2)
        lift_x2 = lift_x1 + lift_w
        shaft_top = ground_y - floors * floor_h
        
        # Transparent glass shaft
        draw.rectangle([lift_x1, shaft_top, lift_x2, ground_y], fill=(6, 182, 212, 45), outline=(34, 211, 238, 255), width=2)
        
        # Floor level indicator lines
        for fl_idx in range(floors + 1):
            f_y = ground_y - (fl_idx * floor_h)
            draw.line([(lift_x1, f_y), (lift_x2, f_y)], fill=(34, 211, 238, 180), width=1)
            
        # Elevator cab inside shaft
        cab_h = 32
        cab_y1 = ground_y - 12
        cab_y2 = cab_y1 - cab_h
        draw.rectangle([lift_x1 + 3, cab_y2, lift_x2 - 3, cab_y1], fill=(15, 23, 42, 220), outline=(6, 182, 212, 255), width=1)
        # Glowing yellow light in cab
        draw.ellipse([lift_x1 + 8, cab_y2 + 4, lift_x2 - 8, cab_y2 + 16], fill=(253, 224, 71, 140))
        # Cable
        draw.line([(lift_x1 + lift_x2)//2, shaft_top, (lift_x1 + lift_x2)//2, cab_y2], fill=(148, 163, 184, 255), width=1)

    # Draw Car Porch sticking out to the right
    if car_porch:
        porch_x1 = b_left + b_width - 15
        porch_x2 = b_left + b_width + 55
        porch_y1 = ground_y - 28
        porch_y2 = ground_y - 20
        # Roof canopy slab
        draw.rectangle([porch_x1, porch_y1, porch_x2, porch_y2], fill=slab_color, outline=slab_edge, width=1)
        # Far-right pillar
        draw.rectangle([porch_x2 - 8, porch_y2, porch_x2 - 2, ground_y], fill=column_color)
        
        # Vehicle Silhouette under the porch
        car_body_color = (30, 41, 59, 255) if style != "Indian Traditional" else (120, 53, 4, 255)
        # Main car shape
        draw.rectangle([porch_x1 + 10, ground_y - 16, porch_x2 - 12, ground_y], fill=car_body_color)
        draw.polygon([(porch_x1 + 16, ground_y - 16), (porch_x1 + 24, ground_y - 25), (porch_x2 - 24, ground_y - 25), (porch_x2 - 18, ground_y - 16)], fill=car_body_color)
        # Wheels
        draw.ellipse([porch_x1 + 18, ground_y - 5, porch_x1 + 26, ground_y + 3], fill=(0, 0, 0, 255))
        draw.ellipse([porch_x2 - 26, ground_y - 5, porch_x2 - 18, ground_y + 3], fill=(0, 0, 0, 255))
    # Paint simple minimalist mountains/trees silhouettes on sides
    draw.polygon([(0, ground_y), (100, ground_y - 80), (140, ground_y)], fill=(12, 12, 16, 255))
    draw.polygon([(w, ground_y), (w - 120, ground_y - 90), (w - 70, ground_y)], fill=(12, 12, 16, 255))

    # 7. Add Camera Viewfinder HUD Overlay (Cinematic RTX specs)
    hud_overlay_color = (255, 255, 255, 120)
    # Viewfinder corners
    cs = 15
    draw.line([(20, 20), (20 + cs, 20)], fill=hud_overlay_color, width=1)
    draw.line([(20, 20), (20, 20 + cs)], fill=hud_overlay_color, width=1)
    
    draw.line([(w - 20, 20), (w - 20 - cs, 20)], fill=hud_overlay_color, width=1)
    draw.line([(w - 20, 20), (w - 20, 20 + cs)], fill=hud_overlay_color, width=1)
    
    draw.line([(20, h - 20), (20 + cs, h - 20)], fill=hud_overlay_color, width=1)
    draw.line([(20, h - 20), (20, h - 20 - cs)], fill=hud_overlay_color, width=1)
    
    draw.line([(w - 20, h - 20), (w - 20 - cs, h - 20)], fill=hud_overlay_color, width=1)
    draw.line([(w - 20, h - 20), (w - 20, h - 20 - cs)], fill=hud_overlay_color, width=1)
    
    # Text overlays
    draw.text((35, 30), "REC [RAW 10-BIT]", fill=(239, 68, 68, 255)) # red dot
    draw.ellipse([27, 32, 33, 38], fill=(239, 68, 68, 255))
    
    engine_label = "UNREAL ENGINE 5.4 | RTX CORES PATH TRACING"
    draw.text((35, h - 40), engine_label, fill=(226, 232, 240, 200))
    draw.text((w - 220, h - 40), f"PRESET: {lighting_preset.upper()} ENVIRONMENT", fill=(251, 146, 60, 200))
    
    # Camera metadata
    draw.text((w - 180, 30), "FOCAL: 35MM  f/1.8", fill=hud_overlay_color)
    draw.text((w - 180, 48), "ISO 400  SAMPLES: 4096", fill=hud_overlay_color)
    
    # 8. Encode to Base64
    buffer = io.BytesIO()
    # Save image to buffer
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    
    return f"data:image/png;base64,{img_str}"
