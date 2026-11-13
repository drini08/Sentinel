from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import GatewayDecision, Incident, RequestEvent, SimulationResult
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
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.state.store = store
    application.state.security = security

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

    return application


app = create_app()
