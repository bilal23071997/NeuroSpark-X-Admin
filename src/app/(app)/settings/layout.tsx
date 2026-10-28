"use client";

import { CreditCard, SlidersHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const items: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "General settings", href: "/settings", icon: SlidersHorizontal },
  { label: "Gateway configuration", href: "/settings/gateway", icon: CreditCard },
];

/** Settings screens share a second sidebar (tabs on small screens) next to the main one. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <nav aria-label="Settings" className="shrink-0 lg:w-56">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {items.map((item) => {
            const active = item.href === "/settings" ? pathname === "/settings" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors motion-reduce:transition-none ${
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
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
