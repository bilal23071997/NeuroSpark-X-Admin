"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { LoadingBlock } from "./ui/Spinner";

interface NavItem {
  label: string;
  href: string;
}

interface NavSection {
  title?: string;
  adminOnly?: boolean;
  items: NavItem[];
}

// Only screens that exist are listed here.
const sections: NavSection[] = [
  { items: [{ label: "Dashboard", href: "/" }] },
  {
    title: "Insights",
    items: [
      { label: "Articles", href: "/articles" },
      { label: "Niches", href: "/niches" },
    ],
  },
  { title: "Listen", items: [{ label: "Episodes", href: "/episodes" }] },
  { title: "Admin", adminOnly: true, items: [{ label: "Users", href: "/users" }] },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const role = useAppSelector((state) => state.auth.user?.role);

  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {sections
        .filter((section) => !section.adminOnly || role === "admin")
        .map((section) => (
          <div key={section.title ?? "overview"}>
            {section.title && (
              <p className="px-3 pb-2 text-xs font-medium tracking-[0.15em] text-soft-white/60 uppercase">
                {section.title}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${
                        active
                          ? "bg-electric-indigo/20 text-soft-white"
                          : "text-soft-white/70 hover:bg-soft-white/5 hover:text-soft-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);

  async function signOut() {
    await dispatch(logout());
    router.replace("/login");
  }

  return (
    <div className="flex h-full flex-col gap-8 p-5">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3">
        <Image src="/brand/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" priority />
        <span className="font-heading leading-tight font-semibold">
          NeuroSpark <span className="text-indigo-text">X</span>
          <span className="block text-xs font-normal text-soft-white/60">Admin</span>
        </span>
      </Link>

      <div className="flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>

      <div className="border-t border-soft-white/10 pt-4">
        {user && (
          <div className="px-3 pb-3">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-soft-white/60">{user.email}</p>
            <p className="mt-1 text-xs font-medium text-violet-text capitalize">{user.role}</p>
          </div>
        )}
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href="/password"
              onClick={onNavigate}
              className="block rounded-lg px-3 py-2 text-sm text-soft-white/70 hover:bg-soft-white/5 hover:text-soft-white"
            >
              Change password
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-soft-white/70 hover:bg-soft-white/5 hover:text-soft-white"
            >
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Wraps every signed-in screen: guards the route, then draws the sidebar and content area. */
export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useAppSelector((state) => state.auth.session);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (session === "anonymous") router.replace("/login");
  }, [session, router]);

  if (session !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingBlock label={session === "checking" ? "Checking your session…" : "Redirecting to sign in…"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen border-r border-soft-white/10 bg-panel lg:block">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-soft-white/10 bg-void-black/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-heading font-semibold">
          <Image src="/brand/logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          NeuroSpark <span className="text-indigo-text">X</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="rounded-lg p-2 text-soft-white/80 hover:bg-soft-white/5"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-void-black/75"
          />
          <div id="mobile-menu" className="relative h-full w-72 max-w-[85vw] border-r border-soft-white/10 bg-panel">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 right-3 rounded-lg p-2 text-soft-white/70 hover:bg-soft-white/5"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <main id="main-content" className="min-w-0 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
