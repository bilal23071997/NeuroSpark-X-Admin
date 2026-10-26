import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { SitePage } from "@/lib/api/types";
import { apiThunk, emptyDetail, emptyList, upsert, type DetailState, type ListState } from "../helpers";

export interface PageInput {
  slug: string;
  title: string;
  body: string;
}

export const fetchPages = apiThunk("pages/fetch", async () => (await api.get<SitePage[]>("/admin/pages")).data);

export const fetchPage = apiThunk(
  "pages/fetchOne",
  async (id: string) => (await api.get<SitePage>(`/admin/pages/${id}`)).data,
);

export const createPage = apiThunk(
  "pages/create",
  async (body: PageInput) => (await api.post<SitePage>("/admin/pages", body)).data,
);

export const updatePage = apiThunk(
  "pages/update",
  async ({ id, body }: { id: string; body: Partial<PageInput> }) =>
    (await api.patch<SitePage>(`/admin/pages/${id}`, body)).data,
);

export const publishPage = apiThunk(
  "pages/publish",
  async (id: string) => (await api.post<SitePage>(`/admin/pages/${id}/publish`)).data,
);

export const unpublishPage = apiThunk(
  "pages/unpublish",
  async (id: string) => (await api.post<SitePage>(`/admin/pages/${id}/unpublish`)).data,
);

export const deletePage = apiThunk("pages/delete", async (id: string) => {
  await api.delete(`/admin/pages/${id}`);
  return id;
});

interface PagesState extends ListState<SitePage> {
  detail: DetailState<SitePage>;
}

const initialState: PagesState = { ...emptyList<SitePage>(), detail: emptyDetail<SitePage>() };

const pagesSlice = createSlice({
  name: "pages",
  initialState,
  reducers: {
    clearPageDetail(state) {
      state.detail = emptyDetail<SitePage>();
    },
  },
  extraReducers: (builder) => {
    const saved = (state: PagesState, page: SitePage) => {
      upsert(state.items, page);
      if (state.detail.item?.id === page.id) state.detail.item = page;
    };

    builder
      .addCase(fetchPages.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPages.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchPages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load pages.";
      })
      .addCase(fetchPage.pending, (state) => {
        state.detail = { item: null, status: "loading", error: null };
      })
      .addCase(fetchPage.fulfilled, (state, action) => {
        state.detail = { item: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchPage.rejected, (state, action) => {
        state.detail = { item: null, status: "failed", error: action.payload ?? "Could not load the page." };
      })
      .addCase(createPage.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(updatePage.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(publishPage.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(unpublishPage.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(deletePage.fulfilled, (state, action) => {
        state.items = state.items.filter((page) => page.id !== action.payload);
        if (state.detail.item?.id === action.payload) state.detail = emptyDetail<SitePage>();
      });
  },
});

export const { clearPageDetail } = pagesSlice.actions;
export default pagesSlice.reducer;
