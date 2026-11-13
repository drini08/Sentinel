import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end lg:mb-10">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 text-3xl font-medium tracking-[-0.035em] text-white sm:text-[40px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary sm:text-[15px]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: "light" | "neutral" | "muted" }) {
  return <span className={`status status-${tone}`}><i />{children}</span>;
}

export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="panel min-h-[120px] p-6 lg:p-7">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="text-[32px] font-medium tracking-[-0.04em] text-white">{value}</div>
        {detail && <div className="font-mono text-[11px] text-muted">{detail}</div>}
      </div>
    </div>
  );
}
