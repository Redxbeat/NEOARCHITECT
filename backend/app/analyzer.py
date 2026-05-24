import re
import os
import json
from typing import Dict, Any
from dotenv import load_dotenv

# Load env variables
load_dotenv()

def parse_requirements_llm(prompt: str) -> Dict[str, Any]:
    """
    Calls NVIDIA NIM to parse client requirements using LLM with structured output instruction.
    """
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key or not api_key.strip():
        raise ValueError("NVIDIA_API_KEY is not set.")

    from openai import OpenAI
    model_name = os.getenv("NIM_MODEL", "meta/llama-3.1-70b-instruct")
    
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

    system_instruction = (
        "You are an expert architectural requirement analyzer for NeoArchitect.\n"
        "Your task is to parse a client's natural language requirements into a strict JSON payload.\n\n"
        "Here is the schema of the JSON you must return:\n"
        "{\n"
        '  "style": "Modern" | "Futuristic" | "Brutalist" | "Japanese Zen" | "Classical" | "Indian Traditional",\n'
        '  "rooms": {\n'
        '    "bedrooms": int (1-5, default 2),\n'
        '    "bathrooms": int (1-5, default 2),\n'
        '    "living_room": int (default 1),\n'
        '    "kitchen": int (default 1),\n'
        '    "study": int (0 or 1, default 0)\n'
        "  },\n"
        '  "floors": int (1-3, default 1),\n'
        '  "pool": bool,\n'
        '  "garden": bool,\n'
        '  "balcony": bool (default false, true if floors > 1 or explicitly requested),\n'
        '  "car_porch": bool (default false, true if car parking, porch, or garage requested),\n'
        '  "lift": bool (default false, true if lift/elevator requested),\n'
        '  "staircase": "none" | "internal" | "external" (default "none" for 1 floor, "internal" for floors > 1),\n'
        '  "width": int (30-80, default 40),\n'
        '  "length": int (45-100, default 60),\n'
        '  "budget_crores": float (default 1.0),\n'
        '  "materials": [string]\n'
        "}\n\n"
        "Aesthetic Style Classification Rules:\n"
        "- Use 'Futuristic' for sci-fi, bio-dome, cyber, high-tech, glowing, titanium, space-age, organic parametric.\n"
        "- Use 'Brutalist' for raw concrete, blocky, exposed steel/heavy timber, industrial.\n"
        "- Use 'Japanese Zen' for bamboo, cedarwood, shoji, minimalist, peaceful gravel/stone, landscaping.\n"
        "- Use 'Classical' for roman pillars, gothic arches, white stucco columns, traditional, vintage.\n"
        "- Use 'Indian Traditional' for haveli, temple, rajasthani, kerala, vastu, vaastu, sandstone, terracotta, carved wood, brass, stepped pond, courtyards.\n"
        "- Use 'Modern' for modern luxury, glass panes, polished steel, sleek layouts.\n\n"
        "Constraint Rules:\n"
        "1. The 'materials' list must contain 2-4 appropriate luxury building materials suited for the chosen style.\n"
        "2. Keep width in [30, 80] and length in [45, 100]. Default to 40x60.\n"
        "3. Keep bedrooms in [1, 5] and floors in [1, 3].\n"
        "4. Standard budget is 1.0 Crore (INR). If they ask for lakhs, convert to crores (e.g. 50 lakhs -> 0.5, 80 lakhs -> 0.8).\n\n"
        "Respond ONLY with a valid JSON block. Do NOT include markdown styling, do not include any backticks (like ```json), and do not include conversational explanation. Just the raw JSON string."
    )

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Parse this client requirement prompt:\n\"{prompt}\""}
        ],
        temperature=0.1,
        max_tokens=500
    )

    content = response.choices[0].message.content.strip()
    
    # Strip markdown wrappers if LLM returned them despite instruction
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\n", "", content)
        content = re.sub(r"\n```$", "", content)
    
    parsed_json = json.loads(content)
    
    # Validation / sanitization of keys
    required_keys = [
        "style", "rooms", "floors", "pool", "garden", 
        "balcony", "car_porch", "lift", "staircase",
        "width", "length", "budget_crores", "materials"
    ]
    for key in required_keys:
        if key not in parsed_json:
            # Add sensible defaults if keys are missing from LLM response
            if key == "balcony":
                parsed_json["balcony"] = parsed_json.get("floors", 1) > 1
            elif key == "car_porch":
                parsed_json["car_porch"] = False
            elif key == "lift":
                parsed_json["lift"] = False
            elif key == "staircase":
                parsed_json["staircase"] = "internal" if parsed_json.get("floors", 1) > 1 else "none"
            else:
                raise KeyError(f"Missing required key: {key}")
            
    # Ensure nested rooms structure is valid
    rooms_keys = ["bedrooms", "bathrooms", "living_room", "kitchen", "study"]
    if not isinstance(parsed_json["rooms"], dict):
        parsed_json["rooms"] = {}
    for r_key in rooms_keys:
        if r_key not in parsed_json["rooms"]:
            parsed_json["rooms"][r_key] = 1 if r_key in ["living_room", "kitchen"] else (2 if r_key in ["bedrooms", "bathrooms"] else 0)

    # Coerce types
    parsed_json["style"] = str(parsed_json["style"])
    if parsed_json["style"] not in ["Modern", "Futuristic", "Brutalist", "Japanese Zen", "Classical", "Indian Traditional"]:
        parsed_json["style"] = "Modern"
        
    parsed_json["floors"] = min(3, max(1, int(parsed_json["floors"])))
    parsed_json["pool"] = bool(parsed_json["pool"])
    parsed_json["garden"] = bool(parsed_json["garden"])
    parsed_json["balcony"] = bool(parsed_json.get("balcony", False))
    parsed_json["car_porch"] = bool(parsed_json.get("car_porch", False))
    parsed_json["lift"] = bool(parsed_json.get("lift", False))
    parsed_json["staircase"] = str(parsed_json.get("staircase", "none"))
    if parsed_json["staircase"] not in ["none", "internal", "external"]:
        parsed_json["staircase"] = "internal" if parsed_json["floors"] > 1 else "none"
        
    parsed_json["width"] = min(80, max(30, int(parsed_json["width"])))
    parsed_json["length"] = min(100, max(45, int(parsed_json["length"])))
    parsed_json["budget_crores"] = float(parsed_json["budget_crores"])
    
    return parsed_json

