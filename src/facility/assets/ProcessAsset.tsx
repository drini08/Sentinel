import { Html, useCursor } from "@react-three/drei";
import { useState, type ReactNode } from "react";
import type { FacilityAsset } from "../types";

type AssetProps = {
  asset: FacilityAsset;
  selected: boolean;
  alert: boolean;
  onSelect(assetId: string): void;
};

function Building({ width = 2.2, height = 1.5, depth = 1.7 }: { width?: number; height?: number; depth?: number }) {
  return (
    <>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#29454b" metalness={0.5} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0, height + 0.1, 0]}>
        <boxGeometry args={[width + 0.18, 0.18, depth + 0.18]} />
        <meshStandardMaterial color="#42666d" metalness={0.68} roughness={0.32} />
      </mesh>
    </>
  );
}

function geometryFor(asset: FacilityAsset): ReactNode {
  switch (asset.asset_type) {
    case "clarifier":
      return (
        <>
          <mesh castShadow receiveShadow position={[0, 0.3, 0]}><cylinderGeometry args={[1.22, 1.22, 0.55, 40]} /><meshStandardMaterial color="#1a3134" metalness={0.55} roughness={0.4} /></mesh>
          <mesh position={[0, 0.61, 0]}><cylinderGeometry args={[1.08, 1.08, 0.08, 40]} /><meshStandardMaterial color="#168ba2" emissive="#21d9e1" emissiveIntensity={0.22} /></mesh>
          <mesh position={[0, 0.72, 0]}><boxGeometry args={[2.2, 0.08, 0.09]} /><meshStandardMaterial color="#6d8588" metalness={0.8} /></mesh>
        </>
      );
    case "pump_station":
      return (
        <>
          <Building width={2.7} height={1.35} depth={1.8} />
          {[-0.8, 0, 0.8].map((x) => <mesh key={x} castShadow position={[x, 0.28, -1.12]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.24, 0.24, 0.5, 20]} /><meshStandardMaterial color="#2d6870" metalness={0.75} roughness={0.25} /></mesh>)}
        </>
      );
    case "valve":
      return (
        <>
          <mesh castShadow position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.13, 14, 32]} /><meshStandardMaterial color="#2d555a" metalness={0.8} roughness={0.26} /></mesh>
          <mesh castShadow position={[0, 0.35, 0]}><cylinderGeometry args={[0.16, 0.16, 1.2, 16]} /><meshStandardMaterial color="#5a7477" metalness={0.8} /></mesh>
        </>
      );
    case "intake":
      return (
        <>
          <mesh receiveShadow position={[0, 0.08, 0]}><boxGeometry args={[3, 0.15, 2.3]} /><meshStandardMaterial color="#0f282d" /></mesh>
          <mesh position={[0, 0.19, 0]}><boxGeometry args={[2.65, 0.12, 1.95]} /><meshStandardMaterial color="#0c8aa1" emissive="#1cd9e2" emissiveIntensity={0.28} /></mesh>
          <mesh castShadow position={[0.85, 0.7, 0]}><boxGeometry args={[0.24, 1.3, 2.1]} /><meshStandardMaterial color="#314a4e" metalness={0.72} /></mesh>
        </>
      );
    case "outlet":
      return (
        <>
          <mesh castShadow position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.45, 0.45, 2.4, 24]} /><meshStandardMaterial color="#1d464c" metalness={0.75} roughness={0.25} /></mesh>
          <mesh position={[1.25, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.5, 0.08, 12, 28]} /><meshStandardMaterial color="#54dbe0" emissive="#54dbe0" emissiveIntensity={0.8} /></mesh>
        </>
      );
    case "power":
      return <Building width={1.8} height={1.05} depth={1.25} />;
    case "dosing":
      return (
        <>
          <Building width={1.9} height={1.25} depth={1.45} />
          {[-0.45, 0.45].map((x) => <mesh key={x} castShadow position={[x, 1.75, 0]}><cylinderGeometry args={[0.27, 0.31, 0.9, 20]} /><meshStandardMaterial color="#294b50" metalness={0.65} /></mesh>)}
        </>
      );
    default:
      return <Building width={asset.asset_type === "filter" ? 3.3 : 2.2} height={asset.asset_type === "control" ? 1.7 : 1.35} depth={1.8} />;
  }
}

export function ProcessAsset({ asset, selected, alert, onSelect }: AssetProps) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const accent = alert ? "#ff4f63" : selected || hovered ? "#79eee7" : "#306a71";

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
      {geometryFor(asset)}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.45, 1.52, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={selected || hovered || alert ? 0.95 : 0.25} />
      </mesh>
      {(selected || hovered || alert) && <Html center position={[0, asset.asset_type === "control" ? 2.4 : 2.0, 0]} distanceFactor={14} wrapperClass="facility-label-layer">
        <button type="button" className={`facility-label ${selected ? "facility-label-selected" : ""}`} onClick={() => onSelect(asset.id)}>
          <span>{asset.name}</span>
          <strong>{asset.status.toUpperCase()}</strong>
        </button>
      </Html>}
    </group>
  );
}
