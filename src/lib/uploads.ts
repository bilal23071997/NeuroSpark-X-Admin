import { isAxiosError } from "axios";
import { api } from "./api/client";
import { getErrorMessage } from "./api/errors";
import type { PresignedUpload } from "./api/types";

export type UploadKind = "image" | "product-file";

const MB = 1024 * 1024;

// The same limits the API enforces (storage/storage.service.ts), so a bad file is refused before it is sent.
export const UPLOAD_LIMITS: Record<UploadKind, { contentTypes: string[]; maxBytes: number; label: string }> = {
  image: {
    contentTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    maxBytes: 5 * MB,
    label: "PNG, JPEG, WebP or GIF, up to 5 MB",
  },
  "product-file": {
    contentTypes: [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/epub+zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/csv",
      "audio/mpeg",
      "audio/mp4",
      "audio/x-m4a",
      "audio/wav",
      "audio/x-wav",
      "video/mp4",
    ],
    maxBytes: 1000 * MB,
    label: "PDF, ZIP, EPUB, Word/Excel/PowerPoint, CSV, MP3, M4A, WAV or MP4, up to 1 GB",
  },
};

/** Browsers leave `file.type` empty for some formats, so fall back to the extension. */
const TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  epub: "application/epub+zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  mp3: "audio/mpeg",
  m4a: "audio/x-m4a",
  wav: "audio/wav",
  mp4: "video/mp4",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export function contentTypeOf(file: Pick<File, "name" | "type">) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? "";
}

/** A message when the file isn't allowed, otherwise null. */
export function validateUpload(kind: UploadKind, file: Pick<File, "name" | "type" | "size">): string | null {
  const limits = UPLOAD_LIMITS[kind];
  if (!limits.contentTypes.includes(contentTypeOf(file))) return `That file type isn't allowed. Use ${limits.label}.`;
  if (file.size > limits.maxBytes) return `That file is too large. Use ${limits.label}.`;
  if (file.size === 0) return "That file is empty.";
  return null;
}

/** Thrown when the API has no bucket configured (HTTP 503). */
export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not set up yet — ask the developer to configure it.");
    this.name = "StorageNotConfiguredError";
  }
}

export interface UploadResult {
  /** The object key; for `product-file` this is saved as the product's fileKey. */
  key: string;
  /** Present for images: the public URL to store on the product. */
  publicUrl?: string;
}

/**
 * Uploads straight to the bucket: ask the API for a short-lived signed URL,
 * then PUT the file there. The PUT deliberately does not go through the shared
 * Axios instance, which would attach our Bearer token to a third-party host.
 */
export async function uploadFile(kind: UploadKind, file: File): Promise<UploadResult> {
  const problem = validateUpload(kind, file);
  if (problem) throw new Error(problem);

  let presigned: PresignedUpload;
  try {
    ({ data: presigned } = await api.post<PresignedUpload>("/admin/uploads/presign", {
      kind,
      fileName: file.name,
      contentType: contentTypeOf(file),
      sizeBytes: file.size,
    }));
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 503) throw new StorageNotConfiguredError();
    throw new Error(getErrorMessage(error));
  }

  // The browser sets Content-Length itself (it is a forbidden header name), so only send the rest.
  const headers = Object.fromEntries(
    Object.entries(presigned.headers).filter(([name]) => name.toLowerCase() !== "content-length"),
  );

  let response: Response;
  try {
    response = await fetch(presigned.uploadUrl, { method: presigned.method, headers, body: file });
  } catch {
    throw new Error(
      "The upload was blocked before it reached storage. The bucket may need a CORS rule that allows this site to PUT files.",
    );
  }
  if (!response.ok) throw new Error(`Storage refused the upload (error ${response.status}).`);

  return { key: presigned.key, publicUrl: presigned.publicUrl };
}
