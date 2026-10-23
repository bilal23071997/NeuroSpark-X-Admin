import type { ReactNode } from "react";

type Tone = "error" | "success" | "info" | "warning";

const tones: Record<Tone, string> = {
  error: "border-danger/40 bg-danger/10 text-[#fca5a5]",
  success: "border-teal/40 bg-teal/10 text-teal",
  info: "border-electric-indigo/40 bg-electric-indigo/10 text-indigo-text",
  warning: "border-amber-gold/40 bg-amber-gold/10 text-amber-gold",
};

export default function Alert({
  tone = "error",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
