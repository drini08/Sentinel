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
        d="M51.5 23.5c-9-5.5-25.3-5-33.4 1.1-7.1 5.4-4.8 11.9 8.8 15.3 14.4 3.6 21.3 7.3 17.5 13.9-4.3 7.3-19.7 8.1-31.5-.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
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
