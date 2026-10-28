"use client";

import Link from "next/link";
import { useEffect } from "react";
import Alert from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { getSeriesName } from "@/lib/podcast-series";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchArticles } from "@/store/slices/articlesSlice";
import { fetchEpisodes } from "@/store/slices/episodesSlice";
import { fetchMessages, fetchSubscribers } from "@/store/slices/engagementSlice";
import { fetchNiches } from "@/store/slices/nichesSlice";
import { fetchProducts } from "@/store/slices/productsSlice";
import { fetchUsers } from "@/store/slices/usersSlice";

function Stat({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-soft-white/10 bg-panel p-5 transition-colors hover:border-electric-indigo/50 motion-reduce:transition-none"
    >
      <p className="text-sm text-soft-white/70">{label}</p>
      <p className="mt-2 font-heading text-3xl font-semibold">{value}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const articles = useAppSelector((state) => state.articles);
  const episodes = useAppSelector((state) => state.episodes);
  const niches = useAppSelector((state) => state.niches);
  const users = useAppSelector((state) => state.users);
  const products = useAppSelector((state) => state.products);
  const messages = useAppSelector((state) => state.engagement.messages);
  const subscribers = useAppSelector((state) => state.engagement.subscribers);
  const isAdmin = user?.Role === "admin";

  useEffect(() => {
    dispatch(fetchArticles());
    dispatch(fetchEpisodes());
    dispatch(fetchNiches());
    if (isAdmin) {
      dispatch(fetchUsers());
      dispatch(fetchProducts());
      dispatch(fetchMessages());
      dispatch(fetchSubscribers());
    }
  }, [dispatch, isAdmin]);

  const loading = articles.status !== "succeeded" || episodes.status !== "succeeded";
  const failed = articles.error ?? episodes.error;

  const draftArticles = articles.items.filter((article) => article.Status === "draft");
  const draftEpisodes = episodes.items.filter((episode) => episode.Status === "draft");
  const published = (items: { Status: string }[]) => items.filter((item) => item.Status === "published").length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${user ? `, ${user.Name}` : ""}. Here is where the site's content stands.`}
        actions={
          <>
            <ButtonLink href="/articles/new">New article</ButtonLink>
            <ButtonLink href="/episodes/new" variant="secondary">
              New episode
            </ButtonLink>
            {isAdmin && (
              <ButtonLink href="/vault/products/new" variant="secondary">
                New product
              </ButtonLink>
            )}
          </>
        }
      />

      {failed && <Alert className="mb-6">{failed}</Alert>}

      {loading && !failed ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Published articles" value={published(articles.items)} href="/articles" />
            <Stat label="Draft articles" value={draftArticles.length} href="/articles" />
            <Stat label="Niches" value={niches.items.length} href="/niches" />
            <Stat label="Published episodes" value={published(episodes.items)} href="/episodes" />
            <Stat label="Draft episodes" value={draftEpisodes.length} href="/episodes" />
            {isAdmin && <Stat label="Staff accounts" value={users.items.length} href="/users" />}
            {isAdmin && products.status === "succeeded" && (
              <>
                <Stat label="Published products" value={published(products.items)} href="/vault/products" />
                <Stat label="Draft products" value={products.items.filter((p) => p.Status === "draft").length} href="/vault/products" />
              </>
            )}
            {isAdmin && messages.status === "succeeded" && (
              <Stat label="Unread messages" value={messages.items.filter((m) => !m.IsRead).length} href="/messages" />
            )}
            {isAdmin && subscribers.status === "succeeded" && (
              <Stat label="Newsletter subscribers" value={subscribers.items.filter((s) => s.IsSubscribed).length} href="/newsletter" />
            )}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Panel>
              <h2 className="border-b border-soft-white/10 px-5 py-4 text-base font-semibold">Draft articles</h2>
              {draftArticles.length === 0 ? (
                <EmptyState title="No drafts">Everything you have written is published.</EmptyState>
              ) : (
                <ul className="divide-y divide-soft-white/10">
                  {draftArticles.slice(0, 5).map((article) => (
                    <li key={article.Id}>
                      <Link
                        href={`/articles/${article.Id}`}
                        className="block px-5 py-3 hover:bg-soft-white/5"
                      >
                        <span className="block text-sm font-medium">{article.Title}</span>
                        <span className="text-xs text-soft-white/60">{article.Niche.Name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <h2 className="border-b border-soft-white/10 px-5 py-4 text-base font-semibold">Draft episodes</h2>
              {draftEpisodes.length === 0 ? (
                <EmptyState title="No drafts">Every episode is published.</EmptyState>
              ) : (
                <ul className="divide-y divide-soft-white/10">
                  {draftEpisodes.slice(0, 5).map((episode) => (
                    <li key={episode.Id}>
                      <Link
                        href={`/episodes/${episode.Id}`}
                        className="block px-5 py-3 hover:bg-soft-white/5"
                      >
                        <span className="block text-sm font-medium">
                          #{episode.EpisodeNumber} · {episode.Title}
                        </span>
                        <span className="text-xs text-soft-white/60">
                          {getSeriesName(episode.Series)}
                          {!episode.YoutubeUrl && " · needs a YouTube link"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