def parse_requirements_regex(prompt: str) -> Dict[str, Any]:
    """
    Standard regex-based local parser. Serves as a 100% reliable local fallback.
    """
    text = prompt.lower() if prompt else ""
    
    # 1. Styles detection
    style = "Modern"  # Default
    if "futuristic" in text or "cyber" in text or "sci-fi" in text:
        style = "Futuristic"
    elif "brutalist" in text or "concrete" in text or "raw" in text:
        style = "Brutalist"
    elif "japanese" in text or "zen" in text or "minimalist" in text or "shoji" in text:
        style = "Japanese Zen"
    elif "classical" in text or "vintage" in text or "traditional" in text or "gothic" in text or "roman" in text:
        style = "Classical"
    elif "indian" in text or "traditional" in text or "haveli" in text or "rajasthani" in text or "kerala" in text or "temple" in text or "vastu" in text or "vaastu" in text:
        style = "Indian Traditional"
    elif "modern" in text or "luxury" in text:
        style = "Modern"
        
    # 2. Rooms count detection
    bedrooms = 2  # Default
    bathrooms = 2  # Default
    living_rooms = 1  # Default
    kitchens = 1  # Default
    study = 0
    
    bed_match = re.search(r"(\d+)\s*(?:bedroom|bed|bhk|room)", text)
    if bed_match:
        bedrooms = int(bed_match.group(1))
    elif "one" in text or "1" in text:
        bedrooms = 1
    elif "three" in text or "3" in text:
        bedrooms = 3
    elif "four" in text or "4" in text:
        bedrooms = 4
    elif "five" in text or "5" in text:
        bedrooms = 5
        
    bath_match = re.search(r"(\d+)\s*(?:bath|bathroom|toilet|washroom)", text)
    if bath_match:
        bathrooms = int(bath_match.group(1))
    else:
        bathrooms = max(1, bedrooms - 1)
        
    if "study" in text or "office" in text or "workplace" in text:
        study = 1
        
    # 3. Floors detection
    floors = 1
    if "two floor" in text or "double floor" in text or "2 floor" in text or "2-floor" in text or "duplex" in text or "2 storeys" in text or "two storeys" in text:
        floors = 2
    elif "three floor" in text or "3 floor" in text or "3-floor" in text or "triplex" in text or "3 storeys" in text:
        floors = 3
    else:
        floor_match = re.search(r"(\d+)\s*(?:floor|storey|story|storeys|stories)", text)
        if floor_match:
            floors = int(floor_match.group(1))
            
    # 4. Features detection
    pool = False
    if "pool" in text or "swimming" in text or "jacuzzi" in text:
        pool = True
        
    garden = False
    if "garden" in text or "lawn" in text or "courtyard" in text or "backyard" in text:
        garden = True

    balcony = False
    if "balcony" in text or "balconies" in text or "deck" in text or floors > 1:
        balcony = True

    car_porch = False
    if "porch" in text or "parking" in text or "garage" in text or "carport" in text or "car port" in text:
        car_porch = True

    lift = False
    if "lift" in text or "elevator" in text or "escalator" in text:
        lift = True

    staircase = "none"
    if floors > 1:
        staircase = "internal"  # Default for multiple floors
    if "outside staircase" in text or "outside stair" in text or "external stair" in text or "outdoor stair" in text:
        staircase = "external"
    elif "inside staircase" in text or "inside stair" in text or "internal stair" in text or "indoor stair" in text:
        staircase = "internal"
    elif "no staircase" in text or "without stair" in text:
        staircase = "none"
        
    # 5. Dimension / Plot size
    width = 40
    length = 60
    dim_match = re.search(r"(\d+)\s*(?:x|by|\*)\s*(\d+)", text)
    if dim_match:
        width = int(dim_match.group(1))
        length = int(dim_match.group(2))
    elif "large" in text or "huge" in text or "luxury villa" in text:
        width, length = 60, 80
    elif "small" in text or "compact" in text or "tiny" in text:
        width, length = 30, 45
        
    # 6. Budget detection
    budget_crores = 1.0  # Default
    crore_match = re.search(r"([\d\.]+)\s*(?:crore|cr)", text)
    lakh_match = re.search(r"(\d+)\s*(?:lakh|lacs|l)", text)
    if crore_match:
        budget_crores = float(crore_match.group(1))
    elif lakh_match:
        budget_crores = float(lakh_match.group(1)) / 100.0
    elif "million" in text:
        mill_match = re.search(r"([\d\.]+)\s*million", text)
        if mill_match:
            budget_crores = float(mill_match.group(1)) * 0.08
            
    # 7. Material defaults based on style
    materials = ["Glass", "Steel"]
    if style == "Modern":
        materials = ["Concrete", "Glass", "Polished Steel", "Oak Wood"]
    elif style == "Futuristic":
        materials = ["Carbon Fiber", "Glowing Glass", "Titanium Panels", "Chrome"]
    elif style == "Brutalist":
        materials = ["Exposed Concrete", "Dark Steel", "Heavy Timber", "Glass"]
    elif style == "Japanese Zen":
        materials = ["Cedar Wood", "Bamboo Shingles", "Shoji Paper Panels", "River Stone"]
    elif style == "Classical":
        materials = ["Marble Columns", "White Stucco", "Red Clay Tile", "Gold Trim"]
    elif style == "Indian Traditional":
        materials = ["Jodhpur Sandstone", "Carved Teakwood", "White Makrana Marble", "Terracotta Tiles"]

    return {
        "style": style,
        "rooms": {
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "living_room": living_rooms,
            "kitchen": kitchens,
            "study": study
        },
        "floors": floors,
        "pool": pool,
        "garden": garden,
        "balcony": balcony,
        "car_porch": car_porch,
        "lift": lift,
        "staircase": staircase,
        "width": width,
        "length": length,
        "budget_crores": budget_crores,
        "materials": materials
    }

