from __future__ import annotations

from .models import AssetCommand, FacilityAsset, FacilitySnapshot
from .topology import build_facility_assets, build_facility_connections
from ..scada import SimulatedScadaSystem


class FacilityAssetNotFound(KeyError):
    pass


class UnsupportedFacilityCommand(ValueError):
    pass


class InvalidFacilityCommand(ValueError):
    pass


class FacilityEngine:
    def __init__(self) -> None:
        self._revision = 1
        self._assets = build_facility_assets()
        self._connections = build_facility_connections()
        self._scada = SimulatedScadaSystem()

    def snapshot(self) -> FacilitySnapshot:
        self._scada.sample(self._assets)
        self._synchronize_all_connections()
        return FacilitySnapshot(
            revision=self._revision,
            assets=[asset.model_copy(deep=True) for asset in self._assets.values()],
            connections=[connection.model_copy(deep=True) for connection in self._connections],
        )

    def get(self, asset_id: str) -> FacilityAsset:
        asset = self._assets.get(asset_id)
        if asset is None:
            raise FacilityAssetNotFound(asset_id)
        return asset.model_copy(deep=True)

    def apply(self, asset_id: str, command: AssetCommand) -> FacilityAsset:
        asset = self._assets.get(asset_id)
        if asset is None:
            raise FacilityAssetNotFound(asset_id)
        if command.action not in asset.supported_commands:
            raise UnsupportedFacilityCommand(f"{asset_id} does not support {command.action}")

        if asset.asset_type == "reservoir":
            self._apply_reservoir(asset, command)
        elif asset.asset_type == "pump_station":
            self._apply_pump_station(asset, command)
        elif asset.asset_type in {"valve", "intake"}:
            self._apply_valve(asset, command)
        else:
            self._apply_process(asset, command)

        self._revision += 1
        self._synchronize_connections(asset)
        return asset.model_copy(deep=True)

    def set_security_status(self, asset_id: str, status: str) -> FacilityAsset:
        asset = self._assets.get(asset_id)
        if asset is None:
            raise FacilityAssetNotFound(asset_id)
        asset.security_status = status
        self._revision += 1
        return asset.model_copy(deep=True)

    def reset(self) -> FacilitySnapshot:
        self._assets = build_facility_assets()
        self._connections = build_facility_connections()
        self._revision += 1
        return self.snapshot()

    def _apply_reservoir(self, asset: FacilityAsset, command: AssetCommand) -> None:
        if command.action == "isolate":
            isolated = self._boolean(command.value, "isolate")
            asset.status = "isolated" if isolated else "operational"
            asset.metrics["outflow_m3s"] = 0.0 if isolated else self._baseline_outflow(asset.id)
            return
        if command.action == "set_target":
            target = self._number(command.value, "set_target")
            asset.metrics["target_level_percent"] = max(10.0, min(95.0, target))
            return
        raise UnsupportedFacilityCommand(command.action)

    def _apply_pump_station(self, asset: FacilityAsset, command: AssetCommand) -> None:
        if command.action == "stop":
            asset.status = "stopped"
            asset.metrics["active_pumps"] = 0
            asset.metrics["utilization_percent"] = 0.0
            return
        if command.action == "start":
            asset.status = "operational"
            asset.metrics["active_pumps"] = 2
            asset.metrics["utilization_percent"] = 68.0
            return
        if command.action == "set_mode":
            if not isinstance(command.value, str) or command.value not in {"auto", "manual"}:
                raise InvalidFacilityCommand("set_mode requires auto or manual")
            asset.metrics["mode"] = command.value
            return
        raise UnsupportedFacilityCommand(command.action)

    def _apply_valve(self, asset: FacilityAsset, command: AssetCommand) -> None:
        if command.action in {"open", "close"}:
            opened = command.action == "open"
            asset.status = "operational" if opened else "closed"
            key = "gate_percent" if asset.asset_type == "intake" else "position_percent"
            asset.metrics[key] = 100.0 if opened else 0.0
            return
        if command.action == "isolate":
            isolated = self._boolean(command.value, "isolate")
            asset.status = "isolated" if isolated else "operational"
            asset.metrics["position_percent"] = 0.0 if isolated else 76.0
            return
        if command.action == "set_target":
            target = max(0.0, min(100.0, self._number(command.value, "set_target")))
            key = "gate_percent" if asset.asset_type == "intake" else "position_percent"
            asset.metrics[key] = target
            asset.status = "closed" if target == 0 else "operational"
            return
        raise UnsupportedFacilityCommand(command.action)

    def _apply_process(self, asset: FacilityAsset, command: AssetCommand) -> None:
        if command.action == "stop":
            asset.status = "stopped"
            return
        if command.action == "start":
            asset.status = "operational"
            return
        if command.action == "set_target" and asset.asset_type == "dosing":
            asset.metrics["dose_mg_l"] = max(0.0, min(8.0, self._number(command.value, "set_target")))
            return
        raise UnsupportedFacilityCommand(command.action)

    def _synchronize_connections(self, asset: FacilityAsset) -> None:
        for connection in self._connections:
            if connection.source != asset.id:
                continue
            active = asset.status not in {"stopped", "closed", "isolated"}
            connection.active = active
            if not active:
                connection.flow_m3s = 0.0
            elif asset.asset_type == "reservoir":
                connection.flow_m3s = float(asset.metrics["outflow_m3s"])

    def _synchronize_all_connections(self) -> None:
        for asset in self._assets.values():
            self._synchronize_connections(asset)

    @staticmethod
    def _number(value: str | float | bool | None, action: str) -> float:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise InvalidFacilityCommand(f"{action} requires a numeric value")
        return float(value)

    @staticmethod
    def _boolean(value: str | float | bool | None, action: str) -> bool:
        if not isinstance(value, bool):
            raise InvalidFacilityCommand(f"{action} requires a boolean value")
        return value

    @staticmethod
    def _baseline_outflow(asset_id: str) -> float:
        return {"reservoir-a": 2.1, "reservoir-b": 1.9, "reservoir-c": 1.6}[asset_id]
