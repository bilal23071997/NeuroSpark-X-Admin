"use client";

import Link from "next/link";
import PageForm from "@/components/pages/PageForm";
import PageHeader from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";

export default function NewSitePage() {
  return (
    <RequireAdmin>
      <PageHeader
        title="New page"
        description="Add the text you want published, such as your privacy policy or terms."
        actions={
          <Link href="/site-pages" className="text-sm text-soft-white/70 hover:text-soft-white">
            ← All pages
          </Link>
        }
      />
      <PageForm />
    </RequireAdmin>
  );
}
