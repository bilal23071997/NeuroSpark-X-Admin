"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ImageField } from "@/components/vault/UploadFields";
import type { Series } from "@/lib/api/types";
import { emptyToUndefined } from "@/lib/format";
import { optionalSlug } from "@/lib/validation";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchNiches } from "@/store/slices/nichesSlice";
import { createSeries, deleteSeries, fetchSeries, updateSeries } from "@/store/slices/seriesSlice";

const HTTPS = /^https:\/\/\S+$/;

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  slug: optionalSlug,
  nicheId: z.string().min(1, "Choose a main section."),
  description: z.string(),
  label: z.string().trim().max(40, "Use 40 characters or fewer."),
  coverImageUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || HTTPS.test(value), "Enter a full https:// address."),
  sortOrder: z.string().trim().regex(/^-?\d+$/, "Enter a whole number, e.g. 0."),
});
type FormValues = z.infer<typeof schema>;

function SeriesForm({ series, onDone }: { series: Series | null; onDone: () => void }) {
  const dispatch = useAppDispatch();
  const niches = useAppSelector((state) => state.niches.items);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: series?.Name ?? "",
      slug: series?.Slug ?? "",
      nicheId: series?.NicheId ?? "",
      description: series?.Description ?? "",
      label: series?.Label ?? "",
      coverImageUrl: series?.CoverImageUrl ?? "",
      sortOrder: String(series?.SortOrder ?? 0),
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const body = {
      name: values.name,
      slug: emptyToUndefined(values.slug),
      nicheId: values.nicheId,
      description: values.description.trim(),
      // null clears a value that was set before.
      label: values.label.trim() || null,
      coverImageUrl: values.coverImageUrl.trim() || null,
      sortOrder: Number(values.sortOrder),
    };
    try {
      if (series) await dispatch(updateSeries({ id: series.Id, body })).unwrap();
      else await dispatch(createSeries(body)).unwrap();
      onDone();
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {submitError && <Alert>{submitError}</Alert>}
      <TextField label="Name" required error={errors.name?.message} {...register("name")} />
      <SelectField
        label="Main section"
        required
        hint="The niche this series sits under, e.g. Astrology."
        error={errors.nicheId?.message}
        {...register("nicheId")}
      >
        <option value="">Choose a main section…</option>
        {niches.map((niche) => (
          <option key={niche.Id} value={niche.Id}>
            {niche.Name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Slug"
        error={errors.slug?.message}
        hint={series ? "Used in the series web address." : "Leave empty to make it from the name."}
        {...register("slug")}
      />
      <TextAreaField label="Description" hint="Shown at the top of the series page." {...register("description")} />
      <TextField
        label="Label"
        hint="Optional short tag, e.g. Learning path, Story or Life event."
        error={errors.label?.message}
        {...register("label")}
      />
      <Controller
        control={control}
        name="coverImageUrl"
        render={({ field }) => (
          <ImageField
            label="Cover image"
            value={field.value}
            onChange={field.onChange}
            error={errors.coverImageUrl?.message}
            hint="Optional. Shown on the series card and page."
          />
        )}
      />
      <TextField
        label="Sort order"
        type="number"
        inputMode="numeric"
        hint="Lower numbers show first."
        error={errors.sortOrder?.message}
        {...register("sortOrder")}
      />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {series ? "Save series" : "Create series"}
        </Button>
      </div>
    </form>
  );
}

export default function SeriesPage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.series);
  const niches = useAppSelector((state) => state.niches.items);
  const nichesCount = niches.length;

  // `undefined` = dialog closed, `null` = creating, a series = editing it.
  const [editing, setEditing] = useState<Series | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Series | null>(null);

  // Series grouped under their main section, in the order of the niches.
  const sections = niches
    .map((niche) => ({ niche, series: items.filter((item) => item.NicheId === niche.Id) }))
    .filter((section) => section.series.length > 0);

  useEffect(() => {
    dispatch(fetchSeries());
    dispatch(fetchNiches());
  }, [dispatch]);

  return (
    <>
      <PageHeader
        title="Series"
        description="Ordered runs of articles inside a main section (niche), such as a learning path or a story. Add an article to a series from the article's own page."
        actions={
          <Button onClick={() => setEditing(null)} disabled={nichesCount === 0}>
            New series
          </Button>
        }
      />

      {error && <Alert className="mb-5">{error}</Alert>}
      {nichesCount === 0 && status === "succeeded" && (
        <Alert tone="warning" className="mb-5">
          Create a niche first: every series sits under one.
        </Alert>
      )}

      {status === "loading" && items.length === 0 ? (
        <Panel>
          <LoadingBlock />
        </Panel>
      ) : items.length === 0 && status !== "failed" ? (
        <Panel>
          <EmptyState title="No series yet">A series groups articles in order, e.g. Astrology &gt; Sidereal.</EmptyState>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map(({ niche, series }) => (
            <Panel key={niche.Id} className="overflow-hidden">
              {/* One collapsible block per main section, so a long list stays easy to scan. */}
              <details open className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3">
                    <ChevronDown
                      aria-hidden
                      className="h-4 w-4 text-soft-white/60 transition-transform group-not-open:-rotate-90"
                    />
                    <span className="font-semibold">{niche.Name}</span>
                  </span>
                  <span className="text-xs text-soft-white/60">
                    {series.length} in this section
                  </span>
                </summary>
                <div className="overflow-x-auto border-t border-soft-white/10">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Series in {niche.Name}</caption>
                    <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-medium">Name</th>
                        <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Label</th>
                        <th scope="col" className="px-5 py-3 font-medium">Order</th>
                        <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft-white/10">
                      {series.map((item) => (
                        <tr key={item.Id} className="align-middle">
                          <td className="px-5 py-4">
                            <span className="font-medium">{item.Name}</span>
                            <p className="mt-0.5 text-xs text-soft-white/60">/{item.Slug}</p>
                          </td>
                          <td className="hidden px-5 py-4 text-soft-white/80 md:table-cell">{item.Label ?? "—"}</td>
                          <td className="px-5 py-4 text-soft-white/80">{item.SortOrder}</td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setEditing(item)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => setToDelete(item)}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Edit series" : "New series"}
      >
        {/* Keyed so each open starts from the right series' values. */}
        <SeriesForm key={editing?.Id ?? "new"} series={editing ?? null} onDone={() => setEditing(undefined)} />
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this series?"
        confirmLabel="Delete series"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteSeries(toDelete!.Id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.Name}</strong> will be deleted. A series that still has articles can&apos;t be deleted:
          take those articles out of it first.
        </p>
      </ConfirmDialog>
    </>
  );
}
