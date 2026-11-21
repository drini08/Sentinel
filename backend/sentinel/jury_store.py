from __future__ import annotations

from .jury_models import JuryAttackRateLimited, JuryRun
from .store import EvidenceStore


class PostgresJuryStore:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def _connect(self):
        import psycopg

        return psycopg.connect(self.database_url)

    @staticmethod
    def _ensure_schema(connection: object) -> None:
        connection.execute(  # type: ignore[attr-defined]
            """CREATE TABLE IF NOT EXISTS jury_runs (
                run_id TEXT PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL,
                payload JSONB NOT NULL
            )"""
        )
        connection.execute(  # type: ignore[attr-defined]
            """CREATE TABLE IF NOT EXISTS jury_demo_state (
                state_id SMALLINT PRIMARY KEY CHECK (state_id = 1),
                active_run_id TEXT,
                last_started_at TIMESTAMPTZ
            )"""
        )
        connection.execute(  # type: ignore[attr-defined]
            """INSERT INTO jury_demo_state (state_id, active_run_id, last_started_at)
            VALUES (1, NULL, NULL) ON CONFLICT (state_id) DO NOTHING"""
        )

    def claim_jury_run(self, run: JuryRun, cooldown_seconds: int) -> tuple[bool, JuryRun]:
        with self._connect() as connection:
            self._ensure_schema(connection)
            state = connection.execute(
                "SELECT active_run_id, last_started_at FROM jury_demo_state WHERE state_id = 1 FOR UPDATE"
            ).fetchone()
            existing = connection.execute(
                "SELECT payload::text FROM jury_runs WHERE run_id = %s", (run.run_id,)
            ).fetchone()
            if existing:
                return False, JuryRun.model_validate_json(existing[0])
            if state and state[1] and (run.created_at - state[1]).total_seconds() < cooldown_seconds:
                raise JuryAttackRateLimited
            connection.execute(
                "INSERT INTO jury_runs (run_id, created_at, payload) VALUES (%s, %s, %s::jsonb)",
                (run.run_id, run.created_at, run.model_dump_json()),
            )
            connection.execute(
                "UPDATE jury_demo_state SET active_run_id = %s, last_started_at = %s WHERE state_id = 1",
                (run.run_id, run.created_at),
            )
        return True, run

    def update_jury_run(self, run: JuryRun) -> None:
        with self._connect() as connection:
            self._ensure_schema(connection)
            connection.execute(
                "UPDATE jury_runs SET payload = %s::jsonb WHERE run_id = %s",
                (run.model_dump_json(), run.run_id),
            )

    def get_jury_run(self, run_id: str) -> JuryRun | None:
        with self._connect() as connection:
            self._ensure_schema(connection)
            row = connection.execute(
                "SELECT payload::text FROM jury_runs WHERE run_id = %s", (run_id,)
            ).fetchone()
        return JuryRun.model_validate_json(row[0]) if row else None

    def latest_jury_run(self) -> JuryRun | None:
        with self._connect() as connection:
            self._ensure_schema(connection)
            row = connection.execute(
                """SELECT runs.payload::text FROM jury_demo_state state
                LEFT JOIN jury_runs runs ON runs.run_id = state.active_run_id
                WHERE state.state_id = 1"""
            ).fetchone()
        return JuryRun.model_validate_json(row[0]) if row and row[0] else None

    def reset_jury_demo(self) -> None:
        with self._connect() as connection:
            self._ensure_schema(connection)
            connection.execute(
                "UPDATE jury_demo_state SET active_run_id = NULL WHERE state_id = 1"
            )


def build_jury_store(local_store: EvidenceStore, database_url: str | None) -> EvidenceStore | PostgresJuryStore:
    return PostgresJuryStore(database_url) if database_url else local_store
