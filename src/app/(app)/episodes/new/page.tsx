"use client";

import Link from "next/link";
import { useEffect } from "react";
import EpisodeForm from "@/components/episodes/EpisodeForm";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEpisodes } from "@/store/slices/episodesSlice";

export default function NewEpisodePage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.episodes);

  // The existing episodes decide the pre-filled number (highest + 1).
  useEffect(() => {
    dispatch(fetchEpisodes());
  }, [dispatch]);

  const nextNumber = items.reduce((max, episode) => Math.max(max, episode.episodeNumber), 0) + 1;

  return (
    <>
      <PageHeader
        title="New episode"
        description="Add the episode's details and its YouTube link, then publish when it's ready."
        actions={
          <Link href="/episodes" className="text-sm text-soft-white/70 hover:text-soft-white">
            ← All episodes
          </Link>
        }
      />
      {status === "failed" ? (
        <Alert>{error}</Alert>
      ) : status !== "succeeded" ? (
        <LoadingBlock />
      ) : (
        <EpisodeForm defaultNumber={nextNumber} />
      )}
    </>
  );
}
