export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 72" fill="none" aria-hidden="true">
      <path
        d="M32 4.5 57 18.5v18.2c0 14.9-10.6 26.2-25 32.1C17.6 62.9 7 51.6 7 36.7V18.5l25-14Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M32 17.5c-2.8 4.5-11 14.2-11 23a11 11 0 0 0 22 0c0-8.8-8.2-18.5-11-23Z"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity=".06"
      />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-3 text-[15px] font-semibold tracking-[0.08em] text-white">
      <Mark />
      <span>SENTINEL</span>
    </div>
  );
}
