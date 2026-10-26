import type { SectionType } from "@/lib/api/types";

/** The five official ecosystem destinations, in their fixed order (same as the website). */
export const destinations = [
  { slug: "youniversity", name: "Youniversity™" },
  { slug: "soulmap", name: "SoulMap™" },
  { slug: "studio", name: "Studio™" },
  { slug: "digital-intelligence-labs", name: "Digital Intelligence Labs™" },
  { slug: "pulse", name: "Pulse™" },
];

/** Symbol art the website can draw on a product cover when there is no cover image. */
export const productSymbols = ["star", "wave", "nodes", "zodiac", "cards", "spark", "compass", "orbit"];

export const sectionTypes: { type: SectionType; label: string; hint: string }[] = [
  { type: "text", label: "Text", hint: "A heading and paragraphs." },
  { type: "bullets", label: "Bullet list", hint: "A short list of points." },
  { type: "faq", label: "FAQ", hint: "Questions and answers." },
  { type: "image", label: "Image", hint: "One image with a description." },
];

export function sectionLabel(type: SectionType) {
  return sectionTypes.find((entry) => entry.type === type)?.label ?? type;
}

export function getDestinationName(slug: string | null) {
  return destinations.find((destination) => destination.slug === slug)?.name ?? slug ?? "—";
}

/** 1900 -> "$19.00". */
export function formatPrice(cents: number) {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
}

/** 1900 -> "19.00" (for a form field). */
export function centsToDollars(cents: number | null | undefined) {
  return cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);
}

/** "19.5" -> 1950. Callers validate the format first (see PRICE_PATTERN). */
export function dollarsToCents(dollars: string) {
  return Math.round(Number(dollars) * 100);
}

export const PRICE_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
