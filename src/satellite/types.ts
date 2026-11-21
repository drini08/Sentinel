export type Coordinate = [number, number];

export type SatelliteStatus = {
  earth_engine_configured: boolean;
  gemini_configured: boolean;
  mode: "live" | "demo";
  dataset: string;
};

export type SatelliteAnalysisRequest = {
  name: string;
  polygon: Coordinate[];
  baseline_start: string;
  baseline_end: string;
  current_start: string;
  current_end: string;
  scada_level_percent: number;
};

export type SatelliteAnalysisResult = {
  analysis_id: string;
  name: string;
  source: "earth-engine" | "demo";
  baseline_water_km2: number;
  current_water_km2: number;
  change_percent: number;
  scada_level_percent: number;
  mismatch_detected: boolean;
  confidence: number;
  observation: string;
  recommendation: string;
  explanation_source: "gemini" | "deterministic";
  baseline_image_url?: string;
  current_image_url?: string;
  imagery_dataset: string;
};

export type SatelliteApi = {
  getStatus(): Promise<SatelliteStatus>;
  analyze(request: SatelliteAnalysisRequest): Promise<SatelliteAnalysisResult>;
};
