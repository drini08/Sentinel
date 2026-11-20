from __future__ import annotations

from .models import RequestEvent, RiskAssessment, RiskLevel, RiskSignal, SessionProfile


class DetectionEngine:
    """Deterministic, explainable scoring for the hackathon vertical slice."""

    moderate_threshold = 30
    high_threshold = 60
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
        authentication_failures = int(event.attributes.get("authentication_failures", 0))
        if not event.authenticated or authentication_failures >= 5:
            signals.append(
                RiskSignal(
                    code="AUTHENTICATION_FAILURES",
                    label="Repeated authentication failure",
                    score=35,
                    evidence=f"{max(authentication_failures, 1)} failed authentication attempts were correlated with this source.",
                )
            )
        if event.attributes.get("privilege_change"):
            signals.append(
                RiskSignal(
                    code="PRIVILEGE_CHANGE",
                    label="Unusual privilege change",
                    score=30,
                    evidence="The request attempts to modify identity privileges outside the established profile.",
                )
            )
        if event.attributes.get("known_malicious_indicator"):
            signals.append(
                RiskSignal(
                    code="MALICIOUS_INDICATOR",
                    label="Known malicious indicator",
                    score=40,
                    evidence="The source or request indicator matched the local authorized simulation deny-list.",
                )
            )
        if event.attributes.get("baseline_deviation"):
            signals.append(
                RiskSignal(
                    code="BEHAVIORAL_ANOMALY",
                    label="Behavioral baseline deviation",
                    score=20,
                    evidence="Statistical request behavior exceeded the configured local baseline.",
                )
            )

        score = min(sum(signal.score for signal in signals), 100)
        if score >= self.containment_threshold:
            level = RiskLevel.CRITICAL
            recommendation = "Contain this session and preserve access for unrelated sessions."
        elif score >= self.high_threshold:
            level = RiskLevel.HIGH
            recommendation = "Block the request and request operator review."
        elif score >= self.moderate_threshold:
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
