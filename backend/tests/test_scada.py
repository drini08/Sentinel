from datetime import UTC, datetime, timedelta

from sentinel.facility.topology import build_facility_assets
from sentinel.scada import SimulatedScadaSystem


def test_scada_simulation_changes_readings_over_time() -> None:
    assets = build_facility_assets()
    scada = SimulatedScadaSystem()
    first_sample = datetime(1970, 1, 1, tzinfo=UTC)

    scada.sample(assets, first_sample)
    first_level = assets["reservoir-a"].metrics["level_percent"]
    first_pressure = assets["pump-station"].metrics["pressure_bar"]
    scada.sample(assets, first_sample + timedelta(seconds=30))

    assert assets["reservoir-a"].metrics["level_percent"] != first_level
    assert assets["pump-station"].metrics["pressure_bar"] != first_pressure


def test_scada_simulation_respects_isolated_and_stopped_assets() -> None:
    assets = build_facility_assets()
    assets["reservoir-a"].status = "isolated"
    assets["pump-station"].status = "stopped"

    SimulatedScadaSystem().sample(assets)

    assert assets["reservoir-a"].metrics["outflow_m3s"] == 0.0
    assert assets["pump-station"].metrics["pressure_bar"] == 0.0
