export type Coordinate = [number, number];

export type SatelliteStatus = {
  earth_engine_configured: boolean;
  gemini_configured: boolean;
  mode: "live" | "unavailable";
  dataset: string | null;
};

export type SatelliteAnalysisRequest = {
  polygon: Coordinate[];
  baseline_start: string;
  baseline_end: string;
  current_start: string;
  current_end: string;
  scada_level_percent: number;
};

export type SatelliteAnalysisResult = {
  analysis_id: string;
  baseline_water_km2: number;
  current_water_km2: number;
  change_percent: number;
  scada_level_percent: number;
  observation: string;
  recommendation: string;
  imagery_dataset: string;
};

export type SatelliteApi = {
  getStatus(): Promise<SatelliteStatus>;
  analyze(request: SatelliteAnalysisRequest): Promise<SatelliteAnalysisResult>;
};
