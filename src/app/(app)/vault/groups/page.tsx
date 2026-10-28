"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import SortableList from "@/components/ui/SortableList";
import { Badge } from "@/components/ui/StatusBadge";
import type { VaultGroup } from "@/lib/api/types";
import { emptyToUndefined } from "@/lib/format";
import { optionalSlug } from "@/lib/validation";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createGroup,
  deleteGroup,
  fetchGroups,
  previewSubGroupOrder,
  reorderSubGroups,
  updateGroup,
} from "@/store/slices/groupsSlice";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80, "Use 80 characters or fewer."),
  slug: optionalSlug,
  description: z.string().max(500, "Use 500 characters or fewer."),
  parentId: z.string(),
});
type FormValues = z.infer<typeof schema>;

/** What the dialog is doing: adding a sub-group (or, with no parent, a new top-level group), editing a group, or editing an official category's description. */
type Editing =
  | { mode: "create"; parent: VaultGroup | null }
  | { mode: "edit"; group: VaultGroup }
  | { mode: "official"; group: VaultGroup };

function GroupForm({ editing, parents, onDone }: { editing: Editing; parents: VaultGroup[]; onDone: () => void }) {
  const dispatch = useAppDispatch();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const group = editing.mode === "create" ? null : editing.group;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: group?.name ?? "",
      slug: group?.slug ?? "",
      description: group?.description ?? "",
      parentId: String(group?.parentId ?? (editing.mode === "create" ? (editing.parent?.id ?? "") : "")),
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      if (editing.mode === "create") {
        await dispatch(
          createGroup({
            name: values.name,
            slug: emptyToUndefined(values.slug),
            description: values.description.trim(),
            parentId: editing.parent?.id,
          }),
        ).unwrap();
      } else if (editing.mode === "official") {
        // An official category only accepts a new description.
        await dispatch(updateGroup({ id: editing.group.id, body: { description: values.description.trim() } })).unwrap();
      } else {
        await dispatch(
          updateGroup({
            id: editing.group.id,
            body: {
              name: values.name,
              slug: emptyToUndefined(values.slug),
              description: values.description.trim(),
              // A top-level group stays where it is.
              parentId: editing.group.parentId === null ? undefined : Number(values.parentId),
            },
          }),
        ).unwrap();
      }
      onDone();
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  const official = editing.mode === "official";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {submitError && <Alert>{submitError}</Alert>}
      {official ? (
        <p className="text-sm text-soft-white/80">
          <strong>{group?.name}</strong> is one of the five official categories. Its name, address and place can&apos;t
          change, but you can edit its description.
        </p>
      ) : (
        <>
          <TextField label="Name" required error={errors.name?.message} {...register("name")} />
          <TextField
            label="Slug"
            error={errors.slug?.message}
            hint={editing.mode === "edit" ? "Used in web addresses. Changing it breaks old links." : "Leave empty to make it from the name."}
            {...register("slug")}
          />
        </>
      )}
      <TextAreaField label="Description" hint="Optional." error={errors.description?.message} {...register("description")} />
      {editing.mode === "edit" && editing.group.parentId !== null && (
        <SelectField label="Sits under" hint="Moving a sub-group moves its products with it." {...register("parentId")}>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </SelectField>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {editing.mode === "create" ? (editing.parent ? "Add sub-group" : "Add group") : "Save"}
        </Button>
      </div>
    </form>
  );
}

function GroupsScreen() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.groups);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [toDelete, setToDelete] = useState<VaultGroup | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  async function move(parent: VaultGroup, from: number, to: number) {
    if (to < 0 || to >= parent.children.length) return;
    const ids = parent.children.map((child) => child.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    setReorderError(null);
    dispatch(previewSubGroupOrder({ parentId: parent.id, ids }));
    try {
      await dispatch(reorderSubGroups({ parentId: parent.id, ids })).unwrap();
    } catch (err) {
      setReorderError(messageOf(err));
      dispatch(fetchGroups()); // put the list back to what the API has
    }
  }

  return (
    <>
      <PageHeader
        title="Vault groups"
        description="The five official categories stay fixed at the top. Add your own groups after them, add sub-groups under any group to keep products organised, and drag sub-groups to set their order."
        actions={<Button onClick={() => setEditing({ mode: "create", parent: null })}>New group</Button>}
      />

      {(error || reorderError) && <Alert className="mb-5">{reorderError ?? error}</Alert>}

      {status === "loading" && items.length === 0 ? (
        <LoadingBlock />
      ) : items.length === 0 && status !== "failed" ? (
        <Panel>
          <EmptyState title="No categories found">The five official categories are created by the API on startup.</EmptyState>
        </Panel>
      ) : (
        <div className="flex flex-col gap-6">
          {items.map((category) => (
            <Panel key={category.id} className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-soft-white/10 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold">{category.name}</h2>
                    {category.isOfficial && (
                      <Badge tone="violet">
                        <span aria-hidden className="mr-1">🔒</span>Official
                      </Badge>
                    )}
                    <span className="text-xs text-soft-white/60">
                      {category.productCount} {category.productCount === 1 ? "product" : "products"}
                    </span>
                  </div>
                  {!category.isOfficial && <p className="mt-0.5 text-xs text-soft-white/60">/{category.slug}</p>}
                  <p className="mt-1.5 max-w-2xl text-sm text-soft-white/70">{category.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing({ mode: category.isOfficial ? "official" : "edit", group: category })}
                  >
                    {category.isOfficial ? "Edit description" : "Edit"}
                  </Button>
                  <Button size="sm" onClick={() => setEditing({ mode: "create", parent: category })}>
                    Add sub-group
                  </Button>
                  {!category.isOfficial && (
                    <Button size="sm" variant="danger" onClick={() => setToDelete(category)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {category.children.length === 0 ? (
                <p className="px-5 py-6 text-sm text-soft-white/60">No sub-groups yet.</p>
              ) : (
                <SortableList
                  className="divide-y divide-soft-white/10"
                  items={category.children}
                  getId={(child) => child.id}
                  getLabel={(child) => `sub-group ${child.name}`}
                  onMove={(from, to) => move(category, from, to)}
                  renderItem={(child, controls) => (
                    <div className="flex flex-wrap items-center gap-3 bg-panel px-3 py-3 sm:px-5">
                      {controls.handle}
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="font-medium">{child.name}</p>
                        <p className="text-xs text-soft-white/60">
                          /{child.slug} · {child.productCount} {child.productCount === 1 ? "product" : "products"}
                        </p>
                      </div>
                      {controls.buttons}
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing({ mode: "edit", group: child })}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setToDelete(child)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                />
              )}
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing?.mode === "create"
            ? editing.parent
              ? `New sub-group in ${editing.parent.name}`
              : "New group"
            : editing?.mode === "official"
              ? "Edit category description"
              : editing?.group.parentId === null
                ? "Edit group"
                : "Edit sub-group"
        }
      >
        {editing && (
          <GroupForm
            key={editing.mode + ("group" in editing ? editing.group.id : (editing.parent?.id ?? "top"))}
            editing={editing}
            parents={items}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title={toDelete?.parentId === null ? "Delete this group?" : "Delete this sub-group?"}
        confirmLabel={toDelete?.parentId === null ? "Delete group" : "Delete sub-group"}
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteGroup(toDelete!.id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.name}</strong> will be deleted. A group that still has products{toDelete?.parentId === null ? " or sub-groups" : ""} can&apos;t be deleted:
          move or delete those first.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function GroupsPage() {
  return (
    <RequireAdmin>
      <GroupsScreen />
    </RequireAdmin>
  );
}
