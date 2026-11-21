from unittest.mock import MagicMock, Mock

import psycopg
import pytest

from sentinel import main
from sentinel.jury_models import JuryRun
from sentinel.jury_store import PostgresJuryStore, build_jury_store
from sentinel.store import EvidenceStore
from sentinel.main import default_database_path, production_database_url


def test_jury_store_uses_local_database_without_a_production_url() -> None:
    local = EvidenceStore(":memory:")

    assert build_jury_store(local, None) is local


def test_jury_store_uses_shared_postgres_when_configured() -> None:
    local = EvidenceStore(":memory:")

    selected = build_jury_store(local, "postgresql://sentinel.example/demo")

    assert isinstance(selected, PostgresJuryStore)
    assert selected.database_url == "postgresql://sentinel.example/demo"


def test_vercel_uses_its_writable_temporary_directory_for_local_evidence() -> None:
    assert str(default_database_path(vercel=True)).replace("\\", "/") == "/tmp/sentinel.db"
    assert str(default_database_path(vercel=False)) == "sentinel.db"


def test_vercel_refuses_to_start_without_shared_jury_persistence() -> None:
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        production_database_url(vercel=True, database_url=None)

    assert production_database_url(vercel=False, database_url=None) is None


def test_facility_projection_uses_a_bounded_read_without_schema_writes(monkeypatch) -> None:
    store = PostgresJuryStore("postgresql://sentinel.example/demo")
    run = JuryRun(scenario="compromised-operator", affected_asset_ids=["reservoir-a"])
    connection = MagicMock()
    connection.__enter__.return_value = connection
    connection.execute.return_value.fetchone.return_value = (run.model_dump_json(),)
    connect = Mock(return_value=connection)
    monkeypatch.setattr(psycopg, "connect", connect)

    assert store.latest_jury_run_for_projection() == run
    connect.assert_called_once_with(store.database_url, connect_timeout=3)
    timeout_query, read_query = (call.args[0] for call in connection.execute.call_args_list)
    assert timeout_query == "SET LOCAL statement_timeout = '2s'"
    assert read_query.startswith("SELECT ")


def test_facility_snapshot_preserves_telemetry_if_optional_postgres_read_fails(monkeypatch) -> None:
    store = PostgresJuryStore("postgresql://sentinel.example/demo")
    monkeypatch.setattr(main, "build_jury_store", lambda *_: store)
    monkeypatch.setattr(psycopg, "connect", Mock(side_effect=psycopg.OperationalError))
    app = main.create_app(":memory:")
    endpoint = next(route.endpoint for route in app.routes if route.path == "/api/v1/facility/snapshot")

    snapshot = endpoint()
    reservoir = next(asset for asset in snapshot.assets if asset.id == "reservoir-a")

    assert 0 < reservoir.metrics["level_percent"] < 100
    assert reservoir.security_status == "secure"
    with pytest.raises(psycopg.OperationalError):
        store.latest_jury_run()
