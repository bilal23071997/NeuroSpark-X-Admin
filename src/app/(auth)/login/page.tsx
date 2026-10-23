"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { LoadingBlock } from "@/components/ui/Spinner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuthError, login } from "@/store/slices/authSlice";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { session, status, error, notice } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (session === "authenticated") router.replace("/");
  }, [session, router]);

  // Don't leave a stale error from a previous visit on the screen.
  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  if (session === "checking" || session === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingBlock label="Checking your session…" />
      </div>
    );
  }

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/brand/logo.png" alt="NeuroSpark X" width={72} height={72} className="h-18 w-18 object-contain" priority />
          <h1 className="mt-4 text-2xl font-semibold">Admin sign in</h1>
          <p className="mt-1 text-sm text-soft-white/70">NeuroSpark X content portal</p>
        </div>

        <form
          onSubmit={handleSubmit((values) => dispatch(login(values)))}
          noValidate
          className="flex flex-col gap-5 rounded-2xl border border-soft-white/10 bg-panel p-6"
        >
          {notice && <Alert tone="success">{notice}</Alert>}
          {error && <Alert>{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register("password")}
          />
          <Button type="submit" loading={status === "loading"} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
