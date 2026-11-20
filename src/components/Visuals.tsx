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

export function DefenseNetwork() {
  return (
    <div className="defense-network" aria-label="Live defense network">
      <div className="defense-network-head"><span>Live defense network</span><strong><i /> ALL SYSTEMS LINKED</strong></div>
      <svg viewBox="0 0 620 390" role="img" aria-label="Water infrastructure network with an intercepted threat path">
        <g className="network-grid">
          {[80, 150, 220, 290].map((y) => <line key={y} x1="40" y1={y} x2="580" y2={y} />)}
          {[100, 200, 300, 400, 500].map((x) => <line key={x} x1={x} y1="40" x2={x} y2="340" />)}
        </g>
        <g className="network-links">
          <path d="M90 210 C145 210 148 114 220 114 S300 185 340 185" />
          <path d="M90 210 C160 210 150 280 230 280 S290 220 340 220" />
          <path d="M340 185 C390 185 408 105 475 105" />
          <path d="M340 220 C405 220 410 290 505 290" />
          <path d="M475 105 C510 145 520 220 505 290" />
        </g>
        <path className="network-threat-path" d="M590 55 C530 82 487 128 445 174 S390 208 340 202" />
        <g className="network-nodes">
          <g transform="translate(90 210)"><circle r="21" /><circle r="7" /><text x="0" y="38">INTAKE</text></g>
          <g transform="translate(220 114)"><circle r="18" /><circle r="6" /><text x="0" y="34">TREATMENT</text></g>
          <g transform="translate(230 280)"><circle r="18" /><circle r="6" /><text x="0" y="34">FILTRATION</text></g>
          <g className="network-core" transform="translate(340 202)"><circle r="32" /><circle r="12" /><text x="0" y="52">CONTROL CORE</text></g>
          <g transform="translate(475 105)"><circle r="20" /><circle r="7" /><text x="0" y="37">RESERVOIRS</text></g>
          <g transform="translate(505 290)"><circle r="20" /><circle r="7" /><text x="0" y="37">DISTRIBUTION</text></g>
        </g>
        <g className="network-threat" transform="translate(445 174)"><circle r="16" /><path d="M-5 -5L5 5M5 -5L-5 5" /><text x="24" y="4">BLOCKED</text></g>
        <circle className="network-pulse network-pulse-a" r="4"><animateMotion dur="4s" repeatCount="indefinite" path="M90 210 C145 210 148 114 220 114 S300 185 340 185" /></circle>
        <circle className="network-pulse network-pulse-b" r="4"><animateMotion dur="5s" repeatCount="indefinite" path="M340 220 C405 220 410 290 505 290" /></circle>
      </svg>
      <div className="defense-network-foot"><span><i className="is-cyan" />NORMAL FLOW</span><span><i className="is-red" />THREAT INTERCEPTED</span><b>LATENCY 28 MS</b></div>
    </div>
  );
}
