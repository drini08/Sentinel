import pytest

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
