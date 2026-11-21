from __future__ import annotations

from datetime import UTC, datetime
from math import sin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .facility.models import FacilityAsset


class SyntheticScadaSystem:
    """Produces coherent, low-amplitude telemetry for the facility simulator."""

    reservoir_baselines = {
        "reservoir-a": (72.0, 2.4, 2.1),
        "reservoir-b": (58.0, 2.0, 1.9),
        "reservoir-c": (81.0, 1.7, 1.6),
    }

    def sample(self, assets: dict[str, FacilityAsset], sampled_at: datetime | None = None) -> None:
        timestamp = (sampled_at or datetime.now(UTC)).timestamp()
        slow = timestamp / 75
        fast = timestamp / 23

        intake = assets["raw-intake"]
        intake.metrics["inflow_m3s"] = round(6.4 + 0.12 * sin(fast), 2)
        intake.metrics["turbidity_ntu"] = round(4.8 + 0.18 * sin(slow + 0.8), 2)

        for index, (asset_id, (level, inflow, outflow)) in enumerate(self.reservoir_baselines.items()):
            reservoir = assets[asset_id]
            offset = index * 1.7
            reservoir.metrics["level_percent"] = round(level + 0.35 * sin(slow + offset), 1)
            reservoir.metrics["inflow_m3s"] = round(inflow + 0.05 * sin(fast + offset), 2)
            reservoir.metrics["outflow_m3s"] = (
                0.0 if reservoir.status == "isolated"
                else round(outflow + 0.04 * sin(fast + offset + 0.6), 2)
            )

        pump = assets["pump-station"]
        pump.metrics["pressure_bar"] = 0.0 if pump.status == "stopped" else round(5.8 + 0.08 * sin(fast + 0.4), 2)

        manifold = assets["valve-manifold"]
        manifold.metrics["pressure_bar"] = 0.0 if manifold.status in {"closed", "isolated"} else round(5.4 + 0.07 * sin(fast + 0.9), 2)

        outlet = assets["distribution-outlet"]
        outlet.metrics["pressure_bar"] = round(max(0.0, float(manifold.metrics["pressure_bar"]) - 0.3), 2)
        outlet.metrics["delivered_m3s"] = round(
            sum(float(assets[asset_id].metrics["outflow_m3s"]) for asset_id in self.reservoir_baselines),
            2,
        )
