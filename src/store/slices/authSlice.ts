import { createSlice } from "@reduxjs/toolkit";
import { api, refreshSession } from "@/lib/api/client";
import { clearTokens, setTokens } from "@/lib/api/tokens";
import type { SessionUser, Tokens } from "@/lib/api/types";
import { apiThunk, type LoadStatus } from "../helpers";

interface AuthState {
  user: SessionUser | null;
  /** `checking` until the first session restore finishes. */
  session: "checking" | "authenticated" | "anonymous";
  /** Status of the latest login / password-change request. */
  status: LoadStatus;
  error: string | null;
  /** A one-off message for the login screen, e.g. after a password change. */
  notice: string | null;
}

const initialState: AuthState = { user: null, session: "checking", status: "idle", error: null, notice: null };

/** On page load: trade the stored refresh token for a fresh session. */
export const restoreSession = apiThunk("auth/restoreSession", async () => (await refreshSession()).User);

export const login = apiThunk("auth/login", async (credentials: { email: string; password: string }) => {
  const { data } = await api.post<Tokens>("/auth/login", credentials);
  setTokens(data);
  return data.User;
});

export const logout = apiThunk("auth/logout", async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    // Whether or not the API call worked, this browser is signed out.
    clearTokens();
  }
});

export const changePassword = apiThunk(
  "auth/changePassword",
  async (passwords: { currentPassword: string; newPassword: string }) => {
    await api.post("/auth/password", passwords);
    // The API signs the account out everywhere after a password change.
    clearTokens();
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** The refresh token stopped working, or another module reported a dead session. */
    sessionExpired(state) {
      clearTokens();
      state.user = null;
      state.session = "anonymous";
    },
    /** Keeps name/role fresh when a background refresh returns the user. */
    userRefreshed(state, action: { payload: SessionUser }) {
      if (state.session === "authenticated") state.user = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.session = "authenticated";
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.session = "anonymous";
      })
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.session = "authenticated";
        state.notice = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not sign in.";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.session = "anonymous";
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.session = "anonymous";
      })
      .addCase(changePassword.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.status = "succeeded";
        state.user = null;
        state.session = "anonymous";
        state.notice = "Your password was changed. Sign in with the new one.";
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not change the password.";
      });
  },
});

export const { sessionExpired, userRefreshed, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
