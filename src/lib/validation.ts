import { z } from "zod";

// Kept identical to the API's rules (content/helpers.ts) so forms fail before the request does.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MESSAGE = "Use lowercase letters, numbers and single hyphens, e.g. my-article.";

export const YOUTUBE_URL_PATTERN =
  /^https:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)[\w-]{11}(?:[&?#].*)?$/;
export const YOUTUBE_MESSAGE =
  "Enter a YouTube video link, e.g. https://www.youtube.com/watch?v=… or https://youtu.be/…";

/** A slug field that may be left empty (the API then makes one from the title). */
export const optionalSlug = z
  .string()
  .trim()
  .refine((value) => value === "" || SLUG_PATTERN.test(value), SLUG_MESSAGE);

export const PASSWORD_MIN = 10;
export const passwordField = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`);
