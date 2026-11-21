export type JuryScenario = "sensor-spoofing" | "command-injection" | "compromised-operator";

export type JuryRun = {
  run_id: string;
  scenario: JuryScenario;
  status: "running" | "contained" | "failed";
  created_at: string;
  completed_at?: string | null;
  affected_asset_ids: string[];
  risk_score: number;
  continuity_verified: boolean;
  defense_actions: string[];
  steps: Array<{ sequence: number; event: string; outcome: string }>;
};

export type JuryStatus = { active_run: JuryRun | null };

export type JuryApi = {
  trigger(scenario: JuryScenario, requestId?: string): Promise<JuryRun>;
  getStatus(signal?: AbortSignal): Promise<JuryStatus>;
  getRun?(runId: string): Promise<JuryRun>;
  reset?(): Promise<JuryStatus>;
};
