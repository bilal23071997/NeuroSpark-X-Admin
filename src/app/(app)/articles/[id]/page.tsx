"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ArticleForm from "@/components/articles/ArticleForm";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader, { Panel } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { PublishBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearArticleDetail,
  deleteArticle,
  fetchArticle,
  publishArticle,
  unpublishArticle,
} from "@/store/slices/articlesSlice";

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { item: article, status, error } = useAppSelector((state) => state.articles.detail);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    dispatch(fetchArticle(id));
    return () => {
      dispatch(clearArticleDetail());
    };
  }, [dispatch, id]);

  async function togglePublish() {
    if (!article) return;
    setBusy(true);
    setActionError(null);
    try {
      await dispatch((article.status === "published" ? unpublishArticle : publishArticle)(article.id)).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === "failed") {
    return (
      <>
        <PageHeader title="Article" />
        <Alert>{error}</Alert>
        <p className="mt-4">
          <Link href="/articles" className="text-sm text-indigo-text hover:underline">
            ← Back to articles
          </Link>
        </p>
      </>
    );
  }

  if (!article) return <LoadingBlock label="Loading article…" />;

  return (
    <>
      <PageHeader
        title="Edit article"
        description={article.title}
        actions={
          <Link href="/articles" className="text-sm text-soft-white/70 hover:text-soft-white">
            ← All articles
          </Link>
        }
      />

      {actionError && <Alert className="mb-5">{actionError}</Alert>}

      <Panel className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <PublishBadge status={article.status} />
          <span className="text-sm text-soft-white/70">
            {article.status === "published"
              ? `Live since ${formatDate(article.publishedAt)}`
              : "Not visible on the site yet"}
          </span>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" loading={busy} onClick={togglePublish}>
            {article.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </Panel>

      <ArticleForm key={article.id} article={article} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this article?"
        confirmLabel="Delete article"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await dispatch(deleteArticle(article.id)).unwrap();
          router.replace("/articles");
        }}
      >
        <p>
          <strong>{article.title}</strong> will be deleted permanently. This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
