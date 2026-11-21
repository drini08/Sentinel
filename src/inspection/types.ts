export type VisualInspectionStatus = {
  configured: boolean;
  model: string;
};

export type VisualInspectionRequest = {
  filename: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  image_base64: string;
  context: string;
};

export type VisualInspectionResult = {
  inspection_id: string;
  asset_type: string;
  condition: "good" | "attention" | "critical" | "unknown";
  summary: string;
  findings: string[];
  risks: string[];
  recommendations: string[];
  confidence: number;
  model: string;
};

