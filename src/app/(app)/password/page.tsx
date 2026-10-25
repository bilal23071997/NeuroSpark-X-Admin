"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import PageHeader, { Panel } from "@/components/ui/PageHeader";
import { PASSWORD_MIN } from "@/lib/validation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { changePassword, clearAuthError } from "@/store/slices/authSlice";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords don't match.",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one.",
  });
type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  return (
    <>
      <PageHeader title="Change password" description="Pick a new password for your own account." />

      <Panel className="max-w-lg p-6">
        <form
          onSubmit={handleSubmit(({ currentPassword, newPassword }) =>
            // On success the account is signed out everywhere, and the shell sends you to the login screen.
            dispatch(changePassword({ currentPassword, newPassword })),
          )}
          noValidate
          className="flex flex-col gap-5"
        >
          <Alert tone="info">After changing it you&apos;ll be signed out and asked to sign in with the new password.</Alert>
          {error && <Alert>{error}</Alert>}
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            hint={`At least ${PASSWORD_MIN} characters.`}
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Button type="submit" loading={status === "loading"} className="self-start">
            Change password
          </Button>
        </form>
      </Panel>
    </>
  );
}
