export function Terrain() {
  const lines = Array.from({ length: 21 }, (_, row) => {
    const points = Array.from({ length: 42 }, (_, col) => {
      const x = col * 18;
      const center = 450 + Math.sin(col * 0.17) * 60;
      const ridge = Math.exp(-Math.pow((x - center) / 205, 2));
      const second = 0.55 * Math.exp(-Math.pow((x - 250) / 125, 2));
      const y = 32 + row * 6 + (1 - ridge) * 55 + Math.sin(col * 0.6 + row * 0.32) * 3 - second * 32;
      return `${x},${y}`;
    }).join(" ");
    return <polyline key={row} points={points} fill="none" stroke="currentColor" strokeWidth="0.55" opacity={0.14 + row * 0.017} />;
  });

  return (
    <div className="pointer-events-none absolute inset-x-0 -top-6 h-56 overflow-hidden text-white [mask-image:linear-gradient(to_right,transparent,black_25%,black_85%,transparent)]">
      <svg viewBox="0 0 740 220" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{lines}</svg>
    </div>
  );
}

export function Orbit() {
  return (
    <div className="orbit" aria-hidden="true">
      <div className="orbit-ring orbit-ring-back" />
      <div className="orbit-axis orbit-axis-x" />
      <div className="orbit-axis orbit-axis-y" />
      <div className="orbit-node orbit-node-a" />
      <div className="orbit-node orbit-node-b" />
      <div className="orbit-node orbit-node-c" />
      <div className="orbit-ring orbit-ring-front" />
    </div>
  );
}
