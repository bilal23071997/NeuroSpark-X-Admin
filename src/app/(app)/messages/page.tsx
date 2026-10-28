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
import type { ContactMessage } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteMessage, fetchMessages, setMessageRead } from "@/store/slices/engagementSlice";

type Filter = "" | "unread" | "read";

function MessagesScreen() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.engagement.messages);
  const [filter, setFilter] = useState<Filter>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ContactMessage | null>(null);

  useEffect(() => {
    dispatch(fetchMessages(filter === "" ? undefined : filter === "read"));
  }, [dispatch, filter]);

  async function toggleRead(message: ContactMessage) {
    setBusyId(message.Id);
    setActionError(null);
    try {
      await dispatch(setMessageRead({ id: message.Id, isRead: !message.IsRead })).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  const visible = items.filter((message) =>
    filter === "" ? true : filter === "read" ? message.IsRead : !message.IsRead,
  );

  return (
    <>
      <PageHeader
        title="Contact messages"
        description="Messages sent through the website's contact form. Reply from your own email."
      />

      <div className="mb-5 flex flex-wrap gap-4">
        <FilterSelect label="Show" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="">All messages</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </FilterSelect>
      </div>

      {(error || actionError) && <Alert className="mb-5">{actionError ?? error}</Alert>}

      {status === "loading" && items.length === 0 ? (
        <LoadingBlock />
      ) : visible.length === 0 && status !== "failed" ? (
        <Panel>
          <EmptyState title={filter ? "No messages match this filter" : "No messages yet"}>
            {filter ? "Try showing all messages." : "Messages from the contact form will appear here."}
          </EmptyState>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((message) => (
            <li key={message.Id}>
              <Panel className={`p-5 ${message.IsRead ? "" : "border-electric-indigo/40"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {message.Subject || "(no subject)"}
                      {!message.IsRead && <Badge tone="violet">Unread</Badge>}
                    </p>
                    <p className="mt-0.5 text-sm text-soft-white/70">
                      {message.Name} ·{" "}
                      <a href={`mailto:${message.Email}`} className="text-indigo-text hover:underline">
                        {message.Email}
                      </a>{" "}
                      · {formatDate(message.CreatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" loading={busyId === message.Id} onClick={() => toggleRead(message)}>
                      {message.IsRead ? "Mark unread" : "Mark read"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setToDelete(message)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-soft-white/90">{message.Message}</p>
              </Panel>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this message?"
        confirmLabel="Delete message"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteMessage(toDelete!.Id)).unwrap()}
      >
        <p>
          The message from <strong>{toDelete?.Name}</strong> will be deleted permanently.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function MessagesPage() {
  return (
    <RequireAdmin>
      <MessagesScreen />
    </RequireAdmin>
  );
}
