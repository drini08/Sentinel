from __future__ import annotations

from datetime import timedelta

from .detection import DetectionEngine
from .models import (
    ContainmentAction,
    GatewayDecision,
    Incident,
    IncidentStatus,
    RequestEvent,
    SessionProfile,
    SessionStatus,
)
from .store import EvidenceStore


class SecurityService:
    def __init__(self, store: EvidenceStore, detector: DetectionEngine | None = None) -> None:
        self.store = store
        self.detector = detector or DetectionEngine()

    def register_session(self, profile: SessionProfile) -> None:
        self.store.save_session(profile)

    def evaluate(self, event: RequestEvent) -> GatewayDecision:
        profile = self.store.get_session(event.session_id)
        if profile is None:
            profile = SessionProfile(
                session_id=event.session_id,
                user_id=event.user_id,
                trusted_source_ip=event.source_ip,
                trusted_device_id=event.device_id,
            )
            self.store.save_session(profile)

        if profile.status is not SessionStatus.ACTIVE:
            self.store.save_event(event)
            return GatewayDecision(
                event_id=event.event_id,
                allowed=False,
                response_status=403,
                reason=f"Session is {profile.status.value} by containment policy.",
            )

        window_start = event.timestamp - timedelta(seconds=30)
        recent_count = self.store.recent_event_count(event.session_id, window_start)
        assessment = self.detector.assess(event, profile, recent_count)
        self.store.save_event(event)
        self.store.save_assessment(assessment)

        if assessment.risk_score < self.detector.containment_threshold:
            return GatewayDecision(
                event_id=event.event_id,
                allowed=True,
                response_status=200,
                reason="Request permitted under the current protection policy.",
                assessment=assessment,
            )

        incident = Incident(
            title="Unauthorized administrative access",
            service_id=event.service_id,
            session_id=event.session_id,
            status=IncidentStatus.CONTAINED,
            risk=assessment,
            summary=(
                "A valid employee session attempted a protected administrative operation "
                "outside its established behavioral profile."
            ),
        )
        action = ContainmentAction(
            incident_id=incident.incident_id,
            session_id=event.session_id,
        )
        self.store.set_session_status(event.session_id, SessionStatus.RESTRICTED)
        self.store.save_incident(incident)
        self.store.save_action(action)
        return GatewayDecision(
            event_id=event.event_id,
            allowed=False,
            response_status=403,
            reason="Critical risk threshold exceeded; the session was selectively contained.",
            assessment=assessment,
            incident=incident,
            containment=action,
        )
