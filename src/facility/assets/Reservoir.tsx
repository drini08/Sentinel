import { Html, useCursor } from "@react-three/drei";
import { useState } from "react";
import type { FacilityAsset } from "../types";

type AssetProps = {
  asset: FacilityAsset;
  selected: boolean;
  alert: boolean;
  onSelect(assetId: string): void;
};

export function Reservoir({ asset, selected, alert, onSelect }: AssetProps) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const level = Number(asset.metrics.level_percent ?? 0);
  const waterHeight = Math.max(0.16, (level / 100) * 1.45);
  const accent = alert ? "#ff4f63" : selected || hovered ? "#7ef7f0" : "#337980";

  return (
    <group
      position={asset.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(asset.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
        <cylinderGeometry args={[1.5, 1.62, 1.7, 48, 1, true]} />
        <meshStandardMaterial color="#28474d" metalness={0.62} roughness={0.36} emissive={accent} emissiveIntensity={0.13} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <torusGeometry args={[1.56, 0.045, 10, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.8} />
      </mesh>
      <mesh position={[0, 0.08 + waterHeight / 2, 0]}>
        <cylinderGeometry args={[1.47, 1.47, waterHeight, 48]} />
        <meshPhysicalMaterial
          color="#1199b1"
          emissive="#20d8e2"
          emissiveIntensity={0.34}
          transparent
          opacity={0.74}
          roughness={0.16}
          metalness={0.08}
        />
      </mesh>
      <mesh castShadow position={[0, 1.78, 0]}>
        <cylinderGeometry args={[1.64, 1.64, 0.12, 48]} />
        <meshStandardMaterial color="#3c5b61" metalness={0.66} roughness={0.32} />
      </mesh>
      <Html center position={[0, 2.3, 0]} distanceFactor={13}>
        <button type="button" className={`facility-label ${selected ? "facility-label-selected" : ""}`} onClick={() => onSelect(asset.id)}>
          <span>{asset.name}</span>
          <strong>{level.toFixed(0)}%</strong>
        </button>
      </Html>
    </group>
  );
}
