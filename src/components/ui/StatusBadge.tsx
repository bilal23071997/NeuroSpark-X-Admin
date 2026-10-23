type Tone = "neutral" | "teal" | "amber" | "violet" | "red";

const tones: Record<Tone, string> = {
  neutral: "border-soft-white/20 text-soft-white/70",
  teal: "border-teal/40 bg-teal/10 text-teal",
  amber: "border-amber-gold/40 bg-amber-gold/10 text-amber-gold",
  violet: "border-deep-violet/40 bg-deep-violet/10 text-violet-text",
  red: "border-danger/40 bg-danger/10 text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PublishBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? <Badge tone="teal">Published</Badge> : <Badge tone="amber">Draft</Badge>;
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? <Badge tone="teal">Active</Badge> : <Badge tone="red">Deactivated</Badge>;
}
