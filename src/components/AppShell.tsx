"use client";

import {
  FileStack,
  FileText,
  FolderTree,
  Gift,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Mic,
  Package,
  ShoppingBag,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppSelector } from "@/store/hooks";
import ProfileMenu from "./ProfileMenu";
import { LoadingBlock } from "./ui/Spinner";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden for editors: the API answers 403 for these screens. */
  adminOnly?: boolean;
}

interface NavSection {
  title?: string;
  adminOnly?: boolean;
  items: NavItem[];
}

// Only screens that exist are listed here.
const sections: NavSection[] = [
  { items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }] },
  {
    title: "Insights",
    items: [
      { label: "Articles", href: "/articles", icon: FileText },
      { label: "Niches", href: "/niches", icon: Tags },
    ],
  },
  { title: "Listen", items: [{ label: "Episodes", href: "/episodes", icon: Mic }] },
  {
    title: "The Vault",
    adminOnly: true,
    items: [
      { label: "Products", href: "/vault/products", icon: Package },
      { label: "Groups", href: "/vault/groups", icon: FolderTree },
    ],
  },
  {
    title: "Site",
    items: [
      { label: "Pages", href: "/site-pages", icon: FileStack, adminOnly: true },
      { label: "Free resources", href: "/free-resources", icon: Gift },
    ],
  },
  {
    title: "Sales",
    adminOnly: true,
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingBag },
    ],
  },
  {
    title: "Audience",
    adminOnly: true,
    items: [
      { label: "Newsletter", href: "/newsletter", icon: Mail },
      { label: "Messages", href: "/messages", icon: MessageSquare },
    ],
  },
  { title: "Admin", adminOnly: true, items: [{ label: "Users", href: "/users", icon: Users }] },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const role = useAppSelector((state) => state.auth.user?.Role);

  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      {sections
        .filter((section) => !section.adminOnly || role === "admin")
        .map((section) => (
          <div key={section.title ?? "overview"}>
            {/* A tinted bar, not a link: it labels the group and must not read as a menu item. */}
            {section.title && (
              <p className="mb-1.5 rounded-md bg-soft-white/[0.07] px-3 py-1.5 text-[0.7rem] font-semibold tracking-[0.18em] text-soft-white/65 uppercase">
                {section.title}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {section.items
                .filter((item) => !item.adminOnly || role === "admin")
                .map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${
                          active
                            ? "bg-electric-indigo/20 text-soft-white"
                            : "text-soft-white/70 hover:bg-soft-white/5 hover:text-soft-white"
                        }`}
                      >
                        <Icon
                          aria-hidden
                          strokeWidth={1.75}
                          className={`size-4.5 shrink-0 ${active ? "text-indigo-text" : "text-soft-white/55"}`}
                        />
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
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3">
        <Image src="/brand/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" priority />
        <span className="font-heading leading-tight font-semibold">
          NeuroSpark <span className="text-indigo-text">X</span>
          <span className="block text-xs font-normal text-soft-white/60">Admin</span>
        </span>
      </Link>

      {/* Scrolls when the menu is taller than the screen, with the scrollbar hidden. */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <NavLinks onNavigate={onNavigate} />
      </div>

      <ProfileMenu onNavigate={onNavigate} />
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
