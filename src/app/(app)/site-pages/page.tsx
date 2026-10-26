"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button, { ButtonLink } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import { PublishBadge } from "@/components/ui/StatusBadge";
import type { SitePage } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deletePage, fetchPages, publishPage, unpublishPage } from "@/store/slices/pagesSlice";

function PagesScreen() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.pages);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SitePage | null>(null);

  useEffect(() => {
    dispatch(fetchPages());
  }, [dispatch]);

  async function togglePublish(page: SitePage) {
    setBusyId(page.id);
    setActionError(null);
    try {
      await dispatch((page.status === "published" ? unpublishPage : publishPage)(page.id)).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Site pages"
        description="Standalone pages such as Privacy Policy and Terms. Published pages are listed in the website footer."
        actions={<ButtonLink href="/site-pages/new">New page</ButtonLink>}
      />

      {(error || actionError) && <Alert className="mb-5">{actionError ?? error}</Alert>}

      <Panel className="overflow-hidden">
        {status === "loading" && items.length === 0 ? (
          <LoadingBlock />
        ) : items.length === 0 && status !== "failed" ? (
          <EmptyState title="No pages yet" action={<ButtonLink href="/site-pages/new">Create the first page</ButtonLink>}>
            Nothing is made up for you: add the text you want published, such as your privacy policy and terms.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Site pages</caption>
              <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Page</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Updated</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-white/10">
                {items.map((page) => (
                  <tr key={page.id} className="align-middle">
                    <td className="px-5 py-4">
                      <Link href={`/site-pages/${page.id}`} className="font-medium hover:text-indigo-text">
                        {page.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-soft-white/60">/{page.slug}</p>
                    </td>
                    <td className="px-5 py-4">
                      <PublishBadge status={page.status} />
                    </td>
                    <td className="hidden px-5 py-4 text-soft-white/80 md:table-cell">{formatDate(page.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <ButtonLink href={`/site-pages/${page.id}`} variant="secondary" size="sm">
                          Edit
                        </ButtonLink>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyId === page.id}
                          onClick={() => togglePublish(page)}
                        >
                          {page.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setToDelete(page)}>
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
        title="Delete this page?"
        confirmLabel="Delete page"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deletePage(toDelete!.id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.title}</strong> (/{toDelete?.slug}) will be deleted permanently. Links to it will stop working.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function SitePagesPage() {
  return (
    <RequireAdmin>
      <PagesScreen />
    </RequireAdmin>
  );
}
