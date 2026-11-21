const metal = { color: "#263d42", metalness: 0.78, roughness: 0.3 } as const;
const darkMetal = { color: "#14272b", metalness: 0.72, roughness: 0.38 } as const;

function ChemicalTank({ position }: { position: [number, number, number] }) {
  return <group position={position}>
    <mesh castShadow position={[0, .75, 0]}><cylinderGeometry args={[.42, .42, 1.5, 20]} /><meshStandardMaterial {...metal} /></mesh>
    <mesh castShadow position={[0, 1.53, 0]}><sphereGeometry args={[.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial {...metal} /></mesh>
    <mesh position={[0, .78, .43]}><boxGeometry args={[.22, .34, .05]} /><meshStandardMaterial color="#3a656b" emissive="#1cb5be" emissiveIntensity={.18} /></mesh>
    <mesh position={[0, .13, 0]}><cylinderGeometry args={[.55, .55, .12, 20]} /><meshStandardMaterial {...darkMetal} /></mesh>
  </group>;
}

function TransformerBank() {
  return <group position={[-3.7, 0, 6.1]}>
    {[-.7, 0, .7].map((x) => <group key={x} position={[x, 0, 0]}>
      <mesh castShadow position={[0, .55, 0]}><boxGeometry args={[.55, .95, .7]} /><meshStandardMaterial {...darkMetal} /></mesh>
      {[-.18, 0, .18].map((cap) => <mesh key={cap} position={[cap, 1.12, 0]}><cylinderGeometry args={[.06, .08, .25, 10]} /><meshStandardMaterial color="#42636a" metalness={.8} /></mesh>)}
    </group>)}
    <mesh receiveShadow position={[0, .05, 0]}><boxGeometry args={[2.5, .1, 1.2]} /><meshStandardMaterial color="#0c181b" /></mesh>
  </group>;
}

function PipeRack() {
  const frames = [-1.8, -.6, .6, 1.8];
  return <group position={[1.3, 0, -6.5]}>
    {frames.map((x) => <group key={x} position={[x, 0, 0]}>
      {[-.65, .65].map((z) => <mesh key={z} castShadow position={[0, .75, z]}><boxGeometry args={[.1, 1.5, .1]} /><meshStandardMaterial {...metal} /></mesh>)}
      <mesh castShadow position={[0, 1.42, 0]}><boxGeometry args={[.12, .1, 1.5]} /><meshStandardMaterial {...metal} /></mesh>
    </group>)}
    {[-.42, 0, .42].map((z, index) => <mesh key={z} castShadow position={[0, 1.1 + index * .16, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.09, .09, 4.2, 12]} /><meshStandardMaterial color={index === 1 ? "#246d74" : "#314a4f"} metalness={.82} roughness={.24} /></mesh>)}
  </group>;
}

function ElectricalCabinets() {
  return <group position={[2.8, 0, 7]}>
    {[-.65, 0, .65].map((x) => <mesh key={x} castShadow position={[x, .72, 0]}><boxGeometry args={[.52, 1.4, .45]} /><meshStandardMaterial {...darkMetal} /></mesh>)}
    {[-.65, 0, .65].map((x) => <mesh key={`light-${x}`} position={[x, 1.08, .235]}><boxGeometry args={[.08, .08, .025]} /><meshBasicMaterial color="#53d8d6" /></mesh>)}
  </group>;
}

function MaintenanceYard() {
  return <group position={[10.8, 0, -4.7]}>
    {[-.65, .65].map((x) => <mesh key={x} castShadow position={[x, .35, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.34, .11, 10, 20]} /><meshStandardMaterial {...metal} /></mesh>)}
    <mesh castShadow position={[0, .18, .9]}><boxGeometry args={[1.7, .35, .85]} /><meshStandardMaterial {...darkMetal} /></mesh>
    <mesh position={[0, .39, .9]}><boxGeometry args={[1.45, .08, .62]} /><meshStandardMaterial color="#31555b" /></mesh>
  </group>;
}

function PerimeterLights() {
  const positions: Array<[number, number, number]> = [[-12, 0, -7], [-6, 0, -7], [1, 0, -9], [8, 0, -8], [15, 0, -6], [-11, 0, 7], [7, 0, 8], [15, 0, 6]];
  return <>{positions.map(([x, y, z]) => <group key={`${x}-${z}`} position={[x, y, z]}>
    <mesh castShadow position={[0, 1.35, 0]}><cylinderGeometry args={[.045, .06, 2.7, 8]} /><meshStandardMaterial {...metal} /></mesh>
    <mesh position={[0, 2.73, 0]}><boxGeometry args={[.28, .11, .28]} /><meshBasicMaterial color="#89e4df" /></mesh>
  </group>)}</>;
}

function SafetyBarriers() {
  return <group position={[13.1, 0, 3.6]}>
    {[-1.2, -.4, .4, 1.2].map((x) => <mesh key={x} castShadow position={[x, .35, 0]}><boxGeometry args={[.12, .7, .12]} /><meshStandardMaterial color="#806f3e" metalness={.55} /></mesh>)}
    <mesh position={[0, .58, 0]}><boxGeometry args={[2.55, .08, .1]} /><meshStandardMaterial color="#b39a52" metalness={.5} /></mesh>
  </group>;
}

export function FacilityDetails() {
  return <group>
    <group position={[-8.8, 0, 5.1]}><ChemicalTank position={[-.55, 0, 0]} /><ChemicalTank position={[.55, 0, 0]} /></group>
    <TransformerBank />
    <PipeRack />
    <ElectricalCabinets />
    <MaintenanceYard />
    <PerimeterLights />
    <SafetyBarriers />
  </group>;
}

