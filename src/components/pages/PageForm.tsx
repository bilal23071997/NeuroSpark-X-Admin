"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/PageHeader";
import type { SitePage } from "@/lib/api/types";
import { SLUG_MESSAGE, SLUG_PATTERN } from "@/lib/validation";
import { messageOf } from "@/store/helpers";
import { useAppDispatch } from "@/store/hooks";
import { createPage, updatePage } from "@/store/slices/pagesSlice";

const schema = z.object({
  slug: z.string().trim().min(1, "Enter the page address.").max(60, "Use 60 characters or fewer.").regex(SLUG_PATTERN, SLUG_MESSAGE),
  title: z.string().trim().min(1, "Enter a title.").max(200, "Use 200 characters or fewer."),
  body: z.string().trim().min(1, "Write the page text."),
});
type FormValues = z.infer<typeof schema>;

const SUGGESTED_SLUGS = ["privacy", "terms"];

/** The body is plain text: a blank line starts a new paragraph, and a paragraph starting with "## " is a heading. */
function parseBody(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      block.startsWith("## ") ? { heading: true, text: block.slice(3).trim() } : { heading: false, text: block },
    );
}

export function PagePreview({ title, body }: { title: string; body: string }) {
  const blocks = parseBody(body);
  return (
    <div className="rounded-xl border border-soft-white/10 bg-void-black p-5">
      <h3 className="text-xl font-semibold">{title || "Page title"}</h3>
      {blocks.length === 0 ? (
        <p className="mt-3 text-sm text-soft-white/60">The page text will appear here as you type.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {blocks.map((block, index) =>
            block.heading ? (
              <h4 key={index} className="mt-2 text-base font-semibold">
                {block.text}
              </h4>
            ) : (
              <p key={index} className="text-sm leading-6 whitespace-pre-line text-soft-white/80">
                {block.text}
              </p>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** Create (no `page`) or edit (with `page`) form for a standalone site page such as /privacy. */
export default function PageForm({ page }: { page?: SitePage }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { slug: page?.slug ?? "", title: page?.title ?? "", body: page?.body ?? "" },
  });

  const title = useWatch({ control, name: "title" });
  const body = useWatch({ control, name: "body" });
  const slug = useWatch({ control, name: "slug" });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSaved(false);
    try {
      if (page) {
        const updated = await dispatch(updatePage({ id: page.id, body: values })).unwrap();
        reset({ slug: updated.slug, title: updated.title, body: updated.body });
        setSaved(true);
      } else {
        const created = await dispatch(createPage(values)).unwrap();
        router.push(`/site-pages/${created.id}`);
      }
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && <Alert>{submitError}</Alert>}
      {saved && <Alert tone="success">Saved.</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="flex flex-col gap-5 p-6">
          <TextField label="Title" required error={errors.title?.message} {...register("title")} />
          <div>
            <TextField
              label="Page address (slug)"
              required
              hint={`The page lives at /${slug || "your-slug"} on the website.${page ? " Changing it breaks links to the old address." : ""}`}
              error={errors.slug?.message}
              {...register("slug")}
            />
            {!page && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-soft-white/60">
                Suggested:
                {SUGGESTED_SLUGS.map((slug) => (
                  <Button key={slug} size="sm" variant="secondary" onClick={() => setValue("slug", slug, { shouldValidate: true })}>
                    {slug}
                  </Button>
                ))}
              </p>
            )}
          </div>
          <TextAreaField
            label="Page text"
            required
            className="min-h-80 font-mono"
            hint='Plain text. Leave a blank line between paragraphs. Start a paragraph with "## " to make it a heading.'
            error={errors.body?.message}
            {...register("body")}
          />
        </Panel>

        <Panel className="p-6">
          <h2 className="text-base font-semibold">Preview</h2>
          <p className="mt-1 mb-4 text-xs text-soft-white/60">Roughly how the text is split into headings and paragraphs.</p>
          <PagePreview title={title} body={body} />
        </Panel>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          {page ? "Save changes" : "Create page"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/site-pages")} disabled={isSubmitting}>
          {page ? "Back to pages" : "Cancel"}
        </Button>
      </div>
      {!page && <p className="text-xs text-soft-white/60">New pages start as drafts. Publish from the next screen.</p>}
    </form>
  );
}
