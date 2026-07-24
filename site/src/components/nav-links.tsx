"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Trackers", exact: true },
  { href: "/abdm/", label: "ABDM", exact: true },
  { href: "/abdm/partners/", label: "ABDM Partners", exact: false },
  { href: "/tngh/", label: "TN Govt", exact: true },
  { href: "/tngh/facilities/", label: "TN Facilities", exact: false },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {links.map((l) => {
        const normalized = pathname.replace(/\/$/, "") || "/";
        const target = l.href.replace(/\/$/, "") || "/";
        const active = l.exact ? normalized === target : normalized.startsWith(target);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              active
                ? "bg-muted-background text-foreground"
                : "text-soft-foreground hover:bg-soft-background hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
