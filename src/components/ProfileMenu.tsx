"use client";

import { ChevronsUpDown, KeyRound, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";

/**
 * The signed-in user at the bottom of the sidebar. Clicking it opens a small
 * sheet above it with the profile details, "Change password" and "Sign out".
 */
export default function ProfileMenu({ onNavigate }: { onNavigate: () => void }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on a click outside or Escape (and give focus back to the trigger on Escape).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.Name || user.Email).trim().charAt(0).toUpperCase();

  async function signOut() {
    await dispatch(logout());
    router.replace("/login");
  }

  return (
    <div ref={rootRef} className="relative border-t border-soft-white/10 pt-4">
      {open && (
        <div
          id="profile-sheet"
          className="absolute right-0 bottom-full left-0 z-10 mb-3 overflow-hidden rounded-xl border border-soft-white/20 bg-panel-raised shadow-[0_-12px_40px_rgba(0,0,0,0.75)] ring-1 ring-electric-indigo/30"
        >
          <div className="flex items-center gap-3 bg-electric-indigo/15 px-4 py-4">
            <span
              aria-hidden
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-electric-indigo font-heading text-xl font-semibold text-soft-white"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.Name}</p>
              <p className="truncate text-xs text-soft-white/70" title={user.Email}>
                {user.Email}
              </p>
              <p className="mt-1.5 inline-block rounded-full bg-deep-violet/30 px-2.5 py-0.5 text-[0.7rem] font-medium text-violet-text capitalize">
                {user.Role}
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-1 border-t border-soft-white/15 p-2">
            {user.Role === "admin" && (
              <li>
                <Link
                  href="/settings"
                  onClick={() => {
                    setOpen(false);
                    onNavigate();
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-soft-white/90 hover:bg-soft-white/10 hover:text-soft-white"
                >
                  <Settings aria-hidden strokeWidth={1.75} className="size-4.5 shrink-0 text-indigo-text" />
                  Settings
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/password"
                onClick={() => {
                  setOpen(false);
                  onNavigate();
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-soft-white/90 hover:bg-soft-white/10 hover:text-soft-white"
              >
                <KeyRound aria-hidden strokeWidth={1.75} className="size-4.5 shrink-0 text-indigo-text" />
                Change password
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-soft-white/90 hover:bg-danger/15 hover:text-danger"
              >
                <LogOut aria-hidden strokeWidth={1.75} className="size-4.5 shrink-0 text-danger" />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="profile-sheet"
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-soft-white/5 motion-reduce:transition-none"
      >
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-electric-indigo/25 font-heading text-sm font-semibold"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.Name}</span>
          <span className="block truncate text-xs text-soft-white/60 capitalize">{user.Role}</span>
        </span>
        <ChevronsUpDown aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-soft-white/55" />
        <span className="sr-only">Account menu</span>
      </button>
    </div>
  );
}
