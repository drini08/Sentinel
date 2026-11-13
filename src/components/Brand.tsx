export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 32" fill="none" aria-hidden="true">
      <path d="M14 1.8 25 6v8.1c0 7.1-4.6 12.8-11 16.1C7.6 26.9 3 21.2 3 14.1V6l11-4.2Z" stroke="currentColor" strokeWidth="2.6" />
      <path d="M14 5.6 21.5 8.5v5.4c0 5.2-3.1 9.4-7.5 12-4.4-2.6-7.5-6.8-7.5-12V8.5L14 5.6Z" fill="currentColor" fillOpacity=".08" />
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
