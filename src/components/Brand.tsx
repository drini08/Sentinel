export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 72" fill="none" aria-hidden="true">
      <path
        d="M32 4.5 57 18.5v18.2c0 14.9-10.6 26.2-25 32.1C17.6 62.9 7 51.6 7 36.7V18.5l25-14Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M52.5 23.2C43 17.5 26 18 17.4 24.2c-7.7 5.6-5.3 12.7 8.8 16.1 15.1 3.7 22.5 7.6 18.5 14.6-4.5 7.8-20.8 8.6-33.2-.6"
        stroke="currentColor"
        strokeWidth="7"
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
