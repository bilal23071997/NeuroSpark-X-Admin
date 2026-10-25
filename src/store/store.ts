import { configureStore } from "@reduxjs/toolkit";
import articles from "./slices/articlesSlice";
import auth from "./slices/authSlice";
import episodes from "./slices/episodesSlice";
import niches from "./slices/nichesSlice";
import users from "./slices/usersSlice";

/** Created once per browser tab by <Providers>. Keep it free of side effects: React may call it twice in dev. */
export function makeStore() {
  return configureStore({ reducer: { auth, users, niches, articles, episodes } });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
