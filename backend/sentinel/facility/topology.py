from __future__ import annotations

from .models import FacilityAsset, FacilityConnection


def build_facility_assets() -> dict[str, FacilityAsset]:
    assets = [
        FacilityAsset(
            id="raw-intake",
            name="Raw Water Intake",
            asset_type="intake",
            position=(-10.5, 0.4, -2.0),
            metrics={"gate_percent": 78.0, "inflow_m3s": 6.4, "turbidity_ntu": 4.8},
            supported_commands=["open", "close", "set_target"],
        ),
        FacilityAsset(
            id="dosing-unit",
            name="Chemical Dosing",
            asset_type="dosing",
            position=(-7.2, 0.8, 3.2),
            metrics={"dose_mg_l": 2.3, "tank_percent": 64.0, "ph": 7.2},
            supported_commands=["start", "stop", "set_target"],
        ),
        FacilityAsset(
            id="clarifier-a",
            name="Clarifier A",
            asset_type="clarifier",
            position=(-4.5, 0.4, -1.6),
            metrics={"flow_m3s": 3.2, "turbidity_ntu": 1.1, "scraper_rpm": 1.8},
            supported_commands=["start", "stop"],
        ),
        FacilityAsset(
            id="clarifier-b",
            name="Clarifier B",
            asset_type="clarifier",
            position=(-3.5, 0.4, 3.6),
            metrics={"flow_m3s": 3.1, "turbidity_ntu": 1.2, "scraper_rpm": 1.8},
            supported_commands=["start", "stop"],
        ),
        FacilityAsset(
            id="filtration-hall",
            name="Filtration Hall",
            asset_type="filter",
            position=(0.0, 1.0, 0.8),
            metrics={"throughput_m3s": 6.1, "filter_health_percent": 92.0, "pressure_bar": 3.6},
            supported_commands=["start", "stop"],
        ),
        FacilityAsset(
            id="reservoir-a",
            name="Reservoir A",
            asset_type="reservoir",
            position=(4.2, 1.2, -4.0),
            metrics={"level_percent": 72.0, "capacity_ml": 8.5, "inflow_m3s": 2.4, "outflow_m3s": 2.1},
            supported_commands=["isolate", "set_target"],
        ),
        FacilityAsset(
            id="reservoir-b",
            name="Reservoir B",
            asset_type="reservoir",
            position=(5.8, 1.2, 0.4),
            metrics={"level_percent": 58.0, "capacity_ml": 7.0, "inflow_m3s": 2.0, "outflow_m3s": 1.9},
            supported_commands=["isolate", "set_target"],
        ),
        FacilityAsset(
            id="reservoir-c",
            name="Reservoir C",
            asset_type="reservoir",
            position=(4.4, 1.2, 5.0),
            metrics={"level_percent": 81.0, "capacity_ml": 6.4, "inflow_m3s": 1.7, "outflow_m3s": 1.6},
            supported_commands=["isolate", "set_target"],
        ),
        FacilityAsset(
            id="pump-station",
            name="High-Lift Pump Station",
            asset_type="pump_station",
            position=(9.0, 0.8, 0.5),
            metrics={"active_pumps": 2, "available_pumps": 3, "utilization_percent": 68.0, "pressure_bar": 5.8},
            supported_commands=["start", "stop", "set_mode"],
        ),
        FacilityAsset(
            id="valve-manifold",
            name="Distribution Manifold",
            asset_type="valve",
            position=(11.7, 0.4, 0.5),
            metrics={"position_percent": 76.0, "flow_m3s": 5.5, "pressure_bar": 5.4},
            supported_commands=["open", "close", "isolate", "set_target"],
        ),
        FacilityAsset(
            id="control-center",
            name="Operations Center",
            asset_type="control",
            position=(0.8, 0.8, 6.0),
            metrics={"operators_online": 4, "network_health_percent": 99.8, "alarms": 0},
        ),
        FacilityAsset(
            id="backup-power",
            name="Backup Power",
            asset_type="power",
            position=(-1.8, 0.5, 6.2),
            metrics={"readiness_percent": 100.0, "fuel_percent": 87.0, "load_percent": 12.0},
            supported_commands=["start", "stop"],
        ),
        FacilityAsset(
            id="distribution-outlet",
            name="Municipal Distribution",
            asset_type="outlet",
            position=(14.5, 0.3, 0.5),
            metrics={"demand_m3s": 5.2, "delivered_m3s": 5.2, "pressure_bar": 5.1},
        ),
    ]
    return {asset.id: asset for asset in assets}


def build_facility_connections() -> list[FacilityConnection]:
    paths = [
        ("intake-dosing", "raw-intake", "dosing-unit", 6.4),
        ("dosing-clarifier-a", "dosing-unit", "clarifier-a", 3.2),
        ("dosing-clarifier-b", "dosing-unit", "clarifier-b", 3.1),
        ("clarifier-a-filter", "clarifier-a", "filtration-hall", 3.1),
        ("clarifier-b-filter", "clarifier-b", "filtration-hall", 3.0),
        ("filter-reservoir-a", "filtration-hall", "reservoir-a", 2.4),
        ("filter-reservoir-b", "filtration-hall", "reservoir-b", 2.0),
        ("filter-reservoir-c", "filtration-hall", "reservoir-c", 1.7),
        ("reservoir-a-pump", "reservoir-a", "pump-station", 2.1),
        ("reservoir-b-pump", "reservoir-b", "pump-station", 1.9),
        ("reservoir-c-pump", "reservoir-c", "pump-station", 1.6),
        ("pump-manifold", "pump-station", "valve-manifold", 5.5),
        ("manifold-outlet", "valve-manifold", "distribution-outlet", 5.2),
    ]
    return [
        FacilityConnection(id=id_, source=source, target=target, flow_m3s=flow)
        for id_, source, target, flow in paths
    ]
