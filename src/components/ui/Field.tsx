"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

const control =
  "w-full rounded-lg border bg-void-black px-3 py-2 text-sm text-soft-white placeholder:text-soft-white/50 transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const controlBorder = (error?: string) =>
  error ? "border-danger/70" : "border-soft-white/15 hover:border-soft-white/30";

interface ShellProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

function FieldShell({ id, label, required, hint, error, children }: ShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-soft-white">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-soft-white/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({
  label,
  hint,
  error,
  className = "",
  required,
  ...props
}: FieldProps & ComponentProps<"input">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${control} ${controlBorder(error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className = "",
  required,
  ...props
}: FieldProps & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${control} ${controlBorder(error)} min-h-24 ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className = "",
  required,
  children,
  ...props
}: FieldProps & ComponentProps<"select">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${control} ${controlBorder(error)} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  hint,
  className = "",
  ...props
}: { label: string; hint?: string } & ComponentProps<"input">) {
  const id = useId();
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-soft-white/30 bg-void-black accent-electric-indigo"
        {...props}
      />
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium text-soft-white">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-soft-white/60">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** A bare labelled select for filter bars (smaller, no error/hint). */
export function FilterSelect({
  label,
  className = "",
  children,
  ...props
}: { label: string } & ComponentProps<"select">) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-soft-white/70">
        {label}
      </label>
      <select
        id={id}
        className={`rounded-lg border border-soft-white/15 bg-void-black px-3 py-2 text-sm text-soft-white hover:border-soft-white/30 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
