import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { FacilityAssetIndex } from "./FacilityAssetIndex";
import { FacilityWorld } from "./FacilityWorld";
import type { FacilitySnapshot } from "./types";

type FacilitySceneProps = {
  snapshot: FacilitySnapshot;
  selectedId: string | null;
  alertAssetId?: string | null;
  reducedMotion?: boolean;
  onSelect(assetId: string | null): void;
};

export function FacilityScene({
  snapshot,
  selectedId,
  alertAssetId = null,
  reducedMotion = false,
  onSelect,
}: FacilitySceneProps) {
  return (
    <div className="facility-canvas" role="img" aria-label="Interactive 3D infrastructure view of Dardania Water Services">
      <FacilityAssetIndex assets={snapshot.assets} selectedId={selectedId} onSelect={onSelect} />
      <Canvas
        dpr={[0.75, 1]}
        camera={{ position: [18, 15, 21], fov: 40, near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => { gl.toneMappingExposure = 1.45; }}
        onPointerMissed={() => onSelect(null)}
      >
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
