import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { Episode, PublishStatus } from "@/lib/api/types";
import { apiThunk, emptyDetail, emptyList, upsert, type DetailState, type ListState } from "../helpers";

export interface EpisodeInput {
  title: string;
  slug?: string;
  /** Slug from src/lib/podcast-series.ts. */
  series: string;
  episodeNumber: number;
  description: string;
  duration?: string | null;
  youtubeUrl?: string | null;
  showNotes?: string[];
  isFeatured?: boolean;
}

export interface EpisodeFilters {
  status?: PublishStatus;
  series?: string;
}

export const fetchEpisodes = apiThunk(
  "episodes/fetch",
  async (filters: EpisodeFilters = {}) =>
    (await api.get<Episode[]>("/admin/episodes", { params: filters })).data,
);

export const fetchEpisode = apiThunk(
  "episodes/fetchOne",
  async (id: string) => (await api.get<Episode>(`/admin/episodes/${id}`)).data,
);

export const createEpisode = apiThunk(
  "episodes/create",
  async (body: EpisodeInput) => (await api.post<Episode>("/admin/episodes", body)).data,
);

export const updateEpisode = apiThunk(
  "episodes/update",
  async ({ id, body }: { id: string; body: Partial<EpisodeInput> }) =>
    (await api.patch<Episode>(`/admin/episodes/${id}`, body)).data,
);

export const publishEpisode = apiThunk(
  "episodes/publish",
  async (id: string) => (await api.post<Episode>(`/admin/episodes/${id}/publish`)).data,
);

export const unpublishEpisode = apiThunk(
  "episodes/unpublish",
  async (id: string) => (await api.post<Episode>(`/admin/episodes/${id}/unpublish`)).data,
);

export const deleteEpisode = apiThunk("episodes/delete", async (id: string) => {
  await api.delete(`/admin/episodes/${id}`);
  return id;
});

interface EpisodesState extends ListState<Episode> {
  detail: DetailState<Episode>;
}

const initialState: EpisodesState = { ...emptyList<Episode>(), detail: emptyDetail<Episode>() };

const episodesSlice = createSlice({
  name: "episodes",
  initialState,
  reducers: {
    clearEpisodeDetail(state) {
      state.detail = emptyDetail<Episode>();
    },
  },
  extraReducers: (builder) => {
    const saved = (state: EpisodesState, episode: Episode) => {
      // Featuring one episode un-features the others, so refresh that flag in the list too.
      if (episode.isFeatured) state.items.forEach((item) => (item.isFeatured = item.id === episode.id));
      upsert(state.items, episode);
      if (state.detail.item?.id === episode.id) state.detail.item = episode;
    };

    builder
      .addCase(fetchEpisodes.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchEpisodes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchEpisodes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load episodes.";
      })
      .addCase(fetchEpisode.pending, (state) => {
        state.detail = { item: null, status: "loading", error: null };
      })
      .addCase(fetchEpisode.fulfilled, (state, action) => {
        state.detail = { item: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchEpisode.rejected, (state, action) => {
        state.detail = { item: null, status: "failed", error: action.payload ?? "Could not load the episode." };
      })
      .addCase(createEpisode.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(updateEpisode.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(publishEpisode.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(unpublishEpisode.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(deleteEpisode.fulfilled, (state, action) => {
        state.items = state.items.filter((episode) => episode.id !== action.payload);
        if (state.detail.item?.id === action.payload) state.detail = emptyDetail<Episode>();
      });
  },
});

export const { clearEpisodeDetail } = episodesSlice.actions;
export default episodesSlice.reducer;
