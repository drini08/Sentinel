from __future__ import annotations

from datetime import timedelta
from ipaddress import ip_address

from .models import (
    AuditLog,
    FirewallAction,
    FirewallRule,
    FirewallRuleStatus,
    HealthCheck,
    HealthStatus,
    Policy,
    ProtectedService,
    RequestEvent,
    RuleCreate,
    utc_now,
)
from .store import EvidenceStore


class UnsafeRule(ValueError):
    """Raised when a rule could disrupt infrastructure-wide or essential access."""


DEFAULT_SERVICES = (
    ProtectedService(
        service_id="dardania-water-api",
        name="Dardania Water API",
        service_type="Administrative API",
        base_url="sim://water-api",
        essential_paths=["/telemetry/reservoir-levels", "/telemetry/pressure"],
        latency_ms=28,
    ),
    ProtectedService(
        service_id="operations-portal",
        name="Operations Portal",
        service_type="Internal application",
        base_url="sim://operations-portal",
        essential_paths=["/operations/status"],
        latency_ms=41,
    ),
    ProtectedService(
        service_id="customer-services",
        name="Customer Services",
        service_type="Public API",
        base_url="sim://customer-services",
        essential_paths=["/customer/status"],
        latency_ms=33,
    ),
    ProtectedService(
        service_id="telemetry-gateway",
        name="Telemetry Gateway",
        service_type="Ingestion service",
        base_url="sim://telemetry-gateway",
        essential_paths=["/telemetry/ingest"],
        latency_ms=17,
    ),
)


