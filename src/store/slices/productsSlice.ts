import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { Product, PublishStatus, SectionType } from "@/lib/api/types";
import { apiThunk, emptyDetail, emptyList, upsert, type DetailState, type ListState } from "../helpers";

/** A section as the API accepts it (only the fields that belong to its type). */
export interface SectionInput {
  id?: string;
  type: SectionType;
  title?: string;
  body?: string;
  items?: string[];
  faq?: { question: string; answer: string }[];
  imageUrl?: string;
  alt?: string;
}

export interface ProductInput {
  name: string;
  slug?: string;
  categoryId: number;
  summary: string;
  description: string;
  priceCents: number;
  /** null ends a sale. */
  salePriceCents?: number | null;
  format: string;
  delivery: string;
  destination?: string | null;
  symbol?: string | null;
  forWho?: string;
  included?: string[];
  coverImageUrl?: string | null;
  galleryImages?: string[];
  sections?: SectionInput[];
  fileKey?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  isFeatured?: boolean;
  isPopular?: boolean;
}

export interface ProductFilters {
  status?: PublishStatus;
  categoryId?: number;
}

export const fetchProducts = apiThunk(
  "products/fetch",
  async (filters: ProductFilters = {}) =>
    (await api.get<Product[]>("/admin/vault/products", { params: filters })).data,
);

export const fetchProduct = apiThunk(
  "products/fetchOne",
  async (id: string) => (await api.get<Product>(`/admin/vault/products/${id}`)).data,
);

export const createProduct = apiThunk(
  "products/create",
  async (body: ProductInput) => (await api.post<Product>("/admin/vault/products", body)).data,
);

export const updateProduct = apiThunk(
  "products/update",
  async ({ id, body }: { id: string; body: Partial<ProductInput> }) =>
    (await api.patch<Product>(`/admin/vault/products/${id}`, body)).data,
);

export const publishProduct = apiThunk(
  "products/publish",
  async (id: string) => (await api.post<Product>(`/admin/vault/products/${id}/publish`)).data,
);

export const unpublishProduct = apiThunk(
  "products/unpublish",
  async (id: string) => (await api.post<Product>(`/admin/vault/products/${id}/unpublish`)).data,
);

export const deleteProduct = apiThunk("products/delete", async (id: string) => {
  await api.delete(`/admin/vault/products/${id}`);
  return id;
});

interface ProductsState extends ListState<Product> {
  detail: DetailState<Product>;
  /** The newest list request: a slower, older response (e.g. from the previous filter) is ignored. */
  latestListRequest: string | null;
}

const initialState: ProductsState = { ...emptyList<Product>(), detail: emptyDetail<Product>(), latestListRequest: null };

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearProductDetail(state) {
      state.detail = emptyDetail<Product>();
    },
  },
  extraReducers: (builder) => {
    const saved = (state: ProductsState, product: Product) => {
      upsert(state.items, product);
      if (state.detail.item?.Id === product.Id) state.detail.item = product;
    };

    builder
      .addCase(fetchProducts.pending, (state, action) => {
        state.latestListRequest = action.meta.requestId;
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestListRequest) return;
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestListRequest) return;
        state.status = "failed";
        state.error = action.payload ?? "Could not load products.";
      })
      .addCase(fetchProduct.pending, (state) => {
        state.detail = { item: null, status: "loading", error: null };
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.detail = { item: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.detail = { item: null, status: "failed", error: action.payload ?? "Could not load the product." };
      })
      .addCase(createProduct.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(updateProduct.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(publishProduct.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(unpublishProduct.fulfilled, (state, action) => saved(state, action.payload))
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((product) => product.Id !== action.payload);
        if (state.detail.item?.Id === action.payload) state.detail = emptyDetail<Product>();
      });
  },
});

export const { clearProductDetail } = productsSlice.actions;
export default productsSlice.reducer;
