const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(iso: string | null | undefined) {
  return iso ? dateFormat.format(new Date(iso)) : "—";
}

/** Turns "" into undefined so optional API fields are left out instead of sent empty. */
export function emptyToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
