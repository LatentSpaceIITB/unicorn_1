# How to Start the Application

**Read the Room** - A dating simulator game with FastAPI backend and Next.js frontend.

## Prerequisites

- Python 3.8+
- Node.js 18+
- npm

## Starting the Backend (FastAPI)

```bash
# From the project root directory
cd /Users/surajprasad/Desktop/unicorn

# Create and activate virtual environment (first time only)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m api.main
```

Backend runs at: **http://localhost:8000**

## Starting the Frontend (Next.js)

```bash
# From the frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Frontend runs at: **http://localhost:3000**

## Quick Start (Both Services)

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd /Users/surajprasad/Desktop/unicorn
source venv/bin/activate && python -m api.main
```

**Terminal 2 - Frontend:**
```bash
cd /Users/surajprasad/Desktop/unicorn/frontend
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/api/games` | POST | Create new game |
| `/api/games/{id}` | GET | Get game state |
| `/api/games/{id}/turn` | POST | Process turn |
| `/api/games/{id}/breakdown` | GET | Get game breakdown |
| `/api/games/{id}/history` | GET | Get game history |
