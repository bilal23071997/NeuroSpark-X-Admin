// Shapes returned by the NeuroSpark X API (see the API repo's /docs).

export type RoleName = "admin" | "editor";
export type PublishStatus = "draft" | "published";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: RoleName;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export interface Role {
  id: number;
  name: RoleName;
  description: string;
}

/** A staff account as returned by /admin/users (the role is an object here). */
export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Niche {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  nicheId: string;
  niche: Niche;
  status: PublishStatus;
  publishedAt: string | null;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  slug: string;
  /** Slug of a podcast series; the series list is hardcoded (src/lib/podcast-series.ts). */
  series: string;
  episodeNumber: number;
  title: string;
  description: string;
  duration: string | null;
  youtubeUrl: string | null;
  showNotes: string[];
  status: PublishStatus;
  publishedAt: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}
