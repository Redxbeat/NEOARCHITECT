import os
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables on startup
load_dotenv()

# Import custom core modules
from app.analyzer import parse_requirements
from app.generator import generate_layout
from app.structure import calculate_costs_and_safety
from app.renderer import generate_cgi_render

app = FastAPI(title="NeoArchitect AI Server", version="1.0.0")

# Enable CORS for frontend development integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DesignRequest(BaseModel):
    prompt: Optional[str] = ""
    overrides: Optional[Dict[str, Any]] = None
    lighting_preset: Optional[str] = "Sunset"

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "NeoArchitect AI Synthesis Engine",
        "endpoints": {
            "/api/generate": "POST - Compile full building package from requirements",
            "/api/chat": "POST - Simulated AI Assistant modifications"
        }
    }

@app.post("/api/generate")
async def generate_building(request: DesignRequest):
    try:
        # 1. Parse client requirements from prompt & form overrides (LLM + Fallback)
        requirements = parse_requirements(request.prompt, request.overrides)
        
        # 2. Generate 2D Floor Plan SVG and grid layout coordinate matrices
        layout = generate_layout(requirements)
        
        # 3. Calculate structural calculations and costs estimation
        costs_and_safety = calculate_costs_and_safety(requirements, layout)
        
        # 4. Generate high-fidelity base64 CGI rendering image
        cgi_image = generate_cgi_render(requirements, request.lighting_preset)
        
        return {
            "requirements": requirements,
            "layout": {
                "width": layout["width"],
                "height": layout["height"],
                "floors": layout["floors"],
                "svg": layout["svg"],
                "pool": layout["pool"],
                "garden": layout["garden"]
            },
            "costs_and_safety": costs_and_safety,
            "cgi_render": cgi_image,
            "lighting_preset": request.lighting_preset
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in building synthesis: {e}\n{error_details}")
        raise HTTPException(status_code=500, detail=f"Building synthesis failed: {str(e)}")

class ChatMessage(BaseModel):
    message: str
    current_state: Dict[str, Any]

def chat_architect_llm(message: str, current_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Leverages NVIDIA NIM to process conversational queries and extract structural parameter updates.
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
        "You are an expert, premium AI Architectural Consultant named NeoArchitect.\n"
        "You help clients refine their architectural blueprints in real-time.\n\n"
        "Here is the CURRENT state of the building design you are working on:\n"
        f"{json.dumps(current_state.get('requirements', {}), indent=2)}\n\n"
        "Current structural/cost summary (built-up area, total cost, ratings):\n"
        f"Built-up area: {current_state.get('costs_and_safety', {}).get('built_up_area_sqft', 'N/A')} sqft\n"
        f"Estimated Cost: {current_state.get('costs_and_safety', {}).get('total_cost_crores', 'N/A')} Crores INR\n"
        f"Safety ratings: {json.dumps(current_state.get('costs_and_safety', {}).get('safety_metrics', {}), indent=2)}\n\n"
        "Your task is to analyze the client's chat message, draft a beautiful response, and specify any design parameter overrides that should be applied.\n"
        "You must return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        '  "reply": "A beautiful, premium, professional, and friendly response from NeoArchitect describing the changes or answering their questions.",\n'
        '  "suggested_overrides": {\n'
        '    "style": "Modern" | "Futuristic" | "Brutalist" | "Japanese Zen" | "Classical" | "Indian Traditional" (optional),\n'
        '    "floors": int (1-3) (optional),\n'
        '    "pool": bool (optional),\n'
        '    "garden": bool (optional),\n'
        '    "balcony": bool (optional),\n'
        '    "car_porch": bool (optional),\n'
        '    "lift": bool (optional),\n'
        '    "staircase": "none" | "internal" | "external" (optional),\n'
        '    "width": int (30-80) (optional),\n'
        '    "length": int (45-100) (optional),\n'
        '    "rooms": { "bedrooms": int (1-5) } (optional)\n'
        "  }\n"
        "}\n\n"
        "Guidelines:\n"
        "1. If the client asks to add/remove pool or garden, set 'pool' or 'garden' to true/false in 'suggested_overrides'. Note: pool and garden are typically mutually exclusive (if they add pool, set garden to false; if they add garden, set pool to false).\n"
        "2. If the client requests changes to floors, style, dimensions (width/length), or bedrooms, specify them in 'suggested_overrides'.\n"
        "3. If they just ask general architectural questions, return an empty 'suggested_overrides' dictionary.\n"
        "4. Keep the conversational response elegant, concise (2-4 sentences), and professional.\n\n"
        "Respond ONLY with a valid JSON block. No markdown wrappers, no backticks."
    )

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Client Request: \"{message}\""}
        ],
        temperature=0.4,
        max_tokens=600
    )

    content = response.choices[0].message.content.strip()
    
    # Strip markdown wrappers if returned
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\n", "", content)
        content = re.sub(r"\n```$", "", content)
        
    parsed_json = json.loads(content)
    
    # Basic validation
    if "reply" not in parsed_json:
        parsed_json["reply"] = "I have updated the design according to your request."
    if "suggested_overrides" not in parsed_json:
        parsed_json["suggested_overrides"] = {}
        
    return parsed_json

