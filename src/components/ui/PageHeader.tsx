import type { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      {/* React hoists <title> into <head>, so every screen gets its own tab title. */}
      <title>{`${title} | NeuroSpark X Admin`}</title>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-soft-white/70">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-soft-white/10 bg-panel ${className}`}>{children}</div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <p className="font-heading text-base font-semibold">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-sm text-soft-white/70">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
