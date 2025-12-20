"""
FastAPI main application for Read the Room
"""

import os
import sys
from contextlib import asynccontextmanager

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

from api.routes.games import router as games_router
from api.routes.leaderboard import router as leaderboard_router
from api.routes.paperclip import router as paperclip_router
from api.routes.activity import router as activity_router
from api.session import sessions
from api.paperclip_session import paperclip_sessions
from api.analytics import analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    print("Starting Read the Room API...")
    analytics.init_db()
    print("Analytics database initialized")
    yield
    # Shutdown
    print(f"Shutting down. Active sessions: {sessions.count()}")


app = FastAPI(
    title="Read the Room API",
    description="Dating simulator game API - Can you survive a first date?",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
# Allow frontend origins
origins = [
    "http://localhost:3000",       # Next.js dev server
    "http://127.0.0.1:3000",
    "https://readtheroom.ai",      # Production frontend
    "https://www.readtheroom.ai",
]

# Also allow origins from environment variable
env_origins = os.getenv("CORS_ORIGINS", "")
if env_origins:
    origins.extend(env_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(games_router)
app.include_router(leaderboard_router)
app.include_router(paperclip_router)
app.include_router(activity_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Read the Room API",
        "version": "2.0.0",
        "description": "Social Simulation Games - Dating & AI Alignment",
        "games": {
            "dating": {
                "name": "Read the Room",
                "description": "Can you survive a first date?",
                "endpoints": {
                    "create_game": "POST /api/games",
                    "get_game": "GET /api/games/{session_id}",
                    "process_turn": "POST /api/games/{session_id}/turn",
                    "get_breakdown": "GET /api/games/{session_id}/breakdown",
                    "get_history": "GET /api/games/{session_id}/history",
                }
            },
            "paperclip": {
                "name": "The Paperclip Protocol",
                "description": "Can you convince an AI not to destroy humanity?",
                "endpoints": {
                    "create_game": "POST /api/paperclip",
                    "get_game": "GET /api/paperclip/{session_id}",
                    "process_turn": "POST /api/paperclip/{session_id}/turn",
                    "get_logs": "GET /api/paperclip/{session_id}/logs",
                    "get_breakdown": "GET /api/paperclip/{session_id}/breakdown",
                    "get_history": "GET /api/paperclip/{session_id}/history",
                }
            }
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "active_sessions": {
            "dating": sessions.count(),
            "paperclip": paperclip_sessions.count()
        }
    }


@app.get("/api/stats")
async def get_stats():
    """Get game analytics and statistics"""
    stats = analytics.get_stats()
    stats["active_sessions"] = sessions.count()
    return stats


@app.get("/api/funnel")
async def get_funnel_stats(days: int = 7):
    """
    Get funnel analytics and conversion rates.

    Tracks user progression through:
    - game_start: Player created a game
    - reached_turn_5: Survived early game (The Hook)
    - reached_turn_15: Committed player (The Slog)
    - game_over: Finished the game

    Args:
        days: Number of days to analyze (default: 7)

    Returns:
        Funnel counts, conversion rates, rank distribution, and drop-off analysis
    """
    return analytics.get_funnel_stats(days)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
