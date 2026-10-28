"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button, { ButtonLink } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FilterSelect } from "@/components/ui/Field";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { Badge, PublishBadge } from "@/components/ui/StatusBadge";
import type { Article, PublishStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteArticle,
  fetchArticles,
  publishArticle,
  unpublishArticle,
} from "@/store/slices/articlesSlice";
import { fetchNiches } from "@/store/slices/nichesSlice";

export default function ArticlesPage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.articles);
  const niches = useAppSelector((state) => state.niches.items);

  const [statusFilter, setStatusFilter] = useState<"" | PublishStatus>("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Article | null>(null);

  useEffect(() => {
    dispatch(fetchNiches());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchArticles({
        status: statusFilter || undefined,
        nicheId: nicheFilter || undefined,
      }),
    );
  }, [dispatch, statusFilter, nicheFilter]);

  async function togglePublish(article: Article) {
    setBusyId(article.Id);
    setActionError(null);
    try {
      await dispatch((article.Status === "published" ? unpublishArticle : publishArticle)(article.Id)).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = statusFilter !== "" || nicheFilter !== "";

  return (
    <>
      <PageHeader
        title="Articles"
        description="Insights articles, filed under niches. Drafts are only visible here until you publish them."
        actions={<ButtonLink href="/articles/new">New article</ButtonLink>}
      />

      <div className="mb-5 flex flex-wrap gap-4">
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "" | PublishStatus)}
        >
          <option value="">All</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
        </FilterSelect>
        <FilterSelect label="Niche" value={nicheFilter} onChange={(event) => setNicheFilter(event.target.value)}>
          <option value="">All niches</option>
          {niches.map((niche) => (
            <option key={niche.Id} value={niche.Id}>
              {niche.Name}
            </option>
          ))}
        </FilterSelect>
      </div>

      {(error || actionError) && <Alert className="mb-5">{actionError ?? error}</Alert>}

      <Panel className="overflow-hidden">
        {status === "loading" && items.length === 0 ? (
          <LoadingBlock />
        ) : items.length === 0 && status !== "failed" ? (
          <EmptyState
            title={filtered ? "No articles match these filters" : "No articles yet"}
            action={!filtered && <ButtonLink href="/articles/new">Write the first article</ButtonLink>}
          >
            {filtered ? "Try a different status or niche." : "Articles you create will appear here."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Articles</caption>
              <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Title</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Niche</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium lg:table-cell">Published</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-white/10">
                {items.map((article) => (
                  <tr key={article.Id} className="align-middle">
                    <td className="px-5 py-4">
                      <Link href={`/articles/${article.Id}`} className="font-medium hover:text-indigo-text">
                        {article.Title}
                      </Link>
                      {article.IsFeatured && (
                        <span className="ml-2 align-middle">
                          <Badge tone="violet">Featured</Badge>
                        </span>
                      )}
                      <p className="mt-0.5 text-xs text-soft-white/60">/{article.Slug}</p>
                    </td>
                    <td className="hidden px-5 py-4 text-soft-white/80 md:table-cell">{article.Niche.Name}</td>
                    <td className="px-5 py-4">
                      <PublishBadge status={article.Status} />
                    </td>
                    <td className="hidden px-5 py-4 text-soft-white/80 lg:table-cell">
                      {formatDate(article.PublishedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <ButtonLink href={`/articles/${article.Id}`} variant="secondary" size="sm">
                          Edit
                        </ButtonLink>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyId === article.Id}
                          onClick={() => togglePublish(article)}
                        >
                          {article.Status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setToDelete(article)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this article?"
        confirmLabel="Delete article"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteArticle(toDelete!.Id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.Title}</strong> will be deleted permanently. This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
