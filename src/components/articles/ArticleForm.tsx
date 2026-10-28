"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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

const schema = z.object({
  title: z.string().trim().min(1, "Enter a title."),
  slug: optionalSlug,
  excerpt: z.string().trim().min(1, "Enter a short excerpt."),
  body: z.string().trim().min(1, "Write the article text."),
  nicheId: z.string().min(1, "Choose a niche."),
  isFeatured: z.boolean(),
  seoTitle: z.string(),
  seoDescription: z.string(),
});
type FormValues = z.infer<typeof schema>;

function toFormValues(article?: Article): FormValues {
  return {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    // Older articles were saved as paragraphs: a blank line between them is the same thing in Markdown.
    body: article?.body.join("\n\n") ?? "",
    nicheId: article?.nicheId ?? "",
    isFeatured: article?.isFeatured ?? false,
    seoTitle: article?.seoTitle ?? "",
    seoDescription: article?.seoDescription ?? "",
  };
}

/** Create (no `article`) or edit (with `article`) form for an Insights article. */
export default function ArticleForm({ article }: { article?: Article }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const niches = useAppSelector((state) => state.niches);
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
  }, [dispatch]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSaved(false);
    const body = [values.body.trim()];
    try {
      if (article) {
        const updated = await dispatch(
          updateArticle({
            id: article.id,
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
          }),
        ).unwrap();
        // Land on the edit screen, where the article can be published.
        router.push(`/articles/${created.id}`);
      }
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

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
            <option key={niche.id} value={niche.id}>
              {niche.name}
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
