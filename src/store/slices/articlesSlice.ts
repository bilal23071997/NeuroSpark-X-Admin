import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { Article, PublishStatus } from "@/lib/api/types";
import { apiThunk, emptyDetail, emptyList, upsert, type DetailState, type ListState } from "../helpers";

export interface ArticleInput {
  title: string;
  slug?: string;
  excerpt: string;
  body: string[];
  nicheId: string;
  isFeatured?: boolean;
  /** `null` clears the field (only meaningful when editing). */
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface ArticleFilters {
  status?: PublishStatus;
  nicheId?: string;
}

export const fetchArticles = apiThunk(
  "articles/fetch",
  async (filters: ArticleFilters = {}) =>
    (await api.get<Article[]>("/admin/articles", { params: filters })).data,
);

export const fetchArticle = apiThunk(
  "articles/fetchOne",
  async (id: string) => (await api.get<Article>(`/admin/articles/${id}`)).data,
);

export const createArticle = apiThunk(
  "articles/create",
  async (body: ArticleInput) => (await api.post<Article>("/admin/articles", body)).data,
);

export const updateArticle = apiThunk(
  "articles/update",
  async ({ id, body }: { id: string; body: Partial<ArticleInput> }) =>
    (await api.patch<Article>(`/admin/articles/${id}`, body)).data,
);

export const publishArticle = apiThunk(
  "articles/publish",
  async (id: string) => (await api.post<Article>(`/admin/articles/${id}/publish`)).data,
);

export const unpublishArticle = apiThunk(
  "articles/unpublish",
  async (id: string) => (await api.post<Article>(`/admin/articles/${id}/unpublish`)).data,
);

export const deleteArticle = apiThunk("articles/delete", async (id: string) => {
  await api.delete(`/admin/articles/${id}`);
  return id;
});

interface ArticlesState extends ListState<Article> {
  detail: DetailState<Article>;
}

const initialState: ArticlesState = { ...emptyList<Article>(), detail: emptyDetail<Article>() };

const articlesSlice = createSlice({
  name: "articles",
  initialState,
  reducers: {
    clearArticleDetail(state) {
      state.detail = emptyDetail<Article>();
    },
  },
  extraReducers: (builder) => {
    const saved = (state: ArticlesState, article: Article) => {
      // Featuring one article un-features the others, so refresh that flag in the list too.
      if (article.isFeatured) state.items.forEach((item) => (item.isFeatured = item.id === article.id));
      upsert(state.items, article);
      if (state.detail.item?.id === article.id) state.detail.item = article;
    };

    builder
      .addCase(fetchArticles.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load articles.";
      })
      .addCase(fetchArticle.pending, (state) => {
        state.detail = { item: null, status: "loading", error: null };
      })
      .addCase(fetchArticle.fulfilled, (state, action) => {
        state.detail = { item: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchArticle.rejected, (state, action) => {
        state.detail = { item: null, status: "failed", error: action.payload ?? "Could not load the article." };
      })
      .addCase(createArticle.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(updateArticle.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(publishArticle.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(unpublishArticle.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(deleteArticle.fulfilled, (state, action) => {
        state.items = state.items.filter((article) => article.id !== action.payload);
        if (state.detail.item?.id === action.payload) state.detail = emptyDetail<Article>();
      });
  },
});

export const { clearArticleDetail } = articlesSlice.actions;
export default articlesSlice.reducer;
