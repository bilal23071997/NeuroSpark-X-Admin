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
import type { Episode, PublishStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { getSeriesName, podcastSeries } from "@/lib/podcast-series";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteEpisode,
  fetchEpisodes,
  publishEpisode,
  unpublishEpisode,
} from "@/store/slices/episodesSlice";

export default function EpisodesPage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.episodes);

  const [statusFilter, setStatusFilter] = useState<"" | PublishStatus>("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Episode | null>(null);

  useEffect(() => {
    dispatch(
      fetchEpisodes({
        status: statusFilter || undefined,
        series: seriesFilter || undefined,
      }),
    );
  }, [dispatch, statusFilter, seriesFilter]);

  async function togglePublish(episode: Episode) {
    setBusyId(episode.Id);
    setActionError(null);
    try {
      await dispatch((episode.Status === "published" ? unpublishEpisode : publishEpisode)(episode.Id)).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = statusFilter !== "" || seriesFilter !== "";

  return (
    <>
      <PageHeader
        title="Episodes"
        description="Listen episodes, grouped by series. Each episode plays from a YouTube link."
        actions={<ButtonLink href="/episodes/new">New episode</ButtonLink>}
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
        <FilterSelect label="Series" value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)}>
          <option value="">All series</option>
          {podcastSeries.map((series) => (
            <option key={series.slug} value={series.slug}>
              {series.name}
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
            title={filtered ? "No episodes match these filters" : "No episodes yet"}
            action={!filtered && <ButtonLink href="/episodes/new">Add the first episode</ButtonLink>}
          >
            {filtered ? "Try a different status or series." : "Episodes you create will appear here."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Episodes</caption>
              <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Episode</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Series</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium lg:table-cell">Published</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-white/10">
                {items.map((episode) => (
                  <tr key={episode.Id} className="align-middle">
                    <td className="px-5 py-4">
                      <Link href={`/episodes/${episode.Id}`} className="font-medium hover:text-indigo-text">
                        #{episode.EpisodeNumber} · {episode.Title}
                      </Link>
                      {episode.IsFeatured && (
                        <span className="ml-2 align-middle">
                          <Badge tone="violet">Featured</Badge>
                        </span>
                      )}
                      {!episode.YoutubeUrl && (
                        <span className="ml-2 align-middle">
                          <Badge tone="amber">No YouTube link</Badge>
                        </span>
                      )}
                    </td>
                    <td className="hidden px-5 py-4 text-soft-white/80 md:table-cell">
                      {getSeriesName(episode.Series)}
                    </td>
                    <td className="px-5 py-4">
                      <PublishBadge status={episode.Status} />
                    </td>
                    <td className="hidden px-5 py-4 text-soft-white/80 lg:table-cell">
                      {formatDate(episode.PublishedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <ButtonLink href={`/episodes/${episode.Id}`} variant="secondary" size="sm">
                          Edit
                        </ButtonLink>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyId === episode.Id}
                          disabled={episode.Status === "draft" && !episode.YoutubeUrl}
                          title={
                            episode.Status === "draft" && !episode.YoutubeUrl
                              ? "Add a YouTube link before publishing"
                              : undefined
                          }
                          onClick={() => togglePublish(episode)}
                        >
                          {episode.Status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setToDelete(episode)}>
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
        title="Delete this episode?"
        confirmLabel="Delete episode"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteEpisode(toDelete!.Id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.Title}</strong> will be deleted permanently. This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
