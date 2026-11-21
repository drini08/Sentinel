import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree, type CanvasProps } from "@react-three/fiber";
import { FacilityAssetIndex } from "./FacilityAssetIndex";
import { FacilityWorld } from "./FacilityWorld";
import type { FacilitySnapshot } from "./types";

type FacilitySceneProps = {
  snapshot: FacilitySnapshot;
  selectedId: string | null;
  alertAssetId?: string | null;
  reducedMotion?: boolean;
  onSelect(assetId: string | null): void;
  onUnavailable(): void;
};

const camera: CanvasProps["camera"] = { position: [18, 15, 21], fov: 40, near: 0.1, far: 120 };
const renderer: CanvasProps["gl"] = { antialias: false, alpha: false, powerPreference: "low-power" };
const pixelRatio: CanvasProps["dpr"] = [0.75, 1];

function ContextMonitor({ onUnavailable }: { onUnavailable(): void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onUnavailable);
    if (gl.getContext().isContextLost()) onUnavailable();
    return () => canvas.removeEventListener("webglcontextlost", onUnavailable);
  }, [gl, onUnavailable]);
  return null;
}

export function FacilityScene({
  snapshot,
  selectedId,
  alertAssetId = null,
  reducedMotion = false,
  onSelect,
  onUnavailable,
}: FacilitySceneProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== "hidden");

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const element = viewport.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={viewport} className="facility-canvas" role="group" aria-label="Interactive 3D infrastructure view of Dardania Water Services">
      <FacilityAssetIndex assets={snapshot.assets} selectedId={selectedId} onSelect={onSelect} />
      <Canvas
        dpr={pixelRatio}
        camera={camera}
        gl={renderer}
        frameloop={inView && pageVisible ? reducedMotion ? "demand" : "always" : "never"}
        onCreated={({ gl }) => { gl.toneMappingExposure = 1.45; }}
        onPointerMissed={() => onSelect(null)}
      >
        <ContextMonitor onUnavailable={onUnavailable} />
        <color attach="background" args={["#122127"]} />
        <fog attach="fog" args={["#122127", 34, 72]} />
        <Suspense fallback={null}>
          <FacilityWorld
            snapshot={snapshot}
            selectedId={selectedId}
            alertAssetId={alertAssetId}
            reducedMotion={reducedMotion}
            onSelect={onSelect}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
