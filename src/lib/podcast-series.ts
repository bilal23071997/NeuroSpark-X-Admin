export interface PodcastSeries {
  slug: string;
  name: string;
}

// The podcast series are hardcoded on the website, not managed through the API.
// This list MUST match the website's list (slugs and names): an episode only
// stores the series slug, and the website groups episodes by it. Add a series
// here and in the website in the same change.
export const podcastSeries: PodcastSeries[] = [
  { slug: "sovereignty-sessions", name: "The Sovereignty Sessions" },
  { slug: "symbolic-systems", name: "Symbolic Systems" },
  { slug: "build-with-ai", name: "Build with AI" },
];

export function getSeriesName(slug: string) {
  return podcastSeries.find((series) => series.slug === slug)?.name ?? slug;
}
