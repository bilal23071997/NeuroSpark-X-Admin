"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageForm from "@/components/pages/PageForm";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader, { Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import { PublishBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearPageDetail, deletePage, fetchPage, publishPage, unpublishPage } from "@/store/slices/pagesSlice";

function EditPageScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { item: page, status, error } = useAppSelector((state) => state.pages.detail);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    dispatch(fetchPage(id));
    return () => {
      dispatch(clearPageDetail());
    };
  }, [dispatch, id]);

  async function togglePublish() {
    if (!page) return;
    setBusy(true);
    setActionError(null);
    try {
      await dispatch((page.status === "published" ? unpublishPage : publishPage)(page.id)).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === "failed") {
    return (
      <>
        <PageHeader title="Page" />
        <Alert>{error}</Alert>
        <p className="mt-4">
          <Link href="/site-pages" className="text-sm text-indigo-text hover:underline">
            ← Back to pages
          </Link>
        </p>
      </>
    );
  }

  if (!page) return <LoadingBlock label="Loading page…" />;

  return (
    <>
      <PageHeader
        title="Edit page"
        description={`/${page.slug}`}
        actions={
          <Link href="/site-pages" className="text-sm text-soft-white/70 hover:text-soft-white">
            ← All pages
          </Link>
        }
      />

      {actionError && <Alert className="mb-5">{actionError}</Alert>}

      <Panel className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <PublishBadge status={page.status} />
            <span className="text-sm text-soft-white/70">
              {page.status === "published" ? `Live since ${formatDate(page.publishedAt)}` : "Not visible on the site yet"}
            </span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" loading={busy} onClick={togglePublish}>
              {page.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-soft-white/60">Publish and Unpublish use the last saved version. Save your changes first.</p>
      </Panel>

      <PageForm key={page.id} page={page} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this page?"
        confirmLabel="Delete page"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await dispatch(deletePage(page.id)).unwrap();
          router.replace("/site-pages");
        }}
      >
        <p>
          <strong>{page.title}</strong> (/{page.slug}) will be deleted permanently. Links to it will stop working.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function EditSitePage() {
  return (
    <RequireAdmin>
      <EditPageScreen />
    </RequireAdmin>
  );
}
