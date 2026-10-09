"use client";

import { cn } from "@eshanika/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/payments", label: "Payments" },
  { href: "/payments/events", label: "Webhook events" },
];

export function PaymentsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Payment sections"
      className="flex gap-1 border-b text-sm font-medium"
    >
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
