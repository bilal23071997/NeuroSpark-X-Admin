import { isAxiosError } from "axios";

/** A readable message for any error thrown by an API call. */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return "Can't reach the API. Check your connection and that the API is running.";
    const { status, data } = error.response as { status: number; data?: { message?: string | string[] } };
    const message = Array.isArray(data?.message) ? data.message.join(". ") : data?.message;
    if (status === 403) return "You don't have permission to do that.";
    if (status === 401) return message && message !== "Unauthorized" ? message : "Your session has ended. Please sign in again.";
    return message ?? `Something went wrong (error ${status}).`;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function isForbidden(error: unknown) {
  return isAxiosError(error) && error.response?.status === 403;
}
