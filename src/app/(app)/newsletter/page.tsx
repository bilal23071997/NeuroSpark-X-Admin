"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FilterSelect } from "@/components/ui/Field";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/StatusBadge";
import { api } from "@/lib/api/client";
import type { NewsletterSubscriber } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteSubscriber, fetchSubscribers, setSubscribed } from "@/store/slices/engagementSlice";

type Filter = "" | "subscribed" | "unsubscribed";

function SubscribersScreen() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.engagement.subscribers);
  const [filter, setFilter] = useState<Filter>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<NewsletterSubscriber | null>(null);

  useEffect(() => {
    dispatch(fetchSubscribers(filter === "" ? undefined : filter === "subscribed"));
  }, [dispatch, filter]);

  async function toggle(subscriber: NewsletterSubscriber) {
    setBusyId(subscriber.id);
    setActionError(null);
    try {
      await dispatch(setSubscribed({ id: subscriber.id, isSubscribed: !subscriber.isSubscribed })).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  // The export needs the sign-in token, so a plain link won't work: fetch it, then save the file.
  async function exportCsv() {
    setExporting(true);
    setActionError(null);
    try {
      const { data } = await api.get<Blob>("/admin/newsletter/export.csv", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "newsletter-subscribers.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setExporting(false);
    }
  }

  const visible = items.filter((subscriber) =>
    filter === "" ? true : filter === "subscribed" ? subscriber.isSubscribed : !subscriber.isSubscribed,
  );

  return (
    <>
      <PageHeader
        title="Newsletter subscribers"
        description="Addresses collected by the website's sign-up forms. They are stored here only; no email is sent from this system yet."
        actions={
          <Button variant="secondary" loading={exporting} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-4">
        <FilterSelect label="Show" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="">Everyone</option>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </FilterSelect>
      </div>

      {(error || actionError) && <Alert className="mb-5">{actionError ?? error}</Alert>}

      <Panel className="overflow-hidden">
        {status === "loading" && items.length === 0 ? (
          <LoadingBlock />
        ) : visible.length === 0 && status !== "failed" ? (
          <EmptyState title={filter ? "Nobody matches this filter" : "No subscribers yet"}>
            {filter ? "Try showing everyone." : "Sign-ups from the website will appear here."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Newsletter subscribers</caption>
              <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Email</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Source</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">Joined</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-white/10">
                {visible.map((subscriber) => (
                  <tr key={subscriber.id} className="align-middle">
                    <td className="px-5 py-4 font-medium break-all">{subscriber.email}</td>
                    <td className="hidden px-5 py-4 text-soft-white/80 md:table-cell">{subscriber.source ?? "—"}</td>
                    <td className="hidden px-5 py-4 text-soft-white/80 sm:table-cell">{formatDate(subscriber.subscribedAt)}</td>
                    <td className="px-5 py-4">
                      {subscriber.isSubscribed ? <Badge tone="teal">Subscribed</Badge> : <Badge tone="neutral">Unsubscribed</Badge>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="secondary" loading={busyId === subscriber.id} onClick={() => toggle(subscriber)}>
                          {subscriber.isSubscribed ? "Unsubscribe" : "Resubscribe"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setToDelete(subscriber)}>
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
        title="Delete this subscriber?"
        confirmLabel="Delete subscriber"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteSubscriber(toDelete!.id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.email}</strong> will be removed completely. Use this for data-deletion requests; to just
          stop emailing someone, unsubscribe them instead.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function NewsletterPage() {
  return (
    <RequireAdmin>
      <SubscribersScreen />
    </RequireAdmin>
  );
}
