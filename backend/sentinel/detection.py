from __future__ import annotations

from .models import RequestEvent, RiskAssessment, RiskLevel, RiskSignal, SessionProfile


class DetectionEngine:
    """Deterministic, explainable scoring for the hackathon vertical slice."""

    containment_threshold = 80

    def assess(
        self,
        event: RequestEvent,
        profile: SessionProfile,
        recent_session_events: int,
    ) -> RiskAssessment:
        signals: list[RiskSignal] = []
        method = event.method.upper()
        privileged_mutation = method in {"POST", "PUT", "PATCH", "DELETE"} and (
            event.path.startswith("/admin/") or event.path.startswith("/operations/")
        )

        if privileged_mutation:
            signals.append(
                RiskSignal(
                    code="PRIVILEGED_MUTATION",
                    label="Privileged operation",
                    score=34,
                    evidence=f"{method} {event.path} changes a protected administrative resource.",
                )
            )
        if event.source_ip != profile.trusted_source_ip:
            signals.append(
                RiskSignal(
                    code="UNRECOGNIZED_NETWORK",
                    label="Unrecognized network",
                    score=24,
                    evidence=f"Source {event.source_ip} differs from the established session source.",
                )
            )
        if event.device_id != profile.trusted_device_id:
            signals.append(
                RiskSignal(
                    code="UNRECOGNIZED_DEVICE",
                    label="Unrecognized device",
                    score=18,
                    evidence=f"Device {event.device_id} is not associated with the active session profile.",
                )
            )
        if recent_session_events >= 4:
            signals.append(
                RiskSignal(
                    code="REQUEST_VELOCITY",
                    label="Abnormal request velocity",
                    score=18,
                    evidence=f"{recent_session_events + 1} requests were observed within a 30-second window.",
                )
            )

        score = min(sum(signal.score for signal in signals), 100)
        if score >= 80:
            level = RiskLevel.CRITICAL
            recommendation = "Contain this session and preserve access for unrelated sessions."
        elif score >= 60:
            level = RiskLevel.HIGH
            recommendation = "Block the request and request operator review."
        elif score >= 30:
            level = RiskLevel.MEDIUM
            recommendation = "Continue observation and retain evidence."
        else:
            level = RiskLevel.LOW
            recommendation = "Allow the request under the current policy."

        return RiskAssessment(
            event_id=event.event_id,
            risk_score=score,
            level=level,
            signals=signals,
            recommendation=recommendation,
        )
