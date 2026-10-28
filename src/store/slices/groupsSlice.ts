import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { VaultGroup } from "@/lib/api/types";
import { apiThunk, emptyList, type ListState } from "../helpers";

export interface GroupInput {
  name: string;
  slug?: string;
  description?: string;
  /** The group it sits under; leave out to create a new top-level group. */
  parentId?: number;
}

export interface GroupPatch {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: number;
}

const loadTree = async () => (await api.get<VaultGroup[]>("/admin/vault/categories")).data;

export const fetchGroups = apiThunk("groups/fetch", loadTree);

// Every change reloads the tree: product counts and ordering are decided by the API.
export const createGroup = apiThunk("groups/create", async (body: GroupInput) => {
  await api.post("/admin/vault/categories", body);
  return loadTree();
});

export const updateGroup = apiThunk("groups/update", async ({ id, body }: { id: number; body: GroupPatch }) => {
  await api.patch(`/admin/vault/categories/${id}`, body);
  return loadTree();
});

export const deleteGroup = apiThunk("groups/delete", async (id: number) => {
  await api.delete(`/admin/vault/categories/${id}`);
  return loadTree();
});

/** `ids` must list every sub-group of that category, in the new order. */
export const reorderSubGroups = apiThunk(
  "groups/reorder",
  async ({ parentId, ids }: { parentId: number; ids: number[] }) =>
    (await api.put<VaultGroup[]>("/admin/vault/categories/reorder", { parentId, ids })).data,
);

const groupsSlice = createSlice({
  name: "groups",
  initialState: emptyList<VaultGroup>() as ListState<VaultGroup>,
  reducers: {
    /** Shows a new order straight away while the request is on its way. */
    previewSubGroupOrder(state, action: { payload: { parentId: number; ids: number[] } }) {
      const parent = state.items.find((group) => group.Id === action.payload.parentId);
      if (!parent) return;
      const byId = new Map(parent.Children.map((child) => [child.Id, child]));
      parent.Children = action.payload.ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load the groups.";
      });
    for (const thunk of [fetchGroups, createGroup, updateGroup, deleteGroup, reorderSubGroups]) {
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.items = action.payload;
      });
    }
  },
});

export const { previewSubGroupOrder } = groupsSlice.actions;
export default groupsSlice.reducer;
