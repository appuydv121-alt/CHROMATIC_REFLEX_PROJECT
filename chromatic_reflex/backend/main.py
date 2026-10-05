import os
import sqlite3
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "db")
DB_PATH = os.path.join(DB_DIR, "reflex.db")


# ---------- Database ----------
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    with get_conn() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name TEXT NOT NULL,
            player_hand TEXT NOT NULL,
            score INTEGER NOT NULL,
            total_rounds INTEGER NOT NULL,
            correct_rounds INTEGER NOT NULL,
            accuracy REAL NOT NULL,
            avg_rt REAL,
            best_rt REAL,
            streak INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            raw_json TEXT
        );
        CREATE TABLE IF NOT EXISTS rounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            round_number INTEGER NOT NULL,
            color TEXT NOT NULL,
            target_gesture TEXT NOT NULL,
            detected_gesture TEXT,
            outcome TEXT NOT NULL,
            reaction_time_ms REAL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_score ON sessions(score DESC);
        CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_name);
        CREATE INDEX IF NOT EXISTS idx_rounds_session ON rounds(session_id);
        """)


init_db()


# ---------- Schemas ----------
class Player(BaseModel):
    name: str = "Anonymous"
    hand: Literal["left", "right"]

    @field_validator("name")
    @classmethod
    def clean_name(cls, v):
        v = (v or "").strip()
        return v[:50] if v else "Anonymous"


class Summary(BaseModel):
    score: int = Field(ge=0)
    total_rounds: int = Field(ge=1, le=20)
    correct_rounds: int = Field(ge=0, le=20)
    accuracy_percent: float = Field(ge=0, le=100)
    avg_reaction_time_ms: Optional[float] = None
    best_reaction_time_ms: Optional[float] = None
    longest_streak: int = Field(ge=0, le=20)


class RoundData(BaseModel):
    round_number: int = Field(ge=1, le=20)
    color: Literal["RED", "BLUE", "YELLOW", "GREEN"]
    target_gesture: Literal["two_fingers", "fist", "thumbs_up", "point"]
    detected_gesture: Optional[str] = None
    outcome: Literal["correct", "wrong", "timeout"]
    reaction_time_ms: Optional[float] = None


class SessionPayload(BaseModel):
    player: Player
    summary: Summary
    rounds: List[RoundData] = Field(min_length=1, max_length=20)
    client_timestamp: datetime


# ---------- App ----------
app = FastAPI(title="Chromatic Reflex API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/session", status_code=201)
def create_session(payload: SessionPayload):
    s, p = payload.summary, payload.player
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO sessions (player_name, player_hand, score, total_rounds,
               correct_rounds, accuracy, avg_rt, best_rt, streak, timestamp, raw_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                p.name,
                p.hand,
                s.score,
                s.total_rounds,
                s.correct_rounds,
                s.accuracy_percent,
                s.avg_reaction_time_ms,
                s.best_reaction_time_ms,
                s.longest_streak,
                payload.client_timestamp.isoformat(),
                payload.model_dump_json(),
            ),
        )
        session_id = cur.lastrowid
        conn.executemany(
            """INSERT INTO rounds (session_id, round_number, color, target_gesture,
               detected_gesture, outcome, reaction_time_ms) VALUES (?,?,?,?,?,?,?)""",
            [
                (
                    session_id,
                    r.round_number,
                    r.color,
                    r.target_gesture,
                    r.detected_gesture,
                    r.outcome,
                    r.reaction_time_ms,
                )
                for r in payload.rounds
            ],
        )
    return {"status": "success", "session_id": session_id, "score": s.score}


ORDER = "score DESC, (avg_rt IS NULL), avg_rt ASC"


@app.get("/api/leaderboard")
def leaderboard(limit: int = Query(10, ge=1, le=50)):
    """Best session per player, ranked by score desc, then avg reaction time asc."""
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT * FROM (
                  SELECT id, player_name, player_hand, score, accuracy, avg_rt,
                         best_rt, streak, timestamp,
                         ROW_NUMBER() OVER (PARTITION BY LOWER(player_name)
                                            ORDER BY {ORDER}) AS rn
                  FROM sessions)
                WHERE rn = 1 ORDER BY {ORDER} LIMIT ?""",
            (limit,),
        ).fetchall()
    result = []
    for i, r in enumerate(rows, start=1):
        d = dict(r)
        d.pop("rn")
        d["rank"] = i
        result.append(d)
    return result


@app.get("/api/player/{name}")
def player_history(name: str):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT id, player_name, player_hand, score, accuracy, avg_rt,
                      best_rt, streak, timestamp
               FROM sessions WHERE LOWER(player_name) = LOWER(?)
               ORDER BY timestamp ASC""",
            (name.strip(),),
        ).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"player": name.strip(), "sessions": [dict(r) for r in rows]}
