import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";
import { PipeNetwork } from "./assets/PipeNetwork";
import { ProcessAsset } from "./assets/ProcessAsset";
import { Reservoir } from "./assets/Reservoir";
import { FacilityDetails } from "./assets/FacilityDetails";
import type { FacilitySnapshot } from "./types";

type FacilityWorldProps = {
  snapshot: FacilitySnapshot;
  selectedId: string | null;
  alertAssetId: string | null;
  reducedMotion: boolean;
  onSelect(assetId: string | null): void;
};

function CameraRig({ snapshot, selectedId, reducedMotion }: Pick<FacilityWorldProps, "snapshot" | "selectedId" | "reducedMotion">) {
  const { camera } = useThree();
  const target = useMemo(() => {
    const asset = snapshot.assets.find((candidate) => candidate.id === selectedId);
    return asset ? new Vector3(asset.position[0] + 7, asset.position[1] + 7, asset.position[2] + 9) : null;
  }, [selectedId, snapshot.assets]);

  useFrame(() => {
    if (!target || reducedMotion) return;
    camera.position.lerp(target, 0.035);
  });
  return null;
}

export function FacilityWorld({ snapshot, selectedId, alertAssetId, reducedMotion, onSelect }: FacilityWorldProps) {
  return (
    <>
      <ambientLight intensity={1.45} color="#b9e7e7" />
      <hemisphereLight args={["#d8f5f2", "#24383d", 1.25]} />
      <directionalLight
        position={[9, 18, 10]}
        intensity={2.8}
        color="#edffff"
      />
      <pointLight position={[-9, 5, -4]} intensity={24} distance={18} color="#32d9df" />
      <pointLight position={[8, 5, 5]} intensity={18} distance={17} color="#1c7399" />

      <group position={[0, 0, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[2, -0.08, 0]}>
          <planeGeometry args={[38, 25]} />
          <meshStandardMaterial color="#14252a" roughness={0.9} metalness={0.08} />
        </mesh>
        <Grid
          position={[2, -0.03, 0]}
          args={[38, 25]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#2b4d53"
          sectionSize={5}
          sectionThickness={0.8}
          sectionColor="#427078"
          fadeDistance={35}
          infiniteGrid={false}
        />
        <PipeNetwork snapshot={snapshot} reducedMotion={reducedMotion} alertAssetId={alertAssetId} />
        <FacilityDetails />
        {snapshot.assets.map((asset) =>
          asset.asset_type === "reservoir" ? (
            <Reservoir
              key={asset.id}
              asset={asset}
              selected={selectedId === asset.id}
              alert={alertAssetId === asset.id}
              onSelect={onSelect}
            />
          ) : (
            <ProcessAsset
              key={asset.id}
              asset={asset}
              selected={selectedId === asset.id}
              alert={alertAssetId === asset.id}
              onSelect={onSelect}
            />
          ),
        )}
      </group>

      <ContactShadows position={[2, 0, 0]} opacity={0.25} scale={34} blur={2.8} far={18} frames={1} resolution={256} />
      <CameraRig snapshot={snapshot} selectedId={selectedId} reducedMotion={reducedMotion} />
      <OrbitControls
        makeDefault
        enableDamping={!reducedMotion}
        minDistance={12}
        maxDistance={36}
        minPolarAngle={0.55}
        maxPolarAngle={Math.PI / 2.12}
        target={[2, 0.4, 0]}
      />
    </>
  );
}
