import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type { Role, RoleName, StaffUser } from "@/lib/api/types";
import { apiThunk, emptyList, upsert, type ListState } from "../helpers";

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: RoleName;
}

export interface UpdateUserInput {
  name?: string;
  password?: string;
  role?: RoleName;
  isActive?: boolean;
}

export const fetchUsers = apiThunk("users/fetch", async () => (await api.get<StaffUser[]>("/admin/users")).data);

export const fetchRoles = apiThunk("users/fetchRoles", async () => (await api.get<Role[]>("/admin/roles")).data);

export const createUser = apiThunk(
  "users/create",
  async (body: CreateUserInput) => (await api.post<StaffUser>("/admin/users", body)).data,
);

export const updateUser = apiThunk(
  "users/update",
  async ({ id, body }: { id: string; body: UpdateUserInput }) =>
    (await api.patch<StaffUser>(`/admin/users/${id}`, body)).data,
);

interface UsersState extends ListState<StaffUser> {
  roles: ListState<Role>;
}

const initialState: UsersState = { ...emptyList<StaffUser>(), roles: emptyList<Role>() };

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load users.";
      })
      .addCase(fetchRoles.pending, (state) => {
        state.roles.status = "loading";
        state.roles.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.roles.status = "succeeded";
        state.roles.items = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.roles.status = "failed";
        state.roles.error = action.payload ?? "Could not load roles.";
      })
      .addCase(createUser.fulfilled, (state, action) => {
        upsert(state.items, action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        upsert(state.items, action.payload);
      });
  },
});

export default usersSlice.reducer;
