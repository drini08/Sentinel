from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock

from .models import (
    ContainmentAction,
    Incident,
    RequestEvent,
    RiskAssessment,
    SessionProfile,
    SessionStatus,
)


class EvidenceStore:
    def __init__(self, path: str | Path) -> None:
        self.path = str(path)
        self._lock = RLock()
        self._connection = sqlite3.connect(self.path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._create_schema()

    def _create_schema(self) -> None:
        with self._lock, self._connection:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    trusted_source_ip TEXT NOT NULL,
                    trusted_device_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS assessments (
                    assessment_id TEXT PRIMARY KEY,
                    event_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS incidents (
                    incident_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS containment_actions (
                    action_id TEXT PRIMARY KEY,
                    incident_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                """
            )

    @staticmethod
    def _payload(model: object) -> str:
        return json.dumps(model.model_dump(mode="json"), separators=(",", ":"))  # type: ignore[attr-defined]

    def clear(self) -> None:
        with self._lock, self._connection:
            for table in ("containment_actions", "incidents", "assessments", "events", "sessions"):
                self._connection.execute(f"DELETE FROM {table}")

    def save_session(self, profile: SessionProfile) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT OR REPLACE INTO sessions
                (session_id, user_id, trusted_source_ip, trusted_device_id, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    profile.session_id,
                    profile.user_id,
                    profile.trusted_source_ip,
                    profile.trusted_device_id,
                    profile.status.value,
                    datetime.now(UTC).isoformat(),
                ),
            )

    def get_session(self, session_id: str) -> SessionProfile | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
            ).fetchone()
        if row is None:
            return None
        return SessionProfile(
            session_id=row["session_id"],
            user_id=row["user_id"],
            trusted_source_ip=row["trusted_source_ip"],
            trusted_device_id=row["trusted_device_id"],
            status=SessionStatus(row["status"]),
        )

    def set_session_status(self, session_id: str, status: SessionStatus) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "UPDATE sessions SET status = ?, updated_at = ? WHERE session_id = ?",
                (status.value, datetime.now(UTC).isoformat(), session_id),
            )

    def save_event(self, event: RequestEvent) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO events VALUES (?, ?, ?, ?)",
                (event.event_id, event.session_id, event.timestamp.isoformat(), self._payload(event)),
            )

    def recent_event_count(self, session_id: str, since: datetime) -> int:
        with self._lock:
            row = self._connection.execute(
                "SELECT COUNT(*) AS count FROM events WHERE session_id = ? AND created_at >= ?",
                (session_id, since.isoformat()),
            ).fetchone()
        return int(row["count"])

    def save_assessment(self, assessment: RiskAssessment) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO assessments VALUES (?, ?, ?, ?)",
                (
                    assessment.assessment_id,
                    assessment.event_id,
                    assessment.created_at.isoformat(),
                    self._payload(assessment),
                ),
            )

    def save_incident(self, incident: Incident) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO incidents VALUES (?, ?, ?)",
                (incident.incident_id, incident.created_at.isoformat(), self._payload(incident)),
            )

    def save_action(self, action: ContainmentAction) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO containment_actions VALUES (?, ?, ?, ?)",
                (action.action_id, action.incident_id, action.created_at.isoformat(), self._payload(action)),
            )

    def list_incidents(self) -> list[Incident]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload FROM incidents ORDER BY created_at DESC"
            ).fetchall()
        return [Incident.model_validate_json(row["payload"]) for row in rows]

    def list_events(self, limit: int = 100) -> list[RequestEvent]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload FROM events ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [RequestEvent.model_validate_json(row["payload"]) for row in rows]
