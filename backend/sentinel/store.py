from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock

from .models import (
    AuditLog,
    ContainmentAction,
    FirewallRule,
    FirewallRuleStatus,
    HealthCheck,
    Incident,
    IncidentStatus,
    Policy,
    ProtectedService,
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
                CREATE TABLE IF NOT EXISTS firewall_rules (
                    rule_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS health_checks (
                    check_id TEXT PRIMARY KEY,
                    service_id TEXT NOT NULL,
                    checked_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS audit_logs (
                    audit_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TRIGGER IF NOT EXISTS audit_logs_no_update
                BEFORE UPDATE ON audit_logs BEGIN
                    SELECT RAISE(ABORT, 'audit history is immutable');
                END;
                CREATE TRIGGER IF NOT EXISTS audit_logs_no_delete
                BEFORE DELETE ON audit_logs BEGIN
                    SELECT RAISE(ABORT, 'audit history is immutable');
                END;
                CREATE TABLE IF NOT EXISTS protected_services (
                    service_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS policies (
                    policy_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                );
                """
            )

    @staticmethod
    def _payload(model: object) -> str:
        return json.dumps(model.model_dump(mode="json"), separators=(",", ":"))  # type: ignore[attr-defined]

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

    def get_incident(self, incident_id: str) -> Incident | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT payload FROM incidents WHERE incident_id = ?", (incident_id,)
            ).fetchone()
        return Incident.model_validate_json(row["payload"]) if row else None

    def update_incident_status(self, incident_id: str, status: IncidentStatus) -> Incident | None:
        incident = self.get_incident(incident_id)
        if incident is None:
            return None
        updated = incident.model_copy(update={"status": status})
        with self._lock, self._connection:
            self._connection.execute(
                "UPDATE incidents SET payload = ? WHERE incident_id = ?",
                (self._payload(updated), incident_id),
            )
        return updated

    def save_action(self, action: ContainmentAction) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO containment_actions VALUES (?, ?, ?, ?)",
                (action.action_id, action.incident_id, action.created_at.isoformat(), self._payload(action)),
            )

    def list_actions(self) -> list[ContainmentAction]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload FROM containment_actions ORDER BY created_at DESC"
            ).fetchall()
        return [ContainmentAction.model_validate_json(row["payload"]) for row in rows]

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

    def list_assessments(self, limit: int = 100) -> list[RiskAssessment]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload FROM assessments ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [RiskAssessment.model_validate_json(row["payload"]) for row in rows]

    def save_firewall_rule(self, rule: FirewallRule) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT OR REPLACE INTO firewall_rules
                (rule_id, created_at, expires_at, status, payload) VALUES (?, ?, ?, ?, ?)""",
                (rule.rule_id, rule.created_at.isoformat(), rule.expires_at.isoformat(), rule.status.value, self._payload(rule)),
            )

    def get_firewall_rule(self, rule_id: str) -> FirewallRule | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT payload FROM firewall_rules WHERE rule_id = ?", (rule_id,)
            ).fetchone()
        return FirewallRule.model_validate_json(row["payload"]) if row else None

    def update_firewall_rule_status(self, rule_id: str, status: FirewallRuleStatus) -> FirewallRule | None:
        rule = self.get_firewall_rule(rule_id)
        if rule is None:
            return None
        updated = rule.model_copy(update={"status": status})
        self.save_firewall_rule(updated)
        return updated

    def list_firewall_rules(self) -> list[FirewallRule]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload FROM firewall_rules ORDER BY created_at DESC"
            ).fetchall()
        return [FirewallRule.model_validate_json(row["payload"]) for row in rows]

    def save_health_check(self, check: HealthCheck) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO health_checks VALUES (?, ?, ?, ?)",
                (check.check_id, check.service_id, check.checked_at.isoformat(), self._payload(check)),
            )

    def list_health_checks(self, limit: int = 100) -> list[HealthCheck]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload FROM health_checks ORDER BY checked_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [HealthCheck.model_validate_json(row["payload"]) for row in rows]

    def append_audit(self, entry: AuditLog) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO audit_logs VALUES (?, ?, ?)",
                (entry.audit_id, entry.timestamp.isoformat(), self._payload(entry)),
            )

    def list_audit(self, limit: int = 200) -> list[AuditLog]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,)
            ).fetchall()
        return [AuditLog.model_validate_json(row["payload"]) for row in rows]

    def save_protected_service(self, service: ProtectedService) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT OR REPLACE INTO protected_services VALUES (?, ?)",
                (service.service_id, self._payload(service)),
            )

    def list_protected_services(self) -> list[ProtectedService]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload FROM protected_services ORDER BY service_id"
            ).fetchall()
        return [ProtectedService.model_validate_json(row["payload"]) for row in rows]

    def save_policy(self, policy: Policy) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT OR REPLACE INTO policies VALUES (?, ?)",
                (policy.policy_id, self._payload(policy)),
            )

    def get_policy(self, policy_id: str) -> Policy | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT payload FROM policies WHERE policy_id = ?", (policy_id,)
            ).fetchone()
        return Policy.model_validate_json(row["payload"]) if row else None

    def list_policies(self) -> list[Policy]:
        with self._lock:
            rows = self._connection.execute("SELECT payload FROM policies ORDER BY policy_id").fetchall()
        return [Policy.model_validate_json(row["payload"]) for row in rows]

    def list_sessions(self) -> list[SessionProfile]:
        with self._lock:
            rows = self._connection.execute("SELECT * FROM sessions ORDER BY updated_at DESC").fetchall()
        return [SessionProfile(
            session_id=row["session_id"], user_id=row["user_id"],
            trusted_source_ip=row["trusted_source_ip"], trusted_device_id=row["trusted_device_id"],
            status=SessionStatus(row["status"]),
        ) for row in rows]
