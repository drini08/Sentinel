from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import GatewayDecision, Incident, RequestEvent, SimulationResult
from .facility.engine import FacilityAssetNotFound, FacilityEngine, InvalidFacilityCommand, UnsupportedFacilityCommand
from .facility.models import FacilityCommandRequest, FacilityCommandResult, FacilityScenarioResult, FacilitySnapshot
from .facility.service import FacilityService
from .security import SecurityService
from .simulation import run_compromised_session_scenario
from .store import EvidenceStore


def create_app(database_path: str | Path | None = None) -> FastAPI:
    resolved_path = database_path or os.getenv("SENTINEL_DATABASE_PATH", "sentinel.db")
    store = EvidenceStore(resolved_path)
    security = SecurityService(store)

    application = FastAPI(
        title="SENTINEL Security Core",
        version="0.1.0",
        description="Explainable detection and selective containment for the Dardania Water Services simulation.",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:4173",
            "http://localhost:4173",
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://localhost:5174",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.state.store = store
    application.state.security = security
    facility = FacilityService(FacilityEngine(), security)
    application.state.facility = facility

    @application.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "sentinel-security-core"}

    @application.post(
        "/api/v1/gateway/evaluate",
        response_model=GatewayDecision,
        tags=["gateway"],
    )
    async def evaluate_request(event: RequestEvent) -> GatewayDecision:
        return security.evaluate(event)

    @application.get(
        "/api/v1/incidents",
        response_model=list[Incident],
        tags=["incidents"],
    )
    async def list_incidents() -> list[Incident]:
        return store.list_incidents()

    @application.get("/api/v1/activity", response_model=list[RequestEvent], tags=["activity"])
    async def list_activity(limit: int = Query(default=100, ge=1, le=500)) -> list[RequestEvent]:
        return store.list_events(limit)

    @application.post(
        "/api/v1/simulations/compromised-session",
        response_model=SimulationResult,
        tags=["simulation"],
    )
    async def run_simulation() -> SimulationResult:
        return run_compromised_session_scenario(security)

    @application.get(
        "/api/v1/facility/snapshot",
        response_model=FacilitySnapshot,
        tags=["facility"],
    )
    async def facility_snapshot() -> FacilitySnapshot:
        return facility.engine.snapshot()

    @application.post(
        "/api/v1/facility/assets/{asset_id}/commands",
        response_model=FacilityCommandResult,
        tags=["facility"],
    )
    async def facility_command(asset_id: str, request: FacilityCommandRequest) -> FacilityCommandResult:
        try:
            return facility.execute(asset_id, request)
        except FacilityAssetNotFound as error:
            raise HTTPException(status_code=404, detail=f"Unknown facility asset: {asset_id}") from error
        except (UnsupportedFacilityCommand, InvalidFacilityCommand) as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @application.post(
        "/api/v1/facility/reset",
        response_model=FacilitySnapshot,
        tags=["facility"],
    )
    async def reset_facility() -> FacilitySnapshot:
        return facility.engine.reset()

    @application.post(
        "/api/v1/facility/scenarios/compromised-operator",
        response_model=FacilityScenarioResult,
        tags=["facility"],
    )
    async def compromised_operator_scenario() -> FacilityScenarioResult:
        return facility.run_compromised_operator()

    return application


app = create_app()
