"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/PageHeader";
import RichTextEditor from "@/components/ui/RichTextEditor";
import type { Article } from "@/lib/api/types";
import { emptyToUndefined } from "@/lib/format";
import { optionalSlug } from "@/lib/validation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { messageOf } from "@/store/helpers";
import { createArticle, updateArticle } from "@/store/slices/articlesSlice";
import { fetchNiches } from "@/store/slices/nichesSlice";
import { fetchSeries } from "@/store/slices/seriesSlice";

const schema = z.object({
  title: z.string().trim().min(1, "Enter a title."),
  slug: optionalSlug,
  excerpt: z.string().trim().min(1, "Enter a short excerpt."),
  body: z.string().trim().min(1, "Write the article text."),
  nicheId: z.string().min(1, "Choose a niche."),
  isFeatured: z.boolean(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  seoKeywords: z.string().max(500, "Use 500 characters or fewer."),
  seriesId: z.string(),
  seriesOrder: z.string().trim().regex(/^(\d+)?$/, "Enter a whole number, e.g. 1."),
});
type FormValues = z.infer<typeof schema>;

function toFormValues(article?: Article): FormValues {
  return {
    title: article?.Title ?? "",
    slug: article?.Slug ?? "",
    excerpt: article?.Excerpt ?? "",
    // Older articles were saved as paragraphs: a blank line between them is the same thing in Markdown.
    body: article?.Body.join("\n\n") ?? "",
    nicheId: article?.NicheId ?? "",
    isFeatured: article?.IsFeatured ?? false,
    seoTitle: article?.SeoTitle ?? "",
    seoDescription: article?.SeoDescription ?? "",
    seoKeywords: article?.SeoKeywords ?? "",
    seriesId: article?.SeriesId ?? "",
    seriesOrder: article?.SeriesOrder ? String(article.SeriesOrder) : "",
  };
}

/** Create (no `article`) or edit (with `article`) form for an Insights article. */
export default function ArticleForm({ article }: { article?: Article }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const niches = useAppSelector((state) => state.niches);
  const allSeries = useAppSelector((state) => state.series.items);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(article) });

  useEffect(() => {
    dispatch(fetchNiches());
    dispatch(fetchSeries());
  }, [dispatch]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSaved(false);
    const body = [values.body.trim()];
    try {
      if (article) {
        const updated = await dispatch(
          updateArticle({
            id: article.Id,
            body: {
              title: values.title,
              slug: emptyToUndefined(values.slug),
              excerpt: values.excerpt,
              body,
              nicheId: values.nicheId,
              isFeatured: values.isFeatured,
              // null clears a field that was filled before.
              seoTitle: values.seoTitle.trim() || null,
              seoDescription: values.seoDescription.trim() || null,
              seoKeywords: values.seoKeywords.trim() || null,
              seriesId: values.seriesId || null,
              seriesOrder: values.seriesId && values.seriesOrder ? Number(values.seriesOrder) : null,
            },
          }),
        ).unwrap();
        reset(toFormValues(updated));
        setSaved(true);
      } else {
        const created = await dispatch(
          createArticle({
            title: values.title,
            slug: emptyToUndefined(values.slug),
            excerpt: values.excerpt,
            body,
            nicheId: values.nicheId,
            isFeatured: values.isFeatured,
            seoTitle: emptyToUndefined(values.seoTitle),
            seoDescription: emptyToUndefined(values.seoDescription),
            seoKeywords: emptyToUndefined(values.seoKeywords),
            seriesId: values.seriesId || undefined,
            seriesOrder: values.seriesId && values.seriesOrder ? Number(values.seriesOrder) : undefined,
          }),
        ).unwrap();
        // Land on the edit screen, where the article can be published.
        router.push(`/articles/${created.Id}`);
      }
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  const nicheId = useWatch({ control, name: "nicheId" });
  const seriesId = useWatch({ control, name: "seriesId" });
  // A series sits under one niche, so only that niche's series are offered (plus the current one, if the niche changed).
  const seriesChoices = allSeries.filter((item) => item.NicheId === nicheId || item.Id === article?.SeriesId);

  const noNiches = niches.status === "succeeded" && niches.items.length === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && <Alert>{submitError}</Alert>}
      {saved && <Alert tone="success">Saved.</Alert>}
      {noNiches && (
        <Alert tone="warning">
          There are no niches yet. <Link href="/niches" className="underline">Create a niche</Link> first, then come
          back to file this article under it.
        </Alert>
      )}

      <Panel className="flex flex-col gap-5 p-6">
        <TextField label="Title" required error={errors.title?.message} {...register("title")} />
        <TextField
          label="Slug"
          error={errors.slug?.message}
          hint={
            article
              ? "The article's web address. Changing it breaks links to the old address."
              : "Leave empty to make it from the title."
          }
          {...register("slug")}
        />
        <SelectField label="Niche" required error={errors.nicheId?.message} {...register("nicheId")}>
          <option value="">Choose a niche…</option>
          {niches.items.map((niche) => (
            <option key={niche.Id} value={niche.Id}>
              {niche.Name}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Excerpt"
          required
          hint="A one or two sentence summary shown in article lists."
          error={errors.excerpt?.message}
          {...register("excerpt")}
        />
      </Panel>

      <Panel className="flex flex-col gap-5 p-6">
        <h2 className="text-base font-semibold">Series</h2>
        <SelectField
          label="Series"
          hint={
            nicheId
              ? "Optional. Put this article in an ordered series under its main section."
              : "Choose a niche first."
          }
          {...register("seriesId")}
        >
          <option value="">Not in a series</option>
          {seriesChoices.map((item) => (
            <option key={item.Id} value={item.Id}>
              {item.Name}
            </option>
          ))}
        </SelectField>
        {seriesId && (
          <TextField
            label="Part number"
            type="number"
            inputMode="numeric"
            hint="Its place in the series: 1 is Part 1. Articles with the same number are ordered by publish date."
            error={errors.seriesOrder?.message}
            {...register("seriesOrder")}
          />
        )}
      </Panel>

      <Panel className="p-6">
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <RichTextEditor
              label="Body"
              required
              minHeight="min-h-96"
              hint="Use the toolbar for headings, bold, lists and links. Headings are optional."
              error={errors.body?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Panel>

      <Panel className="flex flex-col gap-5 p-6">
        <h2 className="text-base font-semibold">Search and display</h2>
        <CheckboxField
          label="Featured article"
          hint="Shown first on the site. Featuring this one un-features the current featured article."
          {...register("isFeatured")}
        />
        <TextField label="SEO title" hint="Optional. Overrides the title in search results." {...register("seoTitle")} />
        <TextAreaField
          label="SEO description"
          hint="Optional. Shown under the title in search results."
          {...register("seoDescription")}
        />
        <TextField
          label="SEO keywords"
          hint="Optional. Separate with commas, e.g. astrology, birth chart, vedic astrology."
          error={errors.seoKeywords?.message}
          {...register("seoKeywords")}
        />
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          {article ? "Save changes" : "Create article"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/articles")} disabled={isSubmitting}>
          {article ? "Back to articles" : "Cancel"}
        </Button>
      </div>
      {!article && <p className="text-xs text-soft-white/60">New articles start as drafts. Publish from the next screen.</p>}
    </form>
  );
}
