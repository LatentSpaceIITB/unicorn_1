"""
Analytics module for tracking game statistics
"""

import os
from datetime import datetime, date, timedelta
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


class FunnelEvent(Base):
    """Tracks funnel milestone events for conversion analysis"""
    __tablename__ = "funnel_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)  # game_start, reached_turn_5, reached_turn_15, game_over
    turn_number = Column(Integer, nullable=True)
    ending_rank = Column(String, nullable=True)  # S/A/B/C/D/F for game_over events
    created_at = Column(DateTime, default=datetime.utcnow)
    date = Column(Date, default=date.today, index=True)


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

    def log_funnel_event(
        self,
        device_id: str,
        session_id: str,
        event_type: str,
        turn_number: Optional[int] = None,
        ending_rank: Optional[str] = None
    ):
        """Log a funnel milestone event"""
        if not self._initialized:
            self.init_db()

        if not device_id:
            return  # Skip if no device_id

        session = self.Session()
        try:
            event = FunnelEvent(
                device_id=device_id,
                session_id=session_id,
                event_type=event_type,
                turn_number=turn_number,
                ending_rank=ending_rank
            )
            session.add(event)
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"Funnel event error: {e}")
        finally:
            session.close()

    def get_funnel_stats(self, days: int = 7) -> dict:
        """Get funnel conversion stats for the past N days"""
        if not self._initialized:
            self.init_db()

        session = self.Session()
        try:
            cutoff_date = date.today() - timedelta(days=days)

            def count_unique_devices(event_type: str) -> int:
                """Count unique device_ids for an event type"""
                return session.query(func.count(func.distinct(FunnelEvent.device_id))).filter(
                    FunnelEvent.event_type == event_type,
                    FunnelEvent.date >= cutoff_date
                ).scalar() or 0

            # Count each funnel stage
            game_start = count_unique_devices("game_start")
            turn_5 = count_unique_devices("reached_turn_5")
            turn_15 = count_unique_devices("reached_turn_15")
            game_over = count_unique_devices("game_over")

            # Rank distribution for game_over events
            rank_dist = {}
            for rank in ['S', 'A', 'B', 'C', 'D', 'F']:
                rank_dist[rank] = session.query(func.count(FunnelEvent.id)).filter(
                    FunnelEvent.event_type == "game_over",
                    FunnelEvent.ending_rank == rank,
                    FunnelEvent.date >= cutoff_date
                ).scalar() or 0

            # Unique users in period
            unique_users = session.query(func.count(func.distinct(FunnelEvent.device_id))).filter(
                FunnelEvent.date >= cutoff_date
            ).scalar() or 0

            return {
                "period_days": days,
                "funnel": {
                    "game_start": {
                        "count": game_start,
                        "conversion_rate": None  # Can't calculate without page_view
                    },
                    "reached_turn_5": {
                        "count": turn_5,
                        "conversion_rate": round(turn_5 / game_start * 100, 1) if game_start else 0
                    },
                    "reached_turn_15": {
                        "count": turn_15,
                        "conversion_rate": round(turn_15 / turn_5 * 100, 1) if turn_5 else 0
                    },
                    "game_over": {
                        "count": game_over,
                        "conversion_rate": round(game_over / turn_15 * 100, 1) if turn_15 else 0
                    }
                },
                "rank_distribution": rank_dist,
                "unique_users": unique_users,
                "drop_off_analysis": {
                    "before_turn_5": round((game_start - turn_5) / game_start * 100, 1) if game_start else 0,
                    "turn_5_to_15": round((turn_5 - turn_15) / turn_5 * 100, 1) if turn_5 else 0,
                    "after_turn_15": round((turn_15 - game_over) / turn_15 * 100, 1) if turn_15 else 0
                }
            }
        finally:
            session.close()


# Global analytics instance
analytics = Analytics()