def parse_requirements(prompt: str, overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Intelligently parses client requirements from a natural language text prompt,
    merging and prioritizing any explicit overrides passed from UI form inputs.
    First tries to use NVIDIA NIM LLM, falling back to local regex heuristics if key is not set or upon failure.
    """
    result = None
    
    # Try calling NVIDIA NIM
    api_key = os.getenv("NVIDIA_API_KEY")
    if api_key and api_key.strip():
        try:
            print("[INFO] Attempting to parse requirements using NVIDIA NIM LLM...")
            result = parse_requirements_llm(prompt)
            print("[INFO] NVIDIA NIM requirements parsing completed successfully.")
        except Exception as e:
            print(f"[WARNING] NVIDIA NIM parsing failed, falling back to regex parser. Reason: {e}")
            
    # Fallback to local regex heuristics
    if not result:
        print("[INFO] Using local regex heuristic requirement parser.")
        result = parse_requirements_regex(prompt)
        
    # Merge explicit overrides from client dashboard forms
    if overrides:
        for k, v in overrides.items():
            if v is not None:
                if k == "rooms" and isinstance(v, dict):
                    result["rooms"].update(v)
                else:
                    result[k] = v
                    
    # Dynamic dimension adjustments to ensure ratio sanity
    if result["width"] > result["length"]:
        result["width"], result["length"] = result["length"], result["width"]
        
    return result