def chat_architect_fallback(message: str, current_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Standard rule-based local conversational responder. Serves as a 100% reliable local fallback.
    Supports parsing multiple concurrent parameter adjustments with typo resiliency.
    """
    msg = message.lower()
    state = current_state
    
    response_parts = []
    updates = {}
    
    # 1. Pool / Swimming
    if "pool" in msg or "swimming" in msg:
        if "remove" in msg or "no" in msg or "without" in msg:
            updates["pool"] = False
            response_parts.append("Certainly! I have removed the swimming pool from the blueprint. The outdoor layout has been updated to open lawn.")
        else:
            updates["pool"] = True
            updates["garden"] = False
            response_parts.append("Excellent choice. I have added a luxurious swimming pool with high-fidelity concrete perimeter lighting and rippled textures.")
            
    # 2. Garden / Lawn / Yard
    if "garden" in msg or "lawn" in msg or "yard" in msg:
        if "remove" in msg or "no" in msg or "without" in msg:
            updates["garden"] = False
            response_parts.append("Understood. I have cleared the Zen landscaped garden from your blueprint.")
        else:
            updates["garden"] = True
            updates["pool"] = False
            response_parts.append("Done! I've updated the outdoor landscaping to a peaceful, geometric Zen gravel and grass garden layout.")

    # 3. Balcony / Balconies (Typo-resilient for 'ballcony', 'ballconies')
    if "balcony" in msg or "balconies" in msg or "ballcony" in msg or "ballconies" in msg or "balconie" in msg:
        if "remove" in msg or "no" in msg or "without" in msg:
            updates["balcony"] = False
            response_parts.append("Understood. I have removed the panoramic balconies from the upper levels of your design.")
        else:
            updates["balcony"] = True
            response_parts.append("I've added spacious sunset balconies to the upper bedroom levels with glass handrail systems.")

    # 4. Porch / Parking / Garage / Carport
    if "porch" in msg or "parking" in msg or "garage" in msg or "carport" in msg or "car port" in msg:
        if "remove" in msg or "no" in msg or "without" in msg:
            updates["car_porch"] = False
            response_parts.append("Certainly. I have cleared the covered car porch portico from the front entrance area.")
        else:
            updates["car_porch"] = True
            response_parts.append("Excellent choice. I have drafted a sleek covered car porch portico right at your main entrance Foyer.")

    # 5. Lift / Elevator
    if "lift" in msg or "elevator" in msg:
        if "remove" in msg or "no" in msg or "without" in msg:
            updates["lift"] = False
            response_parts.append("Understood. I have removed the vacuum residential elevator lift tower from your structure.")
        else:
            updates["lift"] = True
            response_parts.append("Understood! I've added a premium glass vacuum elevator shaft traversing all floors alongside the stair column.")

    # 6. Staircase / Stair / Stairs (Typo-resilient for 'staricase', 'stari')
    if "staircase" in msg or "stair" in msg or "stairs" in msg or "staricase" in msg or "staricases" in msg or "stari" in msg:
        if "outside" in msg or "external" in msg or "outdoor" in msg or "out side" in msg or "staricase" in msg:
            # Check if user specified external or if 'outside' is near staricase
            updates["staircase"] = "external"
            response_parts.append("I have configured an external concrete staircase climbing along the outer facade panel.")
        elif "inside" in msg or "internal" in msg or "indoor" in msg or "in side" in msg:
            updates["staircase"] = "internal"
            response_parts.append("I've allocated a central internal staircase ascending directly from the entrance Foyer lobby.")
        elif "remove" in msg or "no" in msg or "without" in msg:
            updates["staircase"] = "none"
            response_parts.append("Understood. I have cleared the staircase layouts from the blueprints.")
        else:
            # Default to external if they asked "need or not" but let them know it's customizable
            updates["staircase"] = "internal"
            response_parts.append("I've ensured an internal staircase is allocated for convenient floor transitions.")

    # 7. Floors / Storey / Story
    if "floor" in msg or "storey" in msg or "story" in msg:
        if "three" in msg or "3" in msg:
            updates["floors"] = 3
            response_parts.append("Upgrading layout structure to 3 storeys. This increases our total built-up area and provides extra room layouts.")
        elif "two" in msg or "2" in msg or "double" in msg or "duplex" in msg:
            updates["floors"] = 2
            response_parts.append("Adjusted structure to 2 storeys (Duplex). The upper level is allocated for spacious en-suite suites.")
        elif "one" in msg or "1" in msg or "single" in msg:
            updates["floors"] = 1
            response_parts.append("Scaled down layout to a single storey. Perfect for space-optimized, single-level living comfort.")

    # 8. Gourmet Kitchen (Typo-resilient for 'kitechin', 'kitechen')
    if "kitchen" in msg or "kitchens" in msg or "kitechin" in msg or "kitechen" in msg or "cook" in msg:
        response_parts.append("I have optimized the gourmet kitchen layout on the ground floor with an L-shaped high-fidelity countertop, refrigerator space, and a premium kitchen island.")

    # 9. Bedrooms / Room
    if "bedroom" in msg or "room" in msg:
        if not ("staircase" in msg or "stairs" in msg or "living room" in msg or "kitchen" in msg or "kitechin" in msg or "staricase" in msg):
            num_match = re.search(r"(\d+)", msg)
            if num_match:
                rooms_override = state.get("requirements", {}).get("rooms", {})
                rooms_override["bedrooms"] = int(num_match.group(1))
                updates["rooms"] = rooms_override
                response_parts.append(f"Updating specifications. I've reallocated the upper floor partitions to accommodate exactly {num_match.group(1)} bedroom units.")

    # 10. Style
    if "modern" in msg:
        updates["style"] = "Modern"
        response_parts.append("Architectural style set to Modern. I'll use smooth glass panelings, sleek steel outlines, and ambient twilight glows.")
    elif "futuristic" in msg or "sci-fi" in msg:
        updates["style"] = "Futuristic"
        response_parts.append("Style updated to Futuristic Neo-Tokyo. Spawning glowing neon edges, titanium framing, and cyan glass shaders.")
    elif "brutalist" in msg or "concrete" in msg:
        updates["style"] = "Brutalist"
        response_parts.append("Style set to Brutalist. We'll use raw, exposed heavy-timber cast-concrete aesthetics and moody, stone textures.")
    elif "japanese" in msg or "zen" in msg:
        updates["style"] = "Japanese Zen"
        response_parts.append("Style set to Japanese Zen. Shifting design system to amber cedarwood screens, shoji doors, and bamboo accents.")
    elif "classical" in msg or "vintage" in msg:
        updates["style"] = "Classical"
        response_parts.append("Style updated to Classical Roman/Gothic. Loading solid marble column moldings, white plaster pediments, and arched lintels.")
    elif "indian" in msg or "traditional" in msg or "haveli" in msg or "vastu" in msg or "vaastu" in msg:
        updates["style"] = "Indian Traditional"
        response_parts.append("Style updated to Indian Traditional (Haveli style). Re-orienting to Vaastu Shastra compliance principles, loading beautiful Jodhpur Sandstone slabs, carved teakwood columns, and central courtyard water Baori structures.")

    # If no updates matched
    if not response_parts:
        response_text = "I've documented your notes. Try asking me to: 'change style to Japanese Zen', 'change style to Indian Traditional', 'add a swimming pool', 'upgrade to 3 floors', or 'adjust bedrooms to 4'."
    else:
        response_text = " ".join(response_parts)

    return {
        "reply": response_text,
        "suggested_overrides": updates
    }

@app.post("/api/chat")
async def chat_architect(chat: ChatMessage):
    """
    Floating AI Architect chat endpoint. Connects with NVIDIA NIM LLM for dynamic conversations, 
    falling back to standard local rule mappings if key is not active.
    """
    api_key = os.getenv("NVIDIA_API_KEY")
    if api_key and api_key.strip():
        try:
            print("[INFO] Attempting chat refinement with NVIDIA NIM LLM...")
            result = chat_architect_llm(chat.message, chat.current_state)
            print("[INFO] NVIDIA NIM chat response completed successfully.")
            return result
        except Exception as e:
            print(f"[WARNING] NVIDIA NIM chat completion failed. Falling back to local rules. Reason: {e}")
            
    # Fallback to local rule-based chat
    print("[INFO] Using local rule-based chat architect.")
    return chat_architect_fallback(chat.message, chat.current_state)
