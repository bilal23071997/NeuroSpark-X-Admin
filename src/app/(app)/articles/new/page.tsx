"use client";

import Link from "next/link";
import ArticleForm from "@/components/articles/ArticleForm";
import PageHeader from "@/components/ui/PageHeader";

export default function NewArticlePage() {
  return (
    <>
      <PageHeader
        title="New article"
        description="Write the article, file it under a niche, then publish when it's ready."
        actions={
          <Link href="/articles" className="text-sm text-soft-white/70 hover:text-soft-white">
            ← All articles
          </Link>
        }
      />
      <ArticleForm />
    </>
  );
}
