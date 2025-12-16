"""
Analytics module for tracking game statistics
"""

import os
from datetime import datetime, date
from typing import Optional
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Date, func
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

Base = declarative_base()


class GameLog(Base):
    """Logs each completed game for analytics"""
    __tablename__ = "game_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, nullable=False)
    ending = Column(String, nullable=False)  # S, A, B, C, D, F
    turns = Column(Integer, nullable=False)
    final_vibe = Column(Integer, nullable=False)
    final_trust = Column(Integer, nullable=False)
    final_tension = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    date = Column(Date, default=date.today)


class Analytics:
    """Analytics tracker with PostgreSQL persistence"""

    def __init__(self):
        self.engine = None
        self.Session = None
        self._initialized = False

    def init_db(self):
        """Initialize database connection"""
        if self._initialized:
            return

        database_url = os.getenv("DATABASE_URL")

        if database_url:
            # Railway PostgreSQL - fix for SQLAlchemy 2.0
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)
            self.engine = create_engine(database_url)
        else:
            # Fallback to SQLite for local development
            self.engine = create_engine(
                "sqlite:///analytics.db",
                connect_args={"check_same_thread": False},
                poolclass=StaticPool
            )

        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self._initialized = True

    def log_game(
        self,
        session_id: str,
        ending: str,
        turns: int,
        final_vibe: int,
        final_trust: int,
        final_tension: int
    ):
        """Log a completed game"""
        if not self._initialized:
            self.init_db()

        session = self.Session()
        try:
            log = GameLog(
                session_id=session_id,
                ending=ending,
                turns=turns,
                final_vibe=final_vibe,
                final_trust=final_trust,
                final_tension=final_tension
            )
            session.add(log)
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"Analytics error: {e}")
        finally:
            session.close()

    def get_stats(self) -> dict:
        """Get aggregated statistics"""
        if not self._initialized:
            self.init_db()

        session = self.Session()
        try:
            total_games = session.query(func.count(GameLog.id)).scalar() or 0
            games_today = session.query(func.count(GameLog.id)).filter(
                GameLog.date == date.today()
            ).scalar() or 0

            # Ending distribution
            endings = {}
            for ending in ['S', 'A', 'B', 'C', 'D', 'F']:
                count = session.query(func.count(GameLog.id)).filter(
                    GameLog.ending == ending
                ).scalar() or 0
                endings[ending] = count

            # Average turns
            avg_turns = session.query(func.avg(GameLog.turns)).scalar()
            avg_turns = round(avg_turns, 1) if avg_turns else 0

            # Win rate (S, A, B are wins)
            wins = endings.get('S', 0) + endings.get('A', 0) + endings.get('B', 0)
            win_rate = round((wins / total_games * 100), 1) if total_games > 0 else 0

            return {
                "total_games": total_games,
                "games_today": games_today,
                "endings": endings,
                "average_turns": avg_turns,
                "win_rate_percent": win_rate
            }
        finally:
            session.close()


# Global analytics instance
analytics = Analytics()
