"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { setSessionHandlers } from "@/lib/api/client";
import { restoreSession, sessionExpired, userRefreshed } from "@/store/slices/authSlice";
import { makeStore } from "@/store/store";

export default function Providers({ children }: { children: ReactNode }) {
  // One store per browser tab, created on first render.
  const [store] = useState(makeStore);

  useEffect(() => {
    // Lets the Axios layer (which can't import the store) report session changes.
    // Registered here rather than in makeStore so it always points at the store in use.
    setSessionHandlers({
      onExpired: () => store.dispatch(sessionExpired()),
      onRefreshed: (user) => store.dispatch(userRefreshed(user)),
    });
    // Safe to run twice (React strict mode): refresh calls share one in-flight request.
    store.dispatch(restoreSession());
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
