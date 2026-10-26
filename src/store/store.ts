import { configureStore } from "@reduxjs/toolkit";
import articles from "./slices/articlesSlice";
import auth from "./slices/authSlice";
import engagement from "./slices/engagementSlice";
import episodes from "./slices/episodesSlice";
import groups from "./slices/groupsSlice";
import niches from "./slices/nichesSlice";
import pages from "./slices/pagesSlice";
import products from "./slices/productsSlice";
import users from "./slices/usersSlice";

/** Created once per browser tab by <Providers>. Keep it free of side effects: React may call it twice in dev. */
export function makeStore() {
  return configureStore({ reducer: { auth, users, niches, articles, episodes, groups, products, pages, engagement } });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
