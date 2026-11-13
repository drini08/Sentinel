import pytest

from sentinel.facility.engine import FacilityEngine, UnsupportedFacilityCommand
from sentinel.facility.models import AssetCommand


def test_topology_contains_complete_small_water_facility() -> None:
    snapshot = FacilityEngine().snapshot()

    asset_types = {asset.asset_type for asset in snapshot.assets}
    reservoirs = [asset for asset in snapshot.assets if asset.asset_type == "reservoir"]

    assert len(reservoirs) == 3
    assert {
        "intake",
        "dosing",
        "clarifier",
        "filter",
        "pump_station",
        "valve",
        "control",
        "power",
        "outlet",
    } <= asset_types
    assert len(snapshot.connections) >= 12


def test_reservoir_isolation_stops_outflow_without_corrupting_level() -> None:
    engine = FacilityEngine()

    changed = engine.apply("reservoir-a", AssetCommand(action="isolate", value=True))

    assert changed.status == "isolated"
    assert changed.metrics["outflow_m3s"] == 0
    assert 0 <= changed.metrics["level_percent"] <= 100


def test_pump_station_can_stop_and_restart() -> None:
    engine = FacilityEngine()

    stopped = engine.apply("pump-station", AssetCommand(action="stop"))
    restarted = engine.apply("pump-station", AssetCommand(action="start"))

    assert stopped.status == "stopped"
    assert stopped.metrics["active_pumps"] == 0
    assert restarted.status == "operational"
    assert restarted.metrics["active_pumps"] == 2


def test_unsupported_command_does_not_change_revision() -> None:
    engine = FacilityEngine()
    revision = engine.snapshot().revision

    with pytest.raises(UnsupportedFacilityCommand):
        engine.apply("control-center", AssetCommand(action="open"))

    assert engine.snapshot().revision == revision


def test_reset_restores_the_deterministic_baseline() -> None:
    engine = FacilityEngine()
    engine.apply("reservoir-a", AssetCommand(action="isolate", value=True))

    reset = engine.reset()
    reservoir = next(asset for asset in reset.assets if asset.id == "reservoir-a")

    assert reservoir.status == "operational"
    assert reservoir.metrics["level_percent"] == 72.0
    assert reservoir.metrics["outflow_m3s"] == 2.1
