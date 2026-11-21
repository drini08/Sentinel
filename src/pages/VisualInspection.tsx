import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ImagePlus, ScanSearch, Sparkles, Upload } from "lucide-react";
import { PageHeader, Status } from "../components/UI";
import { visualInspectionApi } from "../inspection/api";
import type { VisualInspectionResult, VisualInspectionStatus } from "../inspection/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

async function prepareImage(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type as typeof ACCEPTED_TYPES[number])) throw new Error("Use a JPG, PNG, or WebP image.");
  if (file.size > 12_000_000) throw new Error("Image must be smaller than 12 MB.");
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", .84);
    return { preview: dataUrl, mimeType: "image/jpeg" as const, base64: dataUrl.split(",", 2)[1] };
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function VisualInspection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<VisualInspectionStatus | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [context, setContext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VisualInspectionResult | null>(null);

  useEffect(() => { void visualInspectionApi.getStatus().then(setStatus).catch(() => setStatus(null)); }, []);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setError(""); setResult(null);
    try {
      const prepared = await prepareImage(file);
      setFileName(file.name); setPreview(prepared.preview); setImageBase64(prepared.base64);
    } catch (reason) {
      setPreview(""); setImageBase64(""); setError(reason instanceof Error ? reason.message : "Could not read image.");
    }
  };

  const analyze = async () => {
    if (!imageBase64) return;
    setPending(true); setError("");
    try {
      setResult(await visualInspectionApi.analyze({ filename: fileName, mime_type: "image/jpeg", image_base64: imageBase64, context }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Visual inspection failed.");
    } finally { setPending(false); }
  };

  const conditionIcon = result?.condition === "good" ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />;
  return <div className="animate-enter visual-inspection-page">
    <PageHeader eyebrow="Gemini visual assessment" title="Visual Inspection" description="Upload a field image to identify infrastructure assets, visible concerns, and safe inspection actions." action={<Status tone={status?.configured ? "light" : "neutral"}>{status?.configured ? "Gemini connected" : "Gemini unavailable"}</Status>} />
    <div className="visual-inspection-grid">
      <section className="panel visual-upload-panel">
        <button type="button" className={`visual-dropzone ${preview ? "has-image" : ""}`} onClick={() => inputRef.current?.click()}>
          {preview ? <img src={preview} alt="Selected infrastructure" /> : <div><ImagePlus size={34} /><strong>Select infrastructure image</strong><span>JPG, PNG, or WebP · maximum 12 MB</span></div>}
        </button>
        <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void chooseFile(event.target.files?.[0])} />
        <div className="visual-file-row"><Camera size={16} /><span>{fileName || "No image selected"}</span><button type="button" onClick={() => inputRef.current?.click()}><Upload size={14} />Choose image</button></div>
        <label className="visual-context">Inspection context <textarea value={context} maxLength={500} onChange={(event) => setContext(event.target.value)} placeholder="Optional: asset name, location, or what the operator noticed" /></label>
        <button type="button" className="button-primary visual-analyze" disabled={!imageBase64 || pending || status?.configured === false} onClick={() => void analyze()}><ScanSearch size={16} />{pending ? "Analyzing image…" : "Analyze infrastructure"}</button>
        {error && <div className="satellite-error"><AlertTriangle size={16} />{error}</div>}
      </section>

      <aside className="visual-result-column">
        {!result && <div className="panel visual-empty"><Sparkles size={24} /><strong>Ready for visual inspection</strong><p>Gemini will report only visible evidence and concise verification steps.</p></div>}
        {result && <div className={`panel visual-result condition-${result.condition}`}>
          <header>{conditionIcon}<div><span>{result.condition}</span><h2>{result.asset_type}</h2></div><b>{Math.round(result.confidence * 100)}%</b></header>
          <p>{result.summary}</p>
          <ResultList title="Visible findings" items={result.findings} />
          <ResultList title="Potential risks" items={result.risks} empty="No visible risks identified" />
          <ResultList title="Recommended checks" items={result.recommendations} />
          <small>Gemini visual assessment · {result.inspection_id} · not an engineering certification</small>
        </div>}
      </aside>
    </div>
  </div>;
}

function ResultList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return <section className="visual-result-list"><h3>{title}</h3>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>}</section>;
}

