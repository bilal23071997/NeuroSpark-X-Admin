"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EpisodeForm from "@/components/episodes/EpisodeForm";
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
  clearEpisodeDetail,
  deleteEpisode,
  fetchEpisode,
  publishEpisode,
  unpublishEpisode,
} from "@/store/slices/episodesSlice";

export default function EditEpisodePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { item: episode, status, error } = useAppSelector((state) => state.episodes.detail);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    dispatch(fetchEpisode(id));
    return () => {
      dispatch(clearEpisodeDetail());
    };
  }, [dispatch, id]);

  async function togglePublish() {
    if (!episode) return;
    setBusy(true);
    setActionError(null);
    try {
      await dispatch((episode.status === "published" ? unpublishEpisode : publishEpisode)(episode.id)).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === "failed") {
    return (
      <>
        <PageHeader title="Episode" />
        <Alert>{error}</Alert>
        <p className="mt-4">
          <Link href="/episodes" className="text-sm text-indigo-text hover:underline">
            ← Back to episodes
          </Link>
        </p>
      </>
    );
  }

  if (!episode) return <LoadingBlock label="Loading episode…" />;

  // Based on what is saved, not what is typed: the API needs the link on file to publish.
  const canPublish = episode.status === "published" || Boolean(episode.youtubeUrl);

  return (
    <>
      <PageHeader
        title="Edit episode"
        description={episode.title}
        actions={
          <Link href="/episodes" className="text-sm text-soft-white/70 hover:text-soft-white">
            ← All episodes
          </Link>
        }
      />

      {actionError && <Alert className="mb-5">{actionError}</Alert>}

      <Panel className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <PublishBadge status={episode.status} />
            <span className="text-sm text-soft-white/70">
              {episode.status === "published"
                ? `Live since ${formatDate(episode.publishedAt)}`
                : "Not visible on the site yet"}
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              loading={busy}
              disabled={!canPublish}
              aria-describedby={!canPublish ? "publish-help" : undefined}
              onClick={togglePublish}
            >
              {episode.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </div>
        {!canPublish && (
          <p id="publish-help" className="mt-3 text-sm text-amber-gold">
            This episode can&apos;t be published yet: add its YouTube link below and save, then publish.
          </p>
        )}
      </Panel>

      <EpisodeForm key={episode.id} episode={episode} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this episode?"
        confirmLabel="Delete episode"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await dispatch(deleteEpisode(episode.id)).unwrap();
          router.replace("/episodes");
        }}
      >
        <p>
          <strong>{episode.title}</strong> will be deleted permanently. This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