class DefenseService:
    def __init__(self, store: EvidenceStore) -> None:
        self.store = store
        self.seed_configuration()

    def seed_configuration(self) -> None:
        if not self.store.list_protected_services():
            for service in DEFAULT_SERVICES:
                self.store.save_protected_service(service)
        if not self.store.list_policies():
            self.store.save_policy(
                Policy(
                    policy_id="adaptive-defense-default",
                    name="Adaptive defense",
                    description="Corroborated, scoped protection with continuity verification.",
                )
            )

    def audit(
        self,
        category: str,
        action: str,
        actor: str,
        entity_type: str,
        entity_id: str,
        outcome: str,
        detail: str,
        **metadata: object,
    ) -> AuditLog:
        entry = AuditLog(
            category=category,
            action=action,
            actor=actor,
            entity_type=entity_type,
            entity_id=entity_id,
            outcome=outcome,
            detail=detail,
            metadata=metadata,
        )
        self.store.append_audit(entry)
        return entry

    @staticmethod
    def _normalize_scope(request: RuleCreate) -> str:
        target = request.target_value.strip()
        lowered = target.lower()
        forbidden = {"*", "0.0.0.0/0", "::/0", "/", "all", "authenticated-users"}
        if lowered in forbidden:
            raise UnsafeRule("Infrastructure-wide and all-user rules are prohibited")
        if request.target_type == "ip":
            try:
                return str(ip_address(target))
            except ValueError as error:
                raise UnsafeRule("IP targets must be valid IPv4 or IPv6 addresses") from error
        if request.target_type == "endpoint":
            if not target.startswith("/") or any(character.isspace() for character in target):
                raise UnsafeRule("Endpoint targets must be absolute paths without whitespace")
            if lowered in {"/health", "/api/v1/facility/snapshot"}:
                raise UnsafeRule("SENTINEL health and essential control-plane endpoints cannot be blocked")
            return target
        if target.count("|") != 1:
            raise UnsafeRule("ip_endpoint targets must use the format '<ip>|<path>'")
        raw_ip, raw_path = (part.strip() for part in target.split("|", 1))
        try:
            normalized_ip = str(ip_address(raw_ip))
        except ValueError as error:
            raise UnsafeRule("ip_endpoint targets must contain a valid IPv4 or IPv6 address") from error
        if not raw_path.startswith("/") or any(character.isspace() for character in raw_path):
            raise UnsafeRule("ip_endpoint targets must contain an absolute path without whitespace")
        if raw_path.lower() in {"/health", "/api/v1/facility/snapshot"}:
            raise UnsafeRule("SENTINEL health and essential control-plane endpoints cannot be blocked")
        return f"{normalized_ip}|{raw_path}"

    def create_rule(self, request: RuleCreate, actor: str = "operator") -> FirewallRule:
        target_value = self._normalize_scope(request)
        for existing in self.active_rules():
            if (
                existing.target_type == request.target_type
                and existing.target_value == target_value
                and existing.action == request.action
            ):
                raise UnsafeRule(f"An equivalent active rule already exists: {existing.rule_id}")
        rule = FirewallRule(
            target_type=request.target_type,
            target_value=target_value,
            action=request.action,
            justification=request.justification,
            expires_at=utc_now() + timedelta(seconds=request.duration_seconds),
            incident_id=request.incident_id,
            created_by=actor,
        )
        self.store.save_firewall_rule(rule)
        self.audit(
            "defense", "firewall_rule_created", actor, "firewall_rule", rule.rule_id,
            "enforced", request.justification, target=target_value, expires_at=rule.expires_at.isoformat(),
        )
        check = self.verify_continuity(rule, force_failure=request.simulate_continuity_failure)
        if not check.transaction_succeeded:
            rolled_back = self.store.update_firewall_rule_status(rule.rule_id, FirewallRuleStatus.ROLLED_BACK)
            self.audit(
                "continuity", "firewall_rule_rolled_back", "sentinel-continuity-engine",
                "firewall_rule", rule.rule_id, "rolled_back",
                "The rule was automatically reverted after a legitimate transaction failed.",
                health_check_id=check.check_id,
            )
            return rolled_back or rule
        return rule

    def create_automatic_ip_rule(self, source_ip: str, incident_id: str) -> FirewallRule | None:
        request = RuleCreate(
            target_type="ip",
            target_value=source_ip,
            justification="Corroborated critical-risk activity from a compromised session.",
            duration_seconds=900,
            incident_id=incident_id,
        )
        try:
            return self.create_rule(request, actor="sentinel-decision-engine")
        except UnsafeRule:
            return None

    def active_rules(self) -> list[FirewallRule]:
        now = utc_now()
        active: list[FirewallRule] = []
        for rule in self.store.list_firewall_rules():
            if rule.status is FirewallRuleStatus.ACTIVE and rule.expires_at <= now:
                self.store.update_firewall_rule_status(rule.rule_id, FirewallRuleStatus.EXPIRED)
                self.audit(
                    "defense", "firewall_rule_expired", "sentinel-scheduler", "firewall_rule",
                    rule.rule_id, "expired", "Temporary defensive rule reached its configured expiration.",
                )
            elif rule.status is FirewallRuleStatus.ACTIVE:
                active.append(rule)
        return active

    def matching_rule(self, event: RequestEvent) -> FirewallRule | None:
        try:
            source_ip = str(ip_address(event.source_ip.strip()))
        except ValueError:
            source_ip = event.source_ip.strip()
        for rule in self.active_rules():
            if rule.target_type == "ip" and rule.target_value == source_ip:
                return rule
            if rule.target_type == "endpoint" and rule.target_value == event.path:
                return rule
            if rule.target_type == "ip_endpoint":
                ip, path = rule.target_value.split("|", 1)
                if ip == source_ip and path == event.path:
                    return rule
        return None

    def remove_rule(self, rule_id: str, actor: str, reason: str) -> FirewallRule | None:
        updated = self.store.update_firewall_rule_status(rule_id, FirewallRuleStatus.REMOVED)
        if updated:
            self.audit(
                "defense", "firewall_rule_removed", actor, "firewall_rule", rule_id,
                "removed", reason,
            )
        return updated

    def verify_continuity(self, rule: FirewallRule | None = None, force_failure: bool = False) -> HealthCheck:
        service = self.store.list_protected_services()[0]
        succeeded = not force_failure
        check = HealthCheck(
            service_id=service.service_id,
            status=HealthStatus.HEALTHY if succeeded else HealthStatus.UNAVAILABLE,
            response_time_ms=service.latency_ms if succeeded else 1500,
            transaction_succeeded=succeeded,
            rule_id=rule.rule_id if rule else None,
            detail=(
                "Legitimate protected API transaction succeeded after enforcement."
                if succeeded else
                "Legitimate protected API transaction failed after enforcement; rollback required."
            ),
        )
        self.store.save_health_check(check)
        self.audit(
            "continuity", "continuity_check", "sentinel-continuity-engine", "health_check",
            check.check_id, check.status.value, check.detail, rule_id=check.rule_id,
        )
        return check
