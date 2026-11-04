import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { Series } from "@/lib/api/types";
import { apiThunk, emptyList, upsert, type ListState } from "../helpers";

export interface SeriesInput {
  name: string;
  slug?: string;
  description?: string;
  /** `null` clears it (only meaningful when editing). */
  label?: string | null;
  coverImageUrl?: string | null;
  nicheId: string;
  sortOrder?: number;
}

export const fetchSeries = apiThunk("series/fetch", async () => (await api.get<Series[]>("/admin/series")).data);

export const createSeries = apiThunk(
  "series/create",
  async (body: SeriesInput) => (await api.post<Series>("/admin/series", body)).data,
);

export const updateSeries = apiThunk(
  "series/update",
  async ({ id, body }: { id: string; body: Partial<SeriesInput> }) =>
    (await api.patch<Series>(`/admin/series/${id}`, body)).data,
);

export const deleteSeries = apiThunk("series/delete", async (id: string) => {
  await api.delete(`/admin/series/${id}`);
  return id;
});

const sortSeries = (items: Series[]) =>
  items.sort((a, b) => a.SortOrder - b.SortOrder || a.Name.localeCompare(b.Name));

const seriesSlice = createSlice({
  name: "series",
  initialState: emptyList<Series>() as ListState<Series>,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeries.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSeries.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchSeries.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load series.";
      })
      .addCase(createSeries.fulfilled, (state, action) => {
        upsert(state.items, action.payload);
        sortSeries(state.items);
      })
      .addCase(updateSeries.fulfilled, (state, action) => {
        upsert(state.items, action.payload);
        sortSeries(state.items);
      })
      .addCase(deleteSeries.fulfilled, (state, action) => {
        state.items = state.items.filter((series) => series.Id !== action.payload);
      });
  },
});

export default seriesSlice.reducer;
