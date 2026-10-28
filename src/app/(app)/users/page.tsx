"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SelectField, TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ActiveBadge, Badge } from "@/components/ui/StatusBadge";
import type { RoleName, StaffUser } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { PASSWORD_MIN } from "@/lib/validation";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createUser, fetchRoles, fetchUsers, updateUser } from "@/store/slices/usersSlice";

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`),
  role: z.string().min(1, "Choose a role."),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  role: z.string().min(1, "Choose a role."),
  password: z
    .string()
    .refine((value) => value === "" || value.length >= PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`),
});
type EditValues = z.infer<typeof editSchema>;

function useRoleOptions() {
  const roles = useAppSelector((state) => state.users.roles);
  return roles;
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const dispatch = useAppDispatch();
  const roles = useRoleOptions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "", role: "editor" },
  });

  async function onSubmit(values: CreateValues) {
    setSubmitError(null);
    try {
      await dispatch(createUser({ ...values, role: values.role as RoleName })).unwrap();
      onDone();
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {submitError && <Alert>{submitError}</Alert>}
      <TextField label="Name" required autoComplete="off" error={errors.name?.message} {...register("name")} />
      <TextField
        label="Email"
        type="email"
        required
        autoComplete="off"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Temporary password"
        type="password"
        required
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN} characters. Share it securely; they can change it after signing in.`}
        error={errors.password?.message}
        {...register("password")}
      />
      <SelectField
        label="Role"
        required
        hint="Admins manage users as well as content. Editors manage content only."
        error={errors.role?.message}
        {...register("role")}
      >
        {roles.items.map((role) => (
          <option key={role.Id} value={role.Name}>
            {role.Name === "admin" ? "Admin" : "Editor"}
          </option>
        ))}
      </SelectField>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create account
        </Button>
      </div>
    </form>
  );
}

function EditUserForm({ user, isSelf, onDone }: { user: StaffUser; isSelf: boolean; onDone: () => void }) {
  const dispatch = useAppDispatch();
  const roles = useRoleOptions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: user.Name, role: user.Role.Name, password: "" },
  });

  async function onSubmit(values: EditValues) {
    setSubmitError(null);
    try {
      await dispatch(
        updateUser({
          id: user.Id,
          body: {
            name: values.name,
            // You can't change your own role here: demoting yourself could lock the portal out of admins.
            role: isSelf ? undefined : (values.role as RoleName),
            password: values.password || undefined,
          },
        }),
      ).unwrap();
      onDone();
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {submitError && <Alert>{submitError}</Alert>}
      <p className="text-sm text-soft-white/70">{user.Email}</p>
      <TextField label="Name" required error={errors.name?.message} {...register("name")} />
      <SelectField
        label="Role"
        required
        disabled={isSelf}
        hint={isSelf ? "You can't change your own role." : undefined}
        error={errors.role?.message}
        {...register("role")}
      >
        {roles.items.map((role) => (
          <option key={role.Id} value={role.Name}>
            {role.Name === "admin" ? "Admin" : "Editor"}
          </option>
        ))}
      </SelectField>
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        hint={`Leave empty to keep the current one. Setting a new password signs them out everywhere.`}
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.auth.user);
  const { items, status, error, roles } = useAppSelector((state) => state.users);
  const isAdmin = me?.Role === "admin";

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [toggling, setToggling] = useState<StaffUser | null>(null);

  useEffect(() => {
    // Editors never call these (the API would answer 403).
    if (!isAdmin) return;
    dispatch(fetchUsers());
    dispatch(fetchRoles());
  }, [dispatch, isAdmin]);

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Users" />
        <Alert tone="warning">Only admins can manage staff accounts.</Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Staff who can sign in to this portal. Create accounts for editors, change roles, or deactivate access."
        actions={<Button onClick={() => setCreating(true)}>New staff account</Button>}
      />

      {(error || roles.error) && <Alert className="mb-5">{error ?? roles.error}</Alert>}

      <Panel className="overflow-hidden">
        {status === "loading" && items.length === 0 ? (
          <LoadingBlock />
        ) : items.length === 0 && status !== "failed" ? (
          <EmptyState title="No staff accounts" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Staff accounts</caption>
              <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Person</th>
                  <th scope="col" className="px-5 py-3 font-medium">Role</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium lg:table-cell">Created</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-white/10">
                {items.map((user) => {
                  const isSelf = user.Id === me?.Id;
                  return (
                    <tr key={user.Id} className="align-middle">
                      <td className="px-5 py-4">
                        <span className="font-medium">{user.Name}</span>
                        {isSelf && (
                          <span className="ml-2 align-middle">
                            <Badge>You</Badge>
                          </span>
                        )}
                        <p className="mt-0.5 text-xs text-soft-white/60">{user.Email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={user.Role.Name === "admin" ? "violet" : "neutral"}>
                          {user.Role.Name === "admin" ? "Admin" : "Editor"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <ActiveBadge isActive={user.IsActive} />
                      </td>
                      <td className="hidden px-5 py-4 text-soft-white/80 lg:table-cell">
                        {formatDate(user.CreatedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setEditing(user)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={user.IsActive ? "danger" : "secondary"}
                            disabled={isSelf}
                            title={isSelf ? "You can't deactivate your own account" : undefined}
                            onClick={() => setToggling(user)}
                          >
                            {user.IsActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal open={creating} onClose={() => setCreating(false)} title="New staff account">
        <CreateUserForm onDone={() => setCreating(false)} />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit staff account">
        {editing && (
          <EditUserForm key={editing.Id} user={editing} isSelf={editing.Id === me?.Id} onDone={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={toggling !== null}
        title={toggling?.IsActive ? "Deactivate this account?" : "Activate this account?"}
        confirmLabel={toggling?.IsActive ? "Deactivate" : "Activate"}
        danger={toggling?.IsActive ?? false}
        onClose={() => setToggling(null)}
        onConfirm={() => dispatch(updateUser({ id: toggling!.Id, body: { isActive: !toggling!.IsActive } })).unwrap()}
      >
        <p>
          {toggling?.IsActive
            ? `${toggling?.Name} will be signed out and won't be able to sign in until you activate the account again.`
            : `${toggling?.Name} will be able to sign in again.`}
        </p>
      </ConfirmDialog>
    </>
  );
}
