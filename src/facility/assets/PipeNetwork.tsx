import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Mesh, Vector3 } from "three";
import type { FacilityConnection, FacilitySnapshot } from "../types";

function FlowPulse({ start, end, danger }: { start: Vector3; end: Vector3; danger: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const progress = (clock.elapsedTime * 0.22) % 1;
    ref.current.position.lerpVectors(start, end, progress);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08, 10, 10]} />
      <meshBasicMaterial color={danger ? "#ff5266" : "#78f5ee"} />
    </mesh>
  );
}

function Pipe({ connection, positions, reducedMotion, danger }: {
  connection: FacilityConnection;
  positions: Map<string, Vector3>;
  reducedMotion: boolean;
  danger: boolean;
}) {
  const start = positions.get(connection.source);
  const end = positions.get(connection.target);
  if (!start || !end) return null;
  const lift = Math.max(start.y, end.y) + 0.18;
  const points = [
    start.clone().setY(lift),
    new Vector3((start.x + end.x) / 2, lift, start.z),
    new Vector3((start.x + end.x) / 2, lift, end.z),
    end.clone().setY(lift),
  ];
  const color = danger ? "#ff465d" : connection.active ? "#27cbd4" : "#263c40";
  return (
    <group>
      <Line points={points} color={color} lineWidth={danger ? 2.5 : 1.6} transparent opacity={connection.active ? 0.85 : 0.42} />
      {connection.active && !reducedMotion && <FlowPulse start={start} end={end} danger={danger} />}
    </group>
  );
}

export function PipeNetwork({ snapshot, reducedMotion, alertAssetId }: {
  snapshot: FacilitySnapshot;
  reducedMotion: boolean;
  alertAssetId: string | null;
}) {
  const positions = useMemo(
    () => new Map(snapshot.assets.map((asset) => [asset.id, new Vector3(...asset.position)])),
    [snapshot.assets],
  );
  return (
    <group position={[0, 0.16, 0]}>
      {snapshot.connections.map((connection) => (
        <Pipe
          key={connection.id}
          connection={connection}
          positions={positions}
          reducedMotion={reducedMotion}
          danger={Boolean(alertAssetId && (connection.source === alertAssetId || connection.target === alertAssetId))}
        />
      ))}
    </group>
  );
}
