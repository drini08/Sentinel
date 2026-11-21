export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M5 30 32 11l27 19-9-3.5L32 15.8 14 26.5 5 30Z"
        fill="currentColor"
      />
      <path
        d="M5 34c7.2 10.9 16.2 17.2 27 19 10.8-1.8 19.8-8.1 27-19l-9 4.5C44.8 44.6 38.8 48 32 49.3 25.2 48 19.2 44.6 14 38.5L5 34Z"
        fill="currentColor"
      />
      <circle
        cx="32"
        cy="32"
        r="6.5"
        stroke="currentColor"
        strokeWidth="3"
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
