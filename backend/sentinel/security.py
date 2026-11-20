from __future__ import annotations

from datetime import timedelta

from .defense import DefenseService
from .detection import DetectionEngine
from .models import (
    ContainmentAction,
    GatewayDecision,
    Incident,
    IncidentStatus,
    RequestEvent,
    SessionProfile,
    SessionStatus,
    RuleCreate,
)
from .store import EvidenceStore


class SecurityService:
    def __init__(self, store: EvidenceStore, detector: DetectionEngine | None = None, defense: DefenseService | None = None) -> None:
        self.store = store
        self.detector = detector or DetectionEngine()
        self.defense = defense or DefenseService(store)

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
            self.defense.audit(
                "identity", "revoked_session_denied", "sentinel-gateway", "session",
                event.session_id, "blocked", f"Session is {profile.status.value}.", event_id=event.event_id,
            )
            return GatewayDecision(
                event_id=event.event_id,
                allowed=False,
                response_status=403,
                reason=f"Session is {profile.status.value} by containment policy.",
            )

        firewall_rule = self.defense.matching_rule(event)
        if firewall_rule is not None:
            self.store.save_event(event)
            self.defense.audit(
                "gateway", "request_blocked", "sentinel-gateway", "firewall_rule",
                firewall_rule.rule_id, "blocked",
                f"Request matched scoped {firewall_rule.target_type} rule.", event_id=event.event_id,
            )
            return GatewayDecision(
                event_id=event.event_id,
                allowed=False,
                response_status=429 if firewall_rule.action.value == "rate_limit" else 403,
                reason=f"Request denied by active firewall rule {firewall_rule.rule_id}.",
            )

        window_start = event.timestamp - timedelta(seconds=30)
        recent_count = self.store.recent_event_count(event.session_id, window_start)
        policies = self.store.list_policies()
        if policies:
            policy = policies[0]
            self.detector.moderate_threshold = policy.moderate_threshold
            self.detector.high_threshold = policy.high_threshold
            self.detector.containment_threshold = policy.critical_threshold
        assessment = self.detector.assess(event, profile, recent_count)
        self.store.save_event(event)
        self.store.save_assessment(assessment)
        self.defense.audit(
            "detection", "risk_assessed", "sentinel-detection-engine", "assessment",
            assessment.assessment_id, assessment.level.value,
            f"Risk score {assessment.risk_score}: {assessment.recommendation}",
            event_id=event.event_id, signal_count=len(assessment.signals),
        )

        if assessment.risk_score < self.detector.high_threshold:
            return GatewayDecision(
                event_id=event.event_id,
                allowed=True,
                response_status=200,
                reason="Request permitted under the current protection policy.",
                assessment=assessment,
            )

        if assessment.risk_score < self.detector.containment_threshold:
            if len(assessment.signals) >= 2:
                try:
                    self.defense.create_rule(
                        RuleCreate(
                            target_type="ip_endpoint",
                            target_value=f"{event.source_ip}|{event.path}",
                            justification="Corroborated high-risk request received a temporary scoped restriction.",
                            duration_seconds=300,
                        ),
                        actor="sentinel-decision-engine",
                    )
                except ValueError:
                    pass
            return GatewayDecision(
                event_id=event.event_id,
                allowed=False,
                response_status=403,
                reason="High-risk request blocked; a scoped temporary restriction was evaluated.",
                assessment=assessment,
            )

        active_policy = policies[0] if policies else None
        containment_authorized = (
            active_policy is None
            or (
                active_policy.enabled
                and active_policy.automatic_containment
                and (not active_policy.require_corroboration or len(assessment.signals) >= 2)
            )
        )
        if not containment_authorized:
            incident = Incident(
                title="Critical activity awaiting authorization",
                service_id=event.service_id,
                session_id=event.session_id,
                status=IncidentStatus.ACTIVE,
                risk=assessment,
                summary="Critical risk was blocked, but automatic containment was not authorized by policy.",
            )
            self.store.save_incident(incident)
            self.defense.audit(
                "decision", "containment_approval_required", "sentinel-decision-engine",
                "incident", incident.incident_id, "pending_approval",
                "High-impact containment requires enabled policy and corroborating evidence.",
            )
            return GatewayDecision(
                event_id=event.event_id,
                allowed=False,
                response_status=403,
                reason="Critical request blocked; operator authorization is required for containment.",
                assessment=assessment,
                incident=incident,
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
        self.defense.audit(
            "identity", "session_restricted", "sentinel-decision-engine", "session",
            event.session_id, "enforced", "Critical corroborated evidence triggered selective containment.",
            incident_id=incident.incident_id,
        )
        self.defense.create_automatic_ip_rule(event.source_ip, incident.incident_id)
        return GatewayDecision(
            event_id=event.event_id,
            allowed=False,
            response_status=403,
            reason="Critical risk threshold exceeded; the session was selectively contained.",
            assessment=assessment,
            incident=incident,
            containment=action,
        )
