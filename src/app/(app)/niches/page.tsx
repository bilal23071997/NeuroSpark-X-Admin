"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TextAreaField, TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import type { Niche } from "@/lib/api/types";
import { emptyToUndefined } from "@/lib/format";
import { optionalSlug } from "@/lib/validation";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createNiche, deleteNiche, fetchNiches, updateNiche } from "@/store/slices/nichesSlice";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  slug: optionalSlug,
  description: z.string(),
  sortOrder: z.string().trim().regex(/^-?\d+$/, "Enter a whole number, e.g. 0."),
});
type FormValues = z.infer<typeof schema>;

function NicheForm({ niche, onDone }: { niche: Niche | null; onDone: () => void }) {
  const dispatch = useAppDispatch();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: niche?.name ?? "",
      slug: niche?.slug ?? "",
      description: niche?.description ?? "",
      sortOrder: String(niche?.sortOrder ?? 0),
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const body = {
      name: values.name,
      slug: emptyToUndefined(values.slug),
      description: values.description.trim(),
      sortOrder: Number(values.sortOrder),
    };
    try {
      if (niche) await dispatch(updateNiche({ id: niche.id, body })).unwrap();
      else await dispatch(createNiche(body)).unwrap();
      onDone();
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {submitError && <Alert>{submitError}</Alert>}
      <TextField label="Name" required error={errors.name?.message} {...register("name")} />
      <TextField
        label="Slug"
        error={errors.slug?.message}
        hint={niche ? "Used in web addresses and filters." : "Leave empty to make it from the name."}
        {...register("slug")}
      />
      <TextAreaField label="Description" hint="Optional." {...register("description")} />
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
          {niche ? "Save niche" : "Create niche"}
        </Button>
      </div>
    </form>
  );
}

export default function NichesPage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.niches);

  // `undefined` = dialog closed, `null` = creating, a niche = editing it.
  const [editing, setEditing] = useState<Niche | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Niche | null>(null);

  useEffect(() => {
    dispatch(fetchNiches());
  }, [dispatch]);

  return (
    <>
      <PageHeader
        title="Niches"
        description="The topic areas inside the ecosystem that Insights articles are filed under."
        actions={<Button onClick={() => setEditing(null)}>New niche</Button>}
      />

      {error && <Alert className="mb-5">{error}</Alert>}

      <Panel className="overflow-hidden">
        {status === "loading" && items.length === 0 ? (
          <LoadingBlock />
        ) : items.length === 0 && status !== "failed" ? (
          <EmptyState
            title="No niches yet"
            action={<Button onClick={() => setEditing(null)}>Create the first niche</Button>}
          >
            Articles are filed under a niche, so create at least one before writing.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Niches</caption>
              <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Name</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Description</th>
                  <th scope="col" className="px-5 py-3 font-medium">Order</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-white/10">
                {items.map((niche) => (
                  <tr key={niche.id} className="align-middle">
                    <td className="px-5 py-4">
                      <span className="font-medium">{niche.name}</span>
                      <p className="mt-0.5 text-xs text-soft-white/60">/{niche.slug}</p>
                    </td>
                    <td className="hidden max-w-sm px-5 py-4 text-soft-white/80 md:table-cell">
                      {niche.description || "—"}
                    </td>
                    <td className="px-5 py-4 text-soft-white/80">{niche.sortOrder}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(niche)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setToDelete(niche)}>
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

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Edit niche" : "New niche"}
      >
        {/* Keyed so each open starts from the right niche's values. */}
        <NicheForm key={editing?.id ?? "new"} niche={editing ?? null} onDone={() => setEditing(undefined)} />
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this niche?"
        confirmLabel="Delete niche"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteNiche(toDelete!.id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.name}</strong> will be deleted. A niche that still has articles can&apos;t be deleted:
          move or delete those articles first.
        </p>
      </ConfirmDialog>
    </>
  );
}
