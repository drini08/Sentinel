export type AssetType =
  | "intake"
  | "dosing"
  | "clarifier"
  | "filter"
  | "reservoir"
  | "pump_station"
  | "valve"
  | "control"
  | "power"
  | "outlet";

export type CommandAction = "open" | "close" | "start" | "stop" | "set_mode" | "set_target" | "isolate";
export type MetricValue = string | number | boolean;

export type FacilityAsset = {
  id: string;
  name: string;
  asset_type: AssetType;
  status: string;
  security_status: string;
  position: [number, number, number];
  metrics: Record<string, MetricValue>;
  supported_commands: CommandAction[];
};

export type FacilityConnection = {
  id: string;
  source: string;
  target: string;
  flow_m3s: number;
  active: boolean;
};

export type FacilitySnapshot = {
  revision: number;
  generated_at: string;
  assets: FacilityAsset[];
  connections: FacilityConnection[];
};

export type AssetCommand = {
  action: CommandAction;
  value?: string | number | boolean | null;
};

export type OperatorSession = {
  session_id: string;
  user_id: string;
  source_ip: string;
  device_id: string;
};

export type FacilityCommandRequest = {
  command: AssetCommand;
  session: OperatorSession;
};

export type RiskSignal = { code: string; label: string; score: number; evidence: string };
export type GatewayDecision = {
  event_id?: string;
  allowed: boolean;
  response_status?: number;
  reason?: string;
  assessment?: { risk_score: number; level: string; signals: RiskSignal[]; recommendation: string } | null;
  incident?: { incident_id: string; title: string; status: string; summary: string } | null;
  containment?: { action_id: string; action: string; status: string } | null;
};

export type FacilityCommandResult = {
  applied: boolean;
  asset: FacilityAsset;
  decision: GatewayDecision;
};

export type SimulationStep = { sequence: number; event: string; outcome: string };
export type FacilityScenarioResult = {
  scenario: string;
  attack: FacilityCommandResult;
  legitimate: FacilityCommandResult;
  continuity_verified: boolean;
  steps: SimulationStep[];
};

export type FacilityApi = {
  getSnapshot(): Promise<FacilitySnapshot>;
  executeCommand(assetId: string, request: FacilityCommandRequest): Promise<FacilityCommandResult>;
  reset(): Promise<FacilitySnapshot>;
  runScenario(): Promise<FacilityScenarioResult>;
};

export const legitimateOperator: OperatorSession = {
  session_id: "session-operator-11bd",
  user_id: "operator-221",
  source_ip: "10.20.0.21",
  device_id: "DWS-OPS-11",
};
