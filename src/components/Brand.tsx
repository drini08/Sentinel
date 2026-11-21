export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 36" fill="none" aria-hidden="true">
      <path
        d="M16 2.5 28 7v9.2c0 8-5.1 14.1-12 17.3C9.1 30.3 4 24.2 4 16.2V7l12-4.5Z"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
      <path
        d="M22.9 10.7c-1.8-1.4-4.1-2.2-6.7-2.2-3.7 0-6.5 1.7-6.5 4.2 0 2.3 2.2 3.3 6.5 4.4 4.4 1.1 6.4 2.2 6.4 4.6 0 2.7-2.8 4.7-6.8 4.7-2.8 0-5.3-.9-7.2-2.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
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
