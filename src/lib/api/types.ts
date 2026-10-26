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

// ---------- The Vault ----------

/** One node of the group tree: an official category (parentId null) or a sub-group under one. */
export interface VaultGroup {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  parentId: number | null;
  /** True for the five official categories: never deletable, renamable or movable. */
  isOfficial: boolean;
  /** Products in this group, drafts included; a top-level group also counts its sub-groups. */
  productCount: number;
  children: VaultGroup[];
}

export type SectionType = "text" | "bullets" | "faq" | "image";

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface ProductSection {
  id: string;
  type: SectionType;
  title?: string;
  body?: string;
  items?: string[];
  faq?: FaqEntry[];
  imageUrl?: string;
  alt?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  /** US cents; 0 means free. */
  priceCents: number;
  salePriceCents: number | null;
  format: string;
  delivery: string;
  destination: string | null;
  forWho: string;
  included: string[];
  symbol: string | null;
  coverImageUrl: string | null;
  galleryImages: string[];
  sections: ProductSection[];
  fileKey: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  categoryId: number;
  category: { id: number; slug: string; name: string; parentId: number | null };
  status: PublishStatus;
  publishedAt: string | null;
  isFeatured: boolean;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUpload {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
  publicUrl?: string;
  expiresInSeconds: number;
}

// ---------- Site pages, forms and settings ----------

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: PublishStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FreeResource {
  id: string;
  title: string;
  description: string;
  type: string;
  destination: string | null;
  url: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  source: string | null;
  isSubscribed: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SiteSetting {
  key: "contactEmail" | "linkverseUrl" | "whatsappUrl" | "telegramUrl";
  label: string;
  /** `email` or `url`. */
  kind: string;
  description: string;
  value: string | null;
}
