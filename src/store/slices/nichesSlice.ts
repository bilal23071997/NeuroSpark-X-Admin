import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { Niche } from "@/lib/api/types";
import { apiThunk, emptyList, upsert, type ListState } from "../helpers";

export interface NicheInput {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
}

export const fetchNiches = apiThunk("niches/fetch", async () => (await api.get<Niche[]>("/admin/niches")).data);

export const createNiche = apiThunk(
  "niches/create",
  async (body: NicheInput) => (await api.post<Niche>("/admin/niches", body)).data,
);

export const updateNiche = apiThunk(
  "niches/update",
  async ({ id, body }: { id: string; body: Partial<NicheInput> }) =>
    (await api.patch<Niche>(`/admin/niches/${id}`, body)).data,
);

export const deleteNiche = apiThunk("niches/delete", async (id: string) => {
  await api.delete(`/admin/niches/${id}`);
  return id;
});

const sortNiches = (items: Niche[]) =>
  items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

const nichesSlice = createSlice({
  name: "niches",
  initialState: emptyList<Niche>() as ListState<Niche>,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNiches.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNiches.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchNiches.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load niches.";
      })
      .addCase(createNiche.fulfilled, (state, action) => {
        upsert(state.items, action.payload);
        sortNiches(state.items);
      })
      .addCase(updateNiche.fulfilled, (state, action) => {
        upsert(state.items, action.payload);
        sortNiches(state.items);
      })
      .addCase(deleteNiche.fulfilled, (state, action) => {
        state.items = state.items.filter((niche) => niche.id !== action.payload);
      });
  },
});

export default nichesSlice.reducer;
