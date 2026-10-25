"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/PageHeader";
import type { Episode } from "@/lib/api/types";
import { emptyToUndefined } from "@/lib/format";
import { podcastSeries } from "@/lib/podcast-series";
import { optionalSlug, YOUTUBE_MESSAGE, YOUTUBE_URL_PATTERN } from "@/lib/validation";
import { messageOf } from "@/store/helpers";
import { useAppDispatch } from "@/store/hooks";
import { createEpisode, updateEpisode } from "@/store/slices/episodesSlice";

const schema = z.object({
  title: z.string().trim().min(1, "Enter a title."),
  slug: optionalSlug,
  series: z.string().min(1, "Choose a series."),
  episodeNumber: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Enter a whole number, 1 or higher."),
  duration: z.string(),
  youtubeUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || YOUTUBE_URL_PATTERN.test(value), YOUTUBE_MESSAGE),
  description: z.string().trim().min(1, "Enter a description."),
  showNotes: z.array(z.object({ text: z.string() })),
  isFeatured: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function toFormValues(episode: Episode | undefined, defaultNumber: number): FormValues {
  return {
    title: episode?.title ?? "",
    slug: episode?.slug ?? "",
    series: episode?.series ?? "",
    episodeNumber: String(episode?.episodeNumber ?? defaultNumber),
    duration: episode?.duration ?? "",
    youtubeUrl: episode?.youtubeUrl ?? "",
    description: episode?.description ?? "",
    showNotes: (episode?.showNotes ?? []).map((text) => ({ text })),
    isFeatured: episode?.isFeatured ?? false,
  };
}

/** Create (no `episode`) or edit (with `episode`) form for a Listen episode. */
export default function EpisodeForm({
  episode,
  defaultNumber = 1,
}: {
  episode?: Episode;
  /** Pre-filled episode number for new episodes (the next one in line). */
  defaultNumber?: number;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(episode, defaultNumber),
  });

  const notes = useFieldArray({ control, name: "showNotes" });

  // An episode saved with a series the hardcoded list doesn't know about stays selectable.
  const unknownSeries = episode && !podcastSeries.some((series) => series.slug === episode.series);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSaved(false);
    const showNotes = values.showNotes.map((note) => note.text.trim()).filter(Boolean);
    try {
      if (episode) {
        const updated = await dispatch(
          updateEpisode({
            id: episode.id,
            body: {
              title: values.title,
              slug: emptyToUndefined(values.slug),
              series: values.series,
              episodeNumber: Number(values.episodeNumber),
              description: values.description,
              // null clears a value that was set before.
              duration: values.duration.trim() || null,
              youtubeUrl: values.youtubeUrl.trim() || null,
              showNotes,
              isFeatured: values.isFeatured,
            },
          }),
        ).unwrap();
        reset(toFormValues(updated, defaultNumber));
        setSaved(true);
      } else {
        const created = await dispatch(
          createEpisode({
            title: values.title,
            slug: emptyToUndefined(values.slug),
            series: values.series,
            episodeNumber: Number(values.episodeNumber),
            description: values.description,
            duration: emptyToUndefined(values.duration),
            youtubeUrl: emptyToUndefined(values.youtubeUrl),
            showNotes,
            isFeatured: values.isFeatured,
          }),
        ).unwrap();
        // Land on the edit screen, where the episode can be published.
        router.push(`/episodes/${created.id}`);
      }
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && <Alert>{submitError}</Alert>}
      {saved && <Alert tone="success">Saved.</Alert>}

      <Panel className="flex flex-col gap-5 p-6">
        <TextField label="Title" required error={errors.title?.message} {...register("title")} />
        <TextField
          label="Slug"
          error={errors.slug?.message}
          hint={
            episode
              ? "The episode's web address. Changing it breaks links to the old address."
              : "Leave empty to make it from the title."
          }
          {...register("slug")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Series"
            required
            hint="The series list is set on the website."
            error={errors.series?.message}
            {...register("series")}
          >
            <option value="">Choose a series…</option>
            {podcastSeries.map((series) => (
              <option key={series.slug} value={series.slug}>
                {series.name}
              </option>
            ))}
            {unknownSeries && (
              <option value={episode.series}>{episode.series} (not in the website&apos;s list)</option>
            )}
          </SelectField>
          <TextField
            label="Episode number"
            type="number"
            inputMode="numeric"
            min={1}
            required
            error={errors.episodeNumber?.message}
            {...register("episodeNumber")}
          />
        </div>
        <TextField
          label="Duration"
          hint='Shown as text, e.g. "41 min". Optional.'
          error={errors.duration?.message}
          {...register("duration")}
        />
        <TextAreaField label="Description" required error={errors.description?.message} {...register("description")} />
      </Panel>

      <Panel className="flex flex-col gap-5 p-6">
        <TextField
          label="YouTube link"
          type="url"
          placeholder="https://www.youtube.com/watch?v=…"
          hint="Episodes play from YouTube. An episode can't be published until this link is saved."
          error={errors.youtubeUrl?.message}
          {...register("youtubeUrl")}
        />
      </Panel>

      <Panel className="p-6">
        <h2 className="text-base font-semibold">Show notes</h2>
        <p className="mt-1 text-sm text-soft-white/70">Optional. One point per line item.</p>
        {notes.fields.length > 0 && (
          <ol className="mt-5 flex flex-col gap-4">
            {notes.fields.map((field, index) => (
              <li key={field.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <TextField label={`Note ${index + 1}`} {...register(`showNotes.${index}.text` as const)} />
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  className="mb-1"
                  onClick={() => notes.remove(index)}
                  aria-label={`Remove note ${index + 1}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ol>
        )}
        <Button variant="secondary" className="mt-5" onClick={() => notes.append({ text: "" })}>
          Add note
        </Button>
      </Panel>

      <Panel className="p-6">
        <CheckboxField
          label="Featured episode"
          hint="Shown first on the site. Featuring this one un-features the current featured episode."
          {...register("isFeatured")}
        />
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          {episode ? "Save changes" : "Create episode"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/episodes")} disabled={isSubmitting}>
          {episode ? "Back to episodes" : "Cancel"}
        </Button>
      </div>
      {!episode && <p className="text-xs text-soft-white/60">New episodes start as drafts. Publish from the next screen.</p>}
    </form>
  );
}
