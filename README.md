# NeoArchitect

NeoArchitect is a full-stack AI-assisted architecture design platform. It combines a Python FastAPI backend for building synthesis, structural estimates, and CGI rendering with a modern Next.js frontend for interactive visualization and user experience.

## Repository Structure

- `backend/`
  - `requirements.txt` — Python dependencies for the API server.
  - `app/`
    - `main.py` — FastAPI application and endpoints.
    - `analyzer.py` — requirement parsing and prompt analysis.
    - `generator.py` — layout and floor plan generation.
    - `structure.py` — cost estimation and safety calculation.
    - `renderer.py` — CGI render generation.

- `frontend/`
  - `package.json` — Next.js frontend package metadata and scripts.
  - `src/app/` — Next.js App Router pages and components.
  - `public/` — static assets.

## Features

- AI-driven architectural design pipeline
- Requirements parsing with prompt overrides
- Floor plan and layout generation
- Cost and safety estimation
- High-fidelity CGI render output
- AI-powered conversational architect chat with fallback logic
- Frontend 3D hero visualization using Three.js

## Backend Setup

1. Create and activate a Python virtual environment:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set required environment variables in `.env` or your shell:

```env
NVIDIA_API_KEY=your_nvidia_api_key_here
NIM_MODEL=meta/llama-3.1-70b-instruct
```

4. Run the backend server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Key endpoints:

- `GET /` — health check and service metadata
- `POST /api/generate` — generate architectural package from prompt and overrides
- `POST /api/chat` — conversational architect responses and suggested parameter updates

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the development site:

```bash
npm run dev
```

3. Open the app in your browser:

- `http://localhost:3000`

## Notes

- The frontend already includes a generated `frontend/README.md` for Next.js setup and deployment guidance.
- The backend relies on `fastapi`, `uvicorn`, `pydantic`, `openai`, and `python-dotenv`.
- `NVIDIA_API_KEY` is required for the chat architect LLM integration. If not set, chat requests will fail.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Submit a pull request with a description of changes.

---

For frontend-specific details, see `frontend/README.md`.
