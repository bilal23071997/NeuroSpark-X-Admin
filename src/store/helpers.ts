import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/lib/api/errors";

// Every slice uses the same shape and the same thunk wrapper:
//   - lists: { items, status, error }, where status is idle | loading | succeeded | failed
//   - thunks reject with a readable message string (read it from `.unwrap()` errors)

export type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

export interface ListState<T> {
  items: T[];
  status: LoadStatus;
  error: string | null;
}

export function emptyList<T>(): ListState<T> {
  return { items: [], status: "idle", error: null };
}

/** One item that is loaded on its own (e.g. the article open in the editor). */
export interface DetailState<T> {
  item: T | null;
  status: LoadStatus;
  error: string | null;
}

export function emptyDetail<T>(): DetailState<T> {
  return { item: null, status: "idle", error: null };
}

/** createAsyncThunk that rejects with a readable message instead of a raw error. */
export function apiThunk<Returned, Arg = void>(
  type: string,
  request: (arg: Arg) => Promise<Returned>,
) {
  return createAsyncThunk<Returned, Arg, { rejectValue: string }>(
    type,
    async (arg, { rejectWithValue }) => {
      try {
        return await request(arg);
      } catch (error) {
        return rejectWithValue(getErrorMessage(error));
      }
    },
  );
}

/** The message from an error caught around `dispatch(thunk).unwrap()`. */
export function messageOf(error: unknown) {
  return typeof error === "string" ? error : getErrorMessage(error);
}

export function upsert<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index === -1) items.unshift(item);
  else items[index] = item;
}
