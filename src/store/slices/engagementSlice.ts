import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { ContactMessage, FreeResource, NewsletterSubscriber, SiteSetting } from "@/lib/api/types";
import { apiThunk, emptyList, upsert, type ListState } from "../helpers";

// One slice for the small "audience and site" modules (free resources, newsletter,
// contact messages, settings). Each part keeps the usual { items, status, error } shape.

export interface FreeResourceInput {
  title: string;
  description: string;
  type: string;
  destination?: string | null;
  url: string;
  isPublished?: boolean;
  sortOrder?: number;
}

// ---------- Free resources ----------

export const fetchFreeResources = apiThunk(
  "engagement/freeResources/fetch",
  async () => (await api.get<FreeResource[]>("/admin/free-resources")).data,
);

export const createFreeResource = apiThunk(
  "engagement/freeResources/create",
  async (body: FreeResourceInput) => (await api.post<FreeResource>("/admin/free-resources", body)).data,
);

export const updateFreeResource = apiThunk(
  "engagement/freeResources/update",
  async ({ id, body }: { id: string; body: Partial<FreeResourceInput> }) =>
    (await api.patch<FreeResource>(`/admin/free-resources/${id}`, body)).data,
);

export const deleteFreeResource = apiThunk("engagement/freeResources/delete", async (id: string) => {
  await api.delete(`/admin/free-resources/${id}`);
  return id;
});

// ---------- Newsletter subscribers ----------

export const fetchSubscribers = apiThunk(
  "engagement/subscribers/fetch",
  async (isSubscribed?: boolean) =>
    (await api.get<NewsletterSubscriber[]>("/admin/newsletter", { params: { isSubscribed } })).data,
);

export const setSubscribed = apiThunk(
  "engagement/subscribers/set",
  async ({ id, isSubscribed }: { id: string; isSubscribed: boolean }) =>
    (await api.patch<NewsletterSubscriber>(`/admin/newsletter/${id}`, { isSubscribed })).data,
);

export const deleteSubscriber = apiThunk("engagement/subscribers/delete", async (id: string) => {
  await api.delete(`/admin/newsletter/${id}`);
  return id;
});

// ---------- Contact messages ----------

export const fetchMessages = apiThunk(
  "engagement/messages/fetch",
  async (isRead?: boolean) =>
    (await api.get<ContactMessage[]>("/admin/contact-messages", { params: { isRead } })).data,
);

export const setMessageRead = apiThunk(
  "engagement/messages/setRead",
  async ({ id, isRead }: { id: string; isRead: boolean }) =>
    (await api.patch<ContactMessage>(`/admin/contact-messages/${id}`, { isRead })).data,
);

export const deleteMessage = apiThunk("engagement/messages/delete", async (id: string) => {
  await api.delete(`/admin/contact-messages/${id}`);
  return id;
});

// ---------- Site settings ----------

export const fetchSettings = apiThunk(
  "engagement/settings/fetch",
  async () => (await api.get<SiteSetting[]>("/admin/settings")).data,
);

/** An empty value clears the setting. */
export const saveSetting = apiThunk(
  "engagement/settings/save",
  async ({ key, value }: { key: string; value: string }) =>
    (await api.put<SiteSetting>(`/admin/settings/${key}`, { value: value.trim() || null })).data,
);

interface EngagementState {
  /** The newest list request per part, so a slower older response (previous filter) is ignored. */
  latest: Partial<Record<keyof Omit<EngagementState, "latest">, string>>;
  freeResources: ListState<FreeResource>;
  subscribers: ListState<NewsletterSubscriber>;
  messages: ListState<ContactMessage>;
  settings: ListState<SiteSetting>;
}

const initialState: EngagementState = {
  latest: {},
  freeResources: emptyList<FreeResource>(),
  subscribers: emptyList<NewsletterSubscriber>(),
  messages: emptyList<ContactMessage>(),
  settings: emptyList<SiteSetting>(),
};

type Part = keyof Omit<EngagementState, "latest">;

const engagementSlice = createSlice({
  name: "engagement",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    function loads<T extends { Id: string } | { Key: string }>(
      part: Part,
      thunk: typeof fetchFreeResources | typeof fetchSubscribers | typeof fetchMessages | typeof fetchSettings,
      failure: string,
    ) {
      builder
        .addCase(thunk.pending, (state, action) => {
          state.latest[part] = action.meta.requestId;
          state[part].status = "loading";
          state[part].error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          if (action.meta.requestId !== state.latest[part]) return;
          state[part].status = "succeeded";
          (state[part].items as T[]) = action.payload as unknown as T[];
        })
        .addCase(thunk.rejected, (state, action) => {
          if (action.meta.requestId !== state.latest[part]) return;
          state[part].status = "failed";
          state[part].error = action.payload ?? failure;
        });
    }
    loads("freeResources", fetchFreeResources, "Could not load free resources.");
    loads("subscribers", fetchSubscribers, "Could not load subscribers.");
    loads("messages", fetchMessages, "Could not load messages.");
    loads("settings", fetchSettings, "Could not load settings.");

    builder
      .addCase(createFreeResource.fulfilled, (state, action) => {
        upsert(state.freeResources.items, action.payload);
        state.freeResources.items.sort((a, b) => a.SortOrder - b.SortOrder);
      })
      .addCase(updateFreeResource.fulfilled, (state, action) => {
        upsert(state.freeResources.items, action.payload);
        state.freeResources.items.sort((a, b) => a.SortOrder - b.SortOrder);
      })
      .addCase(deleteFreeResource.fulfilled, (state, action) => {
        state.freeResources.items = state.freeResources.items.filter((item) => item.Id !== action.payload);
      })
      .addCase(setSubscribed.fulfilled, (state, action) => upsert(state.subscribers.items, action.payload))
      .addCase(deleteSubscriber.fulfilled, (state, action) => {
        state.subscribers.items = state.subscribers.items.filter((item) => item.Id !== action.payload);
      })
      .addCase(setMessageRead.fulfilled, (state, action) => upsert(state.messages.items, action.payload))
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.messages.items = state.messages.items.filter((item) => item.Id !== action.payload);
      })
      .addCase(saveSetting.fulfilled, (state, action) => {
        const index = state.settings.items.findIndex((item) => item.Key === action.payload.Key);
        if (index !== -1) state.settings.items[index] = action.payload;
      });
  },
});

export default engagementSlice.reducer;
