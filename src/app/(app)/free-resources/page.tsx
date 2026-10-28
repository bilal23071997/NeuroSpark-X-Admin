"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { PublishBadge } from "@/components/ui/StatusBadge";
import type { FreeResource } from "@/lib/api/types";
import { destinations, getDestinationName } from "@/lib/vault";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createFreeResource,
  deleteFreeResource,
  fetchFreeResources,
  updateFreeResource,
} from "@/store/slices/engagementSlice";

const schema = z.object({
  title: z.string().trim().min(1, "Enter a title."),
  description: z.string().trim().min(1, "Enter a description."),
  type: z.string().trim().min(1, "Enter a label, e.g. Guide."),
  destination: z.string(),
  url: z.string().trim().regex(/^https:\/\/\S+$/, "Enter a full https:// address."),
  isPublished: z.boolean(),
  sortOrder: z.string().trim().regex(/^-?\d+$/, "Enter a whole number, e.g. 0."),
});
type FormValues = z.infer<typeof schema>;

function ResourceForm({ resource, onDone }: { resource: FreeResource | null; onDone: () => void }) {
  const dispatch = useAppDispatch();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: resource?.Title ?? "",
      description: resource?.Description ?? "",
      type: resource?.Type ?? "",
      destination: resource?.Destination ?? "",
      url: resource?.Url ?? "",
      isPublished: resource?.IsPublished ?? false,
      sortOrder: String(resource?.SortOrder ?? 0),
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const body = {
      title: values.title,
      description: values.description,
      type: values.type,
      destination: values.destination || (resource ? null : undefined),
      url: values.url,
      isPublished: values.isPublished,
      sortOrder: Number(values.sortOrder),
    };
    try {
      if (resource) await dispatch(updateFreeResource({ id: resource.Id, body })).unwrap();
      else await dispatch(createFreeResource(body)).unwrap();
      onDone();
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {submitError && <Alert>{submitError}</Alert>}
      <TextField label="Title" required error={errors.title?.message} {...register("title")} />
      <TextAreaField label="Description" required error={errors.description?.message} {...register("description")} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Type label" required placeholder="Guide" error={errors.type?.message} {...register("type")} />
        <SelectField label="Ecosystem destination" {...register("destination")}>
          <option value="">None</option>
          {destinations.map((destination) => (
            <option key={destination.slug} value={destination.slug}>
              {destination.name}
            </option>
          ))}
        </SelectField>
      </div>
      <TextField
        label="Link"
        type="url"
        required
        placeholder="https://…"
        hint="Where the free file or page lives. Free items only: paid files never go here."
        error={errors.url?.message}
        {...register("url")}
      />
      <TextField
        label="Sort order"
        type="number"
        inputMode="numeric"
        hint="Lower numbers show first."
        error={errors.sortOrder?.message}
        {...register("sortOrder")}
      />
      <CheckboxField label="Published" hint="Only published resources appear on the site." {...register("isPublished")} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {resource ? "Save resource" : "Create resource"}
        </Button>
      </div>
    </form>
  );
}

export default function FreeResourcesPage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.engagement.freeResources);

  // `undefined` = dialog closed, `null` = creating, a resource = editing it.
  const [editing, setEditing] = useState<FreeResource | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<FreeResource | null>(null);

  useEffect(() => {
    dispatch(fetchFreeResources());
  }, [dispatch]);

  return (
    <>
      <PageHeader
        title="Free resources"
        description="Free downloads offered as lead magnets. Only published ones appear on the site."
        actions={<Button onClick={() => setEditing(null)}>New resource</Button>}
      />

      {error && <Alert className="mb-5">{error}</Alert>}

      <Panel className="overflow-hidden">
        {status === "loading" && items.length === 0 ? (
          <LoadingBlock />
        ) : items.length === 0 && status !== "failed" ? (
          <EmptyState title="No free resources yet" action={<Button onClick={() => setEditing(null)}>Add the first one</Button>}>
            Nothing is shown on the site until you add and publish one.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Free resources</caption>
              <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Resource</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Destination</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-white/10">
                {items.map((resource) => (
                  <tr key={resource.Id} className="align-middle">
                    <td className="px-5 py-4">
                      <span className="font-medium">{resource.Title}</span>
                      <p className="mt-0.5 text-xs text-soft-white/60">
                        {resource.Type} · order {resource.SortOrder}
                      </p>
                    </td>
                    <td className="hidden px-5 py-4 text-soft-white/80 md:table-cell">
                      {getDestinationName(resource.Destination)}
                    </td>
                    <td className="px-5 py-4">
                      <PublishBadge status={resource.IsPublished ? "published" : "draft"} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(resource)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setToDelete(resource)}>
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
        title={editing ? "Edit free resource" : "New free resource"}
        wide
      >
        <ResourceForm key={editing?.Id ?? "new"} resource={editing ?? null} onDone={() => setEditing(undefined)} />
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this resource?"
        confirmLabel="Delete resource"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteFreeResource(toDelete!.Id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.Title}</strong> will be deleted permanently.
        </p>
      </ConfirmDialog>
    </>
  );
}
