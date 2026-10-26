"use client";

import type { ReactNode } from "react";
import { useAppSelector } from "@/store/hooks";
import Alert from "./Alert";
import PageHeader from "./PageHeader";

/**
 * Wraps a screen whose API routes are admin-only. Editors get a plain
 * explanation instead of a page full of 403 errors, and no request is made.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const role = useAppSelector((state) => state.auth.user?.role);
  if (role !== "admin") {
    return (
      <>
        <PageHeader title="Admin only" />
        <Alert tone="info">This section is only available to admins. Ask an admin if you need something changed here.</Alert>
      </>
    );
  }
  return <>{children}</>;
}
