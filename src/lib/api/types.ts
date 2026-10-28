// Shapes returned by the NeuroSpark X API (see the API repo's /docs).

export type RoleName = "admin" | "editor";
export type PublishStatus = "draft" | "published";

export interface SessionUser {
  Id: string;
  Email: string;
  Name: string;
  Role: RoleName;
}

export interface Tokens {
  AccessToken: string;
  RefreshToken: string;
  User: SessionUser;
}

export interface Role {
  Id: number;
  Name: RoleName;
  Description: string;
}

/** A staff account as returned by /admin/users (the role is an object here). */
export interface StaffUser {
  Id: string;
  Email: string;
  Name: string;
  Role: Role;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Niche {
  Id: string;
  Slug: string;
  Name: string;
  Description: string;
  SortOrder: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Article {
  Id: string;
  Slug: string;
  Title: string;
  Excerpt: string;
  Body: string[];
  NicheId: string;
  Niche: Niche;
  Status: PublishStatus;
  PublishedAt: string | null;
  IsFeatured: boolean;
  SeoTitle: string | null;
  SeoDescription: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Episode {
  Id: string;
  Slug: string;
  /** Slug of a podcast series; the series list is hardcoded (src/lib/podcast-series.ts). */
  Series: string;
  EpisodeNumber: number;
  Title: string;
  Description: string;
  Duration: string | null;
  YoutubeUrl: string | null;
  ShowNotes: string[];
  Status: PublishStatus;
  PublishedAt: string | null;
  IsFeatured: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

// ---------- The Vault ----------

/** One node of the group tree: an official category (parentId null) or a sub-group under one. */
export interface VaultGroup {
  Id: number;
  Slug: string;
  Name: string;
  Description: string;
  SortOrder: number;
  ParentId: number | null;
  /** True for the five official categories: never deletable, renamable or movable. */
  IsOfficial: boolean;
  /** Products in this group, drafts included; a top-level group also counts its sub-groups. */
  ProductCount: number;
  Children: VaultGroup[];
}

export type SectionType = "text" | "bullets" | "faq" | "image";

export interface FaqEntry {
  Question: string;
  Answer: string;
}

export interface ProductSection {
  Id: string;
  Type: SectionType;
  Title?: string;
  Body?: string;
  Items?: string[];
  Faq?: FaqEntry[];
  ImageUrl?: string;
  Alt?: string;
}

export interface Product {
  Id: string;
  Slug: string;
  Name: string;
  Summary: string;
  Description: string;
  /** US cents; 0 means free. */
  PriceCents: number;
  SalePriceCents: number | null;
  Format: string;
  Delivery: string;
  Destination: string | null;
  ForWho: string;
  Included: string[];
  Symbol: string | null;
  CoverImageUrl: string | null;
  GalleryImages: string[];
  Sections: ProductSection[];
  FileKey: string | null;
  FileName: string | null;
  FileSizeBytes: number | null;
  CategoryId: number;
  Category: { Id: number; Slug: string; Name: string; ParentId: number | null };
  Status: PublishStatus;
  PublishedAt: string | null;
  IsFeatured: boolean;
  IsPopular: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface PresignedUpload {
  UploadUrl: string;
  Method: "PUT";
  Headers: Record<string, string>;
  Key: string;
  PublicUrl?: string;
  ExpiresInSeconds: number;
}

// ---------- Site pages, forms and settings ----------

export interface SitePage {
  Id: string;
  Slug: string;
  Title: string;
  Body: string;
  Status: PublishStatus;
  PublishedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface FreeResource {
  Id: string;
  Title: string;
  Description: string;
  Type: string;
  Destination: string | null;
  Url: string;
  IsPublished: boolean;
  SortOrder: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface NewsletterSubscriber {
  Id: string;
  Email: string;
  Source: string | null;
  IsSubscribed: boolean;
  SubscribedAt: string;
  UnsubscribedAt: string | null;
}

export interface ContactMessage {
  Id: string;
  Name: string;
  Email: string;
  Subject: string | null;
  Message: string;
  IsRead: boolean;
  CreatedAt: string;
}

export interface SiteSetting {
  Key: "contactEmail" | "linkverseUrl" | "whatsappUrl" | "telegramUrl";
  Label: string;
  /** `email` or `url`. */
  Kind: string;
  Description: string;
  Value: string | null;
}

export type PaymentMode = "test" | "live";

export interface PaymentKeyStatus {
  /** Masked, e.g. `sk_test_••••4f2a`; null when none is saved. */
  SecretKey: string | null;
  WebhookSecretSet: boolean;
  /** Masked, e.g. pk_test_••••4f2a; null when none is saved. */
  PublishableKey: string | null;
}

export interface PaymentSettings {
  Mode: PaymentMode;
  Test: PaymentKeyStatus;
  Live: PaymentKeyStatus;
  Enabled: boolean;
  WebhookUrl: string;
  FromEnvironment: boolean;
  CanStoreKeys: boolean;
}

export interface PaymentTestResult {
  Ok: boolean;
  Mode: PaymentMode;
  Message: string;
}

export type OrderStatus = "pending" | "paid" | "expired" | "refunded";

export interface Order {
  Id: string;
  Number: string;
  Status: OrderStatus;
  Email: string | null;
  TotalCents: number;
  Currency: string;
  Mode: PaymentMode;
  StripeSessionId: string;
  StripePaymentIntentId: string | null;
  CreatedAt: string;
  PaidAt: string | null;
  Items: { Id: string; Name: string; UnitPriceCents: number }[];
}
